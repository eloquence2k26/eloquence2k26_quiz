const path = require('path');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');

class DocumentParserService {
  /**
   * Main entrypoint to parse any supported document into questions
   * @param {Buffer} buffer - Raw file buffer
   * @param {string} filename - Original file name with extension
   * @param {object} metadata - Default metadata { event_name, round_number, category, marks, negative_marks }
   * @returns {Promise<Array<object>>} - List of extracted questions
   */
  static async parseDocument(buffer, filename, metadata = {}) {
    const ext = path.extname(filename || '').toLowerCase();
    const defaultMeta = {
      event_name: metadata.event_name || 'Eloquence 2026',
      round_number: Number(metadata.round_number) || 1,
      category: metadata.category || 'General',
      marks: Number(metadata.marks) || 2.0,
      negative_marks: Number(metadata.negative_marks) || 0.5
    };

    let questions = [];

    switch (ext) {
      case '.pdf': {
        let pdfText = '';
        try {
          const pdfModule = require('pdf-parse');
          if (pdfModule.PDFParse) {
            // pdf-parse v2 class structure
            const parser = new pdfModule.PDFParse({ data: buffer });
            const result = await parser.getText();
            pdfText = result?.text || '';
            if (parser.destroy) await parser.destroy();
          } else if (typeof pdfModule === 'function') {
            // pdf-parse v1 function structure
            const result = await pdfModule(buffer);
            pdfText = result?.text || '';
          }
        } catch (pdfErr) {
          console.error('PDF text extraction error:', pdfErr.message);
          // Fallback string extraction for raw readable text
          pdfText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        }

        questions = this.parseMCQsFromText(pdfText, defaultMeta);
        break;
      }

      case '.pptx':
      case '.ppt': {
        const pptxText = this.extractTextFromPPTX(buffer);
        questions = this.parseMCQsFromText(pptxText, defaultMeta);
        break;
      }

      case '.docx':
      case '.doc': {
        const docxText = this.extractTextFromDOCX(buffer);
        questions = this.parseMCQsFromText(docxText, defaultMeta);
        break;
      }

      case '.xlsx':
      case '.xls':
      case '.csv': {
        questions = this.parseSpreadsheet(buffer, defaultMeta);
        break;
      }

      case '.json': {
        questions = this.parseJSON(buffer, defaultMeta);
        break;
      }

      case '.txt':
      case '.md':
      default: {
        const text = buffer.toString('utf8');
        questions = this.parseMCQsFromText(text, defaultMeta);
        break;
      }
    }

    return questions;
  }

  /**
   * Extract text from PPTX slides using adm-zip XML parsing
   */
  static extractTextFromPPTX(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const slideEntries = zipEntries
        .filter((entry) => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
        .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

      const textChunks = [];

      slideEntries.forEach((slideEntry) => {
        const xml = slideEntry.getData().toString('utf8');
        // Extract all <a:t> text nodes in the slide
        const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
        if (matches && matches.length > 0) {
          const slideTexts = matches.map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
          textChunks.push(slideTexts.join('\n'));
        }
      });

      return textChunks.join('\n\n');
    } catch (err) {
      return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  }

  /**
   * Extract text from DOCX document using adm-zip XML parsing
   */
  static extractTextFromDOCX(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const docEntry = zip.getEntry('word/document.xml');
      if (docEntry) {
        const xml = docEntry.getData().toString('utf8');
        const formatted = xml
          .replace(/<\/w:p>/g, '\n')
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<[^>]+>/g, '');
        return formatted;
      }
    } catch (err) {}

    return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }

  /**
   * Parse XLSX, XLS, and CSV spreadsheets
   */
  static parseSpreadsheet(buffer, defaultMeta) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return [];
    }

    const findCol = (row, candidates) => {
      const keys = Object.keys(row);
      for (const candidate of candidates) {
        const foundKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === candidate.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (foundKey && String(row[foundKey]).trim()) {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    const parsedQuestions = [];

    rawRows.forEach((row) => {
      const questionText = findCol(row, ['question', 'question_text', 'questiontext', 'q', 'title', 'problem']);
      const optionA = findCol(row, ['option_a', 'optiona', 'a', 'opt_a', 'choice_a', 'choice1']);
      const optionB = findCol(row, ['option_b', 'optionb', 'b', 'opt_b', 'choice_b', 'choice2']);
      const optionC = findCol(row, ['option_c', 'optionc', 'c', 'opt_c', 'choice_c', 'choice3']);
      const optionD = findCol(row, ['option_d', 'optiond', 'd', 'opt_d', 'choice_d', 'choice4']);
      const answer = findCol(row, ['correct_answer', 'correctanswer', 'answer', 'ans', 'key', 'correct']);

      if (questionText && optionA && optionB) {
        const cleanAnswer = this.normalizeAnswerKey(answer);

        parsedQuestions.push({
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC || 'None of the above',
          option_d: optionD || 'All of the above',
          correct_answer: cleanAnswer || 'A',
          marks: parseFloat(findCol(row, ['marks', 'mark', 'score'])) || defaultMeta.marks,
          negative_marks: parseFloat(findCol(row, ['negative_marks', 'negative', 'neg'])) || defaultMeta.negative_marks,
          category: findCol(row, ['category', 'topic', 'subject']) || defaultMeta.category,
          difficulty: this.normalizeDifficulty(findCol(row, ['difficulty', 'level'])),
          explanation: findCol(row, ['explanation', 'exp', 'reason', 'solution']),
          event_name: findCol(row, ['event', 'event_name']) || defaultMeta.event_name,
          round_number: parseInt(findCol(row, ['round', 'round_number'])) || defaultMeta.round_number
        });
      }
    });

    if (parsedQuestions.length > 0) {
      return parsedQuestions;
    }

    const textDump = rawRows.map((r) => Object.values(r).join(' ')).join('\n');
    return this.parseMCQsFromText(textDump, defaultMeta);
  }

  /**
   * Parse JSON array of questions
   */
  static parseJSON(buffer, defaultMeta) {
    try {
      const data = JSON.parse(buffer.toString('utf8'));
      const list = Array.isArray(data) ? data : data.questions || [];
      return list
        .map((q) => ({
          question_text: q.question_text || q.question || '',
          option_a: q.option_a || q.a || '',
          option_b: q.option_b || q.b || '',
          option_c: q.option_c || q.c || '',
          option_d: q.option_d || q.d || '',
          correct_answer: this.normalizeAnswerKey(q.correct_answer || q.answer || 'A'),
          marks: parseFloat(q.marks) || defaultMeta.marks,
          negative_marks: parseFloat(q.negative_marks) || defaultMeta.negative_marks,
          category: q.category || defaultMeta.category,
          difficulty: this.normalizeDifficulty(q.difficulty),
          explanation: q.explanation || '',
          event_name: q.event_name || defaultMeta.event_name,
          round_number: parseInt(q.round_number) || defaultMeta.round_number
        }))
        .filter((q) => q.question_text && q.option_a && q.option_b);
    } catch (err) {
      return [];
    }
  }

  /**
   * Intelligent Heuristic MCQ Parser for Unstructured Plain Text, PDF text, PPT text, and Word text
   */
  static parseMCQsFromText(text, defaultMeta) {
    if (!text || typeof text !== 'string') return [];

    // Pre-processing: normalize linebreaks and Unicode characters
    let cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, ' ');

    const questions = [];

    // Expand inline options to separate lines so line-by-line parsing works seamlessly
    // e.g. "A) ... B) ... C) ... D) ..." -> splits each option onto its own line
    cleanedText = cleanedText.replace(/([ \t]+)(?=(?:[A-D]\s*[\.\)\:\-]|(?:\([A-D]\)|\[[A-D]\]))\s+)/gi, '\n');

    const lines = cleanedText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let currentQ = null;

    const finalizeCurrentQuestion = () => {
      if (currentQ && currentQ.question_text) {
        if (currentQ.option_a && currentQ.option_b) {
          if (!currentQ.option_c) currentQ.option_c = 'None of the above';
          if (!currentQ.option_d) currentQ.option_d = 'All of the above';
          if (!currentQ.correct_answer) currentQ.correct_answer = 'A';

          questions.push({
            question_text: currentQ.question_text.trim(),
            option_a: currentQ.option_a.trim(),
            option_b: currentQ.option_b.trim(),
            option_c: currentQ.option_c.trim(),
            option_d: currentQ.option_d.trim(),
            correct_answer: currentQ.correct_answer,
            marks: defaultMeta.marks,
            negative_marks: defaultMeta.negative_marks,
            category: defaultMeta.category,
            difficulty: 'Medium',
            explanation: currentQ.explanation ? currentQ.explanation.trim() : '',
            event_name: defaultMeta.event_name,
            round_number: defaultMeta.round_number
          });
        }
      }
      currentQ = null;
    };

    // Valid and tested Regex matchers
    const qStartRegex = /^(?:(?:Q|Question)\s*(?:\d+|[A-Z])?[\s.:)-]+|\d+[\s.:)-]+|\([0-9]+\)\s*)(.+)/i;
    const optARegex = /^(?:(?:\(?A\)?|[\[\(]A[\]\)]|\bA)[\s.:)-]+|\[A\]\s*)(.+)/i;
    const optBRegex = /^(?:(?:\(?B\)?|[\[\(]B[\]\)]|\bB)[\s.:)-]+|\[B\]\s*)(.+)/i;
    const optCRegex = /^(?:(?:\(?C\)?|[\[\(]C[\]\)]|\bC)[\s.:)-]+|\[C\]\s*)(.+)/i;
    const optDRegex = /^(?:(?:\(?D\)?|[\[\(]D[\]\)]|\bD)[\s.:)-]+|\[D\]\s*)(.+)/i;
    const ansRegex = /^(?:(?:Correct\s*Answer|Answer|Ans|Key|Correct\s*Option|Option)[\s.:)-]*(?:Option\s*)?\(?([A-D])\)?)/i;
    const expRegex = /^(?:(?:Explanation|Exp|Reason|Note|Solution)[\s.:)-]+(.+))/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is an answer key
      const ansMatch = line.match(ansRegex);
      if (ansMatch && currentQ) {
        currentQ.correct_answer = ansMatch[1].toUpperCase();
        continue;
      }

      // Check if line is an explanation
      const expMatch = line.match(expRegex);
      if (expMatch && currentQ) {
        currentQ.explanation = expMatch[1];
        continue;
      }

      // Check for Option A
      const matchA = line.match(optARegex);
      if (matchA && currentQ && !currentQ.option_a) {
        currentQ.option_a = matchA[1] || '';
        continue;
      }

      // Check for Option B
      const matchB = line.match(optBRegex);
      if (matchB && currentQ && currentQ.option_a && !currentQ.option_b) {
        currentQ.option_b = matchB[1] || '';
        continue;
      }

      // Check for Option C
      const matchC = line.match(optCRegex);
      if (matchC && currentQ && currentQ.option_b && !currentQ.option_c) {
        currentQ.option_c = matchC[1] || '';
        continue;
      }

      // Check for Option D
      const matchD = line.match(optDRegex);
      if (matchD && currentQ && currentQ.option_c && !currentQ.option_d) {
        currentQ.option_d = matchD[1] || '';
        continue;
      }

      // Check for New Question start
      const qMatch = line.match(qStartRegex);
      if (qMatch) {
        finalizeCurrentQuestion();
        currentQ = {
          question_text: qMatch[1],
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: 'A',
          explanation: ''
        };
        continue;
      }

      // If already in question context and no options hit yet, append to question prompt
      if (currentQ && !currentQ.option_a) {
        currentQ.question_text += ` ${line}`;
      } else if (currentQ && currentQ.option_d) {
        if (currentQ.explanation) {
          currentQ.explanation += ` ${line}`;
        }
      }
    }

    finalizeCurrentQuestion();

    // Strategy 2: If standard regex didn't extract any questions, try paragraph-block splitting
    if (questions.length === 0) {
      const blocks = cleanedText.split(/\n\s*\n/);
      blocks.forEach((b) => {
        const bLines = b.split('\n').map((l) => l.trim()).filter(Boolean);
        if (bLines.length >= 3) {
          const qText = bLines[0];
          const opts = bLines.slice(1);
          if (opts.length >= 2) {
            questions.push({
              question_text: qText.replace(/^[0-9]+[\.\)]\s*/, ''),
              option_a: opts[0].replace(/^[a-dA-D][\.\)]\s*/, ''),
              option_b: opts[1].replace(/^[a-dA-D][\.\)]\s*/, ''),
              option_c: opts[2] ? opts[2].replace(/^[a-dA-D][\.\)]\s*/, '') : 'None of the above',
              option_d: opts[3] ? opts[3].replace(/^[a-dA-D][\.\)]\s*/, '') : 'All of the above',
              correct_answer: 'A',
              marks: defaultMeta.marks,
              negative_marks: defaultMeta.negative_marks,
              category: defaultMeta.category,
              difficulty: 'Medium',
              explanation: '',
              event_name: defaultMeta.event_name,
              round_number: defaultMeta.round_number
            });
          }
        }
      });
    }

    return questions;
  }

  static normalizeAnswerKey(ans) {
    if (!ans) return 'A';
    const str = String(ans).toUpperCase().trim();
    if (str.includes('A') || str === '1') return 'A';
    if (str.includes('B') || str === '2') return 'B';
    if (str.includes('C') || str === '3') return 'C';
    if (str.includes('D') || str === '4') return 'D';
    return 'A';
  }

  static normalizeDifficulty(diff) {
    if (!diff) return 'Medium';
    const d = String(diff).toLowerCase();
    if (d.includes('easy')) return 'Easy';
    if (d.includes('hard') || d.includes('adv')) return 'Hard';
    return 'Medium';
  }

  /**
   * Main entrypoint to parse any supported document into participant registration records
   * @param {Buffer} buffer - Raw file buffer
   * @param {string} filename - Original file name with extension
   * @param {object} defaultMeta - { event_name, college, department, year }
   * @returns {Promise<Array<object>>} - List of extracted participant objects
   */
  static async parseParticipantsFromDocument(buffer, filename, defaultMeta = {}) {
    const ext = path.extname(filename || '').toLowerCase();
    const eventName = defaultMeta.event_name || 'Technical Quiz';
    let participants = [];

    switch (ext) {
      case '.xlsx':
      case '.xls':
      case '.csv': {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        participants = rows.map((row, idx) => {
          const keys = Object.keys(row);
          const findVal = (patterns) => {
            const matchedKey = keys.find((k) =>
              patterns.some((p) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
            );
            return matchedKey ? String(row[matchedKey]).trim() : '';
          };

          const fullName = findVal(['fullname', 'name', 'studentname', 'candidatename', 'participantname']) || `Participant ${idx + 1}`;
          const email = findVal(['email', 'mail', 'emailaddress']);
          const mobile = findVal(['mobile', 'phone', 'contact', 'phonenumber', 'mobilenumber', 'cell', 'tel']);
          const college = findVal(['college', 'institution', 'university', 'collegename', 'inst']) || defaultMeta.college || 'Engineering College';
          const department = findVal(['department', 'dept', 'branch', 'course', 'stream']) || defaultMeta.department || 'Computer Science & Engineering';
          const year = findVal(['year', 'batch', 'yearofstudy', 'yr']) || defaultMeta.year || '3rd Year';
          const regNo = findVal(['regno', 'registerno', 'registrationnumber', 'rollno', 'studentid', 'idno']) || `REG-${Date.now().toString().slice(-4)}${idx + 1}`;
          const event = findVal(['event', 'eventname', 'competition', 'track']) || eventName;

          return {
            full_name: fullName,
            email: email,
            mobile: mobile,
            college: college,
            department: department,
            year: year,
            registration_number: regNo,
            event: event
          };
        }).filter((p) => p.full_name && (p.email || p.mobile));
        break;
      }

      case '.json': {
        try {
          const content = JSON.parse(buffer.toString('utf8'));
          const list = Array.isArray(content) ? content : (content.participants || [content]);
          participants = list.map((item, idx) => ({
            full_name: item.full_name || item.name || `Participant ${idx + 1}`,
            email: item.email || '',
            mobile: item.mobile || item.phone || '',
            college: item.college || defaultMeta.college || 'Engineering College',
            department: item.department || item.dept || defaultMeta.department || 'Computer Science',
            year: item.year || defaultMeta.year || '3rd Year',
            registration_number: item.registration_number || item.reg_no || `REG-${idx + 1}`,
            event: item.event || item.event_name || eventName
          })).filter((p) => p.full_name);
        } catch (e) {
          console.error('JSON participant parsing error:', e.message);
        }
        break;
      }

      case '.pdf': {
        let pdfText = '';
        try {
          const pdfModule = require('pdf-parse');
          if (pdfModule.PDFParse) {
            const parser = new pdfModule.PDFParse({ data: buffer });
            const result = await parser.getText();
            pdfText = result?.text || '';
            if (parser.destroy) await parser.destroy();
          } else if (typeof pdfModule === 'function') {
            const result = await pdfModule(buffer);
            pdfText = result?.text || '';
          }
        } catch (pdfErr) {
          pdfText = buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        }
        participants = this.extractParticipantsFromText(pdfText, defaultMeta);
        break;
      }

      case '.docx':
      case '.doc': {
        const docxText = this.extractTextFromDOCX(buffer);
        participants = this.extractParticipantsFromText(docxText, defaultMeta);
        break;
      }

      default: {
        const txt = buffer.toString('utf8');
        participants = this.extractParticipantsFromText(txt, defaultMeta);
        break;
      }
    }

    return participants;
  }

  /**
   * Extract participant records from unstructured text (PDF, Word, Text)
   */
  static extractParticipantsFromText(text, defaultMeta = {}) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 3);
    const participants = [];
    const eventName = defaultMeta.event_name || 'Technical Quiz';

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip header lines
      if (/(name|email|phone|college|department|reg\s*no|serial|s\.no)/i.test(line) && line.split(/[,|\t;]/).length >= 3) {
        continue;
      }

      // Check if delimited row (CSV / TSV / Pipe in PDF or Text)
      const parts = line.split(/[,|\t;]/).map((p) => p.trim());
      if (parts.length >= 3) {
        const emails = line.match(emailRegex);
        const phones = line.match(phoneRegex);

        const email = emails ? emails[0].toLowerCase() : '';
        const phone = phones ? phones[0].replace(/\D/g, '') : '';
        const fullName = parts[0].replace(/^[\d.)\s-]+/, '').trim();

        if (fullName && fullName.length >= 2 && !fullName.includes('@')) {
          participants.push({
            full_name: fullName,
            email: email,
            mobile: phone,
            college: parts[3] || defaultMeta.college || 'Engineering College',
            department: parts[4] || defaultMeta.department || 'Computer Science & Engineering',
            year: parts[5] || defaultMeta.year || '3rd Year',
            registration_number: parts[6] || `REG-${Date.now().toString().slice(-4)}${participants.length + 1}`,
            event: eventName
          });
          continue;
        }
      }

      // If line contains an email or phone, attempt regex entity extraction
      const emails = line.match(emailRegex);
      const phones = line.match(phoneRegex);
      if (emails || phones) {
        const email = emails ? emails[0].toLowerCase() : '';
        const phone = phones ? phones[0].replace(/\D/g, '') : '';
        const cleanName = line
          .replace(emailRegex, '')
          .replace(phoneRegex, '')
          .replace(/[,|;:\-\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^[\d.)\s-]+/, '')
          .trim();

        if (cleanName && cleanName.length >= 2) {
          participants.push({
            full_name: cleanName,
            email: email,
            mobile: phone,
            college: defaultMeta.college || 'Engineering College',
            department: defaultMeta.department || 'Computer Science & Engineering',
            year: defaultMeta.year || '3rd Year',
            registration_number: `REG-${Date.now().toString().slice(-4)}${participants.length + 1}`,
            event: eventName
          });
        }
      }
    }

    return participants;
  }
}

module.exports = DocumentParserService;
