const path = require('path');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const zlib = require('zlib');

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
            const result = await parser.getText({
              pageJoiner: '\n\n',
              lineEnforce: true,
              cellSeparator: '   '
            });
            if (result && result.text && result.text.trim()) {
              pdfText = result.text;
            } else if (result && Array.isArray(result.pages) && result.pages.length > 0) {
              pdfText = result.pages.map((p) => p.text || '').join('\n\n');
            }
            if (parser.destroy) await parser.destroy();
          } else if (typeof pdfModule === 'function') {
            // pdf-parse v1 function structure
            const result = await pdfModule(buffer);
            pdfText = result?.text || '';
          }
        } catch (pdfErr) {
          console.error('PDF library parse error, falling back to raw stream text extraction:', pdfErr.message);
          pdfText = this.extractRawPdfText(buffer);
        }

        questions = this.parseMCQsFromText(pdfText, defaultMeta);

        // If pdf-parse text yielded 0 questions, try raw stream extraction fallback
        if (questions.length === 0) {
          const rawText = this.extractRawPdfText(buffer);
          if (rawText && rawText.trim() && rawText !== pdfText) {
            const rawQuestions = this.parseMCQsFromText(rawText, defaultMeta);
            if (rawQuestions.length > 0) {
              questions = rawQuestions;
            }
          }
        }
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
   * Fallback raw text extractor for PDFs when standard parser fails
   */
  static extractRawPdfText(buffer) {
    try {
      const content = buffer.toString('binary');
      const textPieces = [];

      // 1. Try to decompress FlateDecode streams
      const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
      let sMatch;
      while ((sMatch = streamRegex.exec(content)) !== null) {
        try {
          const rawStream = Buffer.from(sMatch[1], 'binary');
          let decompressed;
          try {
            decompressed = zlib.inflateSync(rawStream);
          } catch (e) {
            try {
              decompressed = zlib.inflateRawSync(rawStream);
            } catch (e2) {}
          }

          if (decompressed) {
            const decStr = decompressed.toString('utf8');
            // Extract Tj and TJ text operators
            const opRegex = /\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g;
            let op;
            while ((op = opRegex.exec(decStr)) !== null) {
              if (op[1]) {
                textPieces.push(op[1]);
              } else if (op[2]) {
                const parts = op[2].match(/\((.*?)\)/g);
                if (parts) {
                  textPieces.push(parts.map((p) => p.slice(1, -1)).join(''));
                }
              }
            }
          }
        } catch (streamErr) {}
      }

      if (textPieces.length > 0) {
        return textPieces.join(' ');
      }

      // 2. Direct string regex extraction from uncompressed chunks
      const lines = content.split(/[\r\n]+/);
      for (const line of lines) {
        const tjMatch = line.match(/\((.*)\)\s*Tj/);
        if (tjMatch) {
          textPieces.push(tjMatch[1].replace(/\\([()])/g, '$1').trim());
        }
      }

      if (textPieces.length > 0) {
        return textPieces.join('\n');
      }

      // 3. Fallback readable ASCII bytes
      return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    } catch (err) {
      return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  }

  /**
   * Extract text from PPTX slides using adm-zip XML parsing
   * Groups text runs <a:r><a:t> by paragraph <a:p>
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
        // Match each paragraph <a:p>
        const paraMatches = xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g);
        if (paraMatches && paraMatches.length > 0) {
          paraMatches.forEach((paraXml) => {
            const tMatches = paraXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
            if (tMatches && tMatches.length > 0) {
              const paraText = tMatches
                .map((m) => m.replace(/<[^>]+>/g, '').trim())
                .filter(Boolean)
                .join(' ');
              if (paraText) textChunks.push(paraText);
            }
          });
        }
      });

      if (textChunks.length > 0) {
        return textChunks.join('\n');
      }
    } catch (err) {}

    return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }

  /**
   * Extract text from DOCX / DOC document
   * Preserves tables, rows, cells, line breaks, and decodes XML entities
   */
  static extractTextFromDOCX(buffer) {
    try {
      const zip = new AdmZip(buffer);
      const docEntry = zip.getEntry('word/document.xml');
      if (docEntry) {
        let xml = docEntry.getData().toString('utf8');

        // Replace table cell ends with tabs and row ends with newlines
        xml = xml
          .replace(/<\/w:tc>/g, '\t')
          .replace(/<\/w:tr>/g, '\n')
          .replace(/<w:br[^>]*\/>/g, '\n')
          .replace(/<w:cr[^>]*\/>/g, '\n')
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<\/w:p>/g, '\n')
          .replace(/<[^>]+>/g, '');

        // Decode XML entities
        xml = xml
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
          .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

        return xml;
      }
    } catch (err) {}

    // Fallback for binary .doc or damaged docx: extract readable text runs
    try {
      const bufStr = buffer.toString('binary');
      // Extract ASCII chunks of length >= 4
      const asciiRuns = bufStr.match(/[\x20-\x7E\t\r\n]{4,}/g);
      if (asciiRuns && asciiRuns.length > 0) {
        return asciiRuns.join(' ');
      }
    } catch (e) {}

    return buffer.toString('utf8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }

  /**
   * Parse XLSX, XLS, and CSV spreadsheets with extensive column candidate mapping
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
        const foundKey = keys.find(
          (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === candidate.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (foundKey && String(row[foundKey]).trim()) {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    const parsedQuestions = [];

    rawRows.forEach((row) => {
      const questionText = findCol(row, [
        'question',
        'question_text',
        'questiontext',
        'q',
        'title',
        'problem',
        'questiondescription',
        'questionstatement',
        'problemstatement',
        'questions',
        'text',
        'prompt'
      ]);
      const optionA = findCol(row, ['option_a', 'optiona', 'a', 'opta', 'choice_a', 'choicea', 'choice1', 'opt1', 'option1', 'ans1']);
      const optionB = findCol(row, ['option_b', 'optionb', 'b', 'optb', 'choice_b', 'choiceb', 'choice2', 'opt2', 'option2', 'ans2']);
      const optionC = findCol(row, ['option_c', 'optionc', 'c', 'optc', 'choice_c', 'choicec', 'choice3', 'opt3', 'option3', 'ans3']);
      const optionD = findCol(row, ['option_d', 'optiond', 'd', 'optd', 'choice_d', 'choiced', 'choice4', 'opt4', 'option4', 'ans4']);
      const answer = findCol(row, [
        'correct_answer',
        'correctanswer',
        'answer',
        'ans',
        'key',
        'correct',
        'correctoption',
        'answerkey',
        'rightanswer',
        'solution'
      ]);

      if (questionText && optionA && optionB) {
        const cleanAnswer = this.normalizeAnswerKey(answer);

        parsedQuestions.push({
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC || 'None of the above',
          option_d: optionD || 'All of the above',
          correct_answer: cleanAnswer || 'A',
          marks: parseFloat(findCol(row, ['marks', 'mark', 'score', 'points'])) || defaultMeta.marks,
          negative_marks: parseFloat(findCol(row, ['negative_marks', 'negative', 'neg', 'minus'])) || defaultMeta.negative_marks,
          category: findCol(row, ['category', 'topic', 'subject', 'domain']) || defaultMeta.category,
          difficulty: this.normalizeDifficulty(findCol(row, ['difficulty', 'level'])),
          explanation: findCol(row, ['explanation', 'exp', 'reason', 'solution', 'notes']),
          event_name: findCol(row, ['event', 'event_name']) || defaultMeta.event_name,
          round_number: parseInt(findCol(row, ['round', 'round_number'])) || defaultMeta.round_number
        });
      }
    });

    if (parsedQuestions.length > 0) {
      return parsedQuestions;
    }

    // Fallback: If spreadsheet had no headers or unusual column keys, convert to text and parse as MCQs
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
          option_c: q.option_c || q.c || 'None of the above',
          option_d: q.option_d || q.d || 'All of the above',
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
   * High-Performance Multi-Strategy MCQ Parser
   * Robustly extracts MCQs from unstructured text, PDF text, PPT text, and Word text
   */
  static parseMCQsFromText(text, defaultMeta = {}) {
    if (!text || typeof text !== 'string') return [];

    const meta = {
      event_name: defaultMeta.event_name || 'Eloquence 2026',
      round_number: Number(defaultMeta.round_number) || 1,
      category: defaultMeta.category || 'General',
      marks: Number(defaultMeta.marks) || 2.0,
      negative_marks: Number(defaultMeta.negative_marks) || 0.5
    };

    // Step 1: Normalize line endings, quotes, spaces, dashes
    let cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\t/g, '    ');

    // Step 2: Extract dedicated Answer Key section at the bottom (if present)
    const { cleanedText: textWithoutKey, answerKeyMap } = this.extractAnswerKeySection(cleanText);
    cleanText = textWithoutKey;

    // Step 3: Split into raw lines
    const rawLines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

    // Step 4: Clean solitary margin numbers, table serial numbers, and page footers
    const filteredLines = this.cleanSolitaryNumbersAndFooters(rawLines);

    // Step 5: Safely expand inline options across lines without corrupting sentences or answer lines
    const expandedLines = this.expandInlineOptions(filteredLines);

    // Step 6: Primary Strategy - Sequential State-Machine Parser
    // Handles unnumbered questions, numbered questions, and multi-line options flawlessly
    let questions = this.parseMCQsSequential(expandedLines, answerKeyMap, meta);

    // Step 7: Fallback Strategy - Segmentation by Question Number / Prefix
    if (questions.length === 0) {
      questions = this.parseByQuestionSegmentation(expandedLines.join('\n'), answerKeyMap, meta);
    }

    // Step 8: Fallback Strategy - Option Group Scanning
    if (questions.length === 0) {
      questions = this.parseByOptionGroups(expandedLines.join('\n'), answerKeyMap, meta);
    }

    // Step 9: Fallback Strategy - Paragraph / Block splitting
    if (questions.length === 0) {
      questions = this.parseByParagraphBlocks(expandedLines.join('\n'), meta);
    }

    return questions;
  }

  /**
   * Filter out page numbers, footer markers, and isolated margin numbers dumped from PDF tables
   * Protects genuine numeric MCQ options (e.g. 23, 5, 6, 10) by only removing sequential runs (1, 2, 3...)
   */
  static cleanSolitaryNumbersAndFooters(rawLines) {
    const isFooter = (l) =>
      /^--\s*\d+\s*(?:of|\/)\s*\d+\s*--$/i.test(l) ||
      /^Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(l) ||
      /^(?:Technical\s+Quiz|Department\s+of|Eloquence\s*2026?|Semester\s+\d+)\s*$/i.test(l);

    const parseNum = (l) => {
      const m = l.trim().match(/^(\d+)[\.\)]?$/);
      return m ? parseInt(m[1], 10) : null;
    };

    // Detect sequential runs of >= 3 ascending integers (e.g. margin serials 1., 2., 3. or 8., 9., 10.)
    const marginIndices = new Set();
    let currentRun = [];

    for (let i = 0; i < rawLines.length; i++) {
      const val = parseNum(rawLines[i]);
      if (val !== null) {
        if (currentRun.length === 0) {
          currentRun.push({ index: i, val });
        } else {
          const last = currentRun[currentRun.length - 1];
          if (val === last.val + 1) {
            currentRun.push({ index: i, val });
          } else {
            if (currentRun.length >= 3) {
              currentRun.forEach((item) => marginIndices.add(item.index));
            }
            currentRun = [{ index: i, val }];
          }
        }
      } else {
        if (currentRun.length >= 3) {
          currentRun.forEach((item) => marginIndices.add(item.index));
        }
        currentRun = [];
      }
    }
    if (currentRun.length >= 3) {
      currentRun.forEach((item) => marginIndices.add(item.index));
    }

    const cleanLines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const l = rawLines[i].trim();
      if (!l) continue;
      if (isFooter(l)) continue;
      if (marginIndices.has(i)) continue;

      // Filter lone page numbers that sit immediately next to footers
      if (/^\d+$/.test(l)) {
        const prev = i > 0 ? rawLines[i - 1].trim() : '';
        const next = i + 1 < rawLines.length ? rawLines[i + 1].trim() : '';
        if (isFooter(prev) || isFooter(next) || (!next && i > rawLines.length - 3)) {
          continue;
        }
      }

      cleanLines.push(l);
    }
    return cleanLines;
  }

  /**
   * Expand inline options onto new lines safely
   * Does NOT touch Answer lines and does NOT split on English words like "a function"
   */
  static expandInlineOptions(rawInput) {
    const rawLines = Array.isArray(rawInput)
      ? rawInput
      : String(rawInput || '').split('\n');

    const isAnsLine = (l) =>
      /^\s*(?:Correct\s*(?:Answer|Option)|Right\s*Answer|Answer|Ans|Key|Solution)\s*[:=-]+/i.test(l);
    // Matches:
    // (A), [A], (a), [a], (1)-(4), [1]-[4], (i)-(iv)
    // A), A., A:, A - (Uppercase A-D only)
    // Option A, Choice A
    const inlineRegex = /(?<=\S)[ \t]+(?=(?:\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|[A-D][\.:\)\-]\s+|(?:Option|Choice)\s*\(?[A-Da-d1-4]\)?[\s.:\)\-]*|\(?(?:iv|iii|ii|i)\)?[\s.:\)\-]+))/;

    const expanded = [];
    for (const l of rawLines) {
      if (isAnsLine(l)) {
        expanded.push(l);
      } else {
        const splitLines = l.replace(new RegExp(inlineRegex.source, 'g'), '\n').split('\n');
        for (const sub of splitLines) {
          const s = sub.trim();
          if (s) expanded.push(s);
        }
      }
    }
    return expanded;
  }

  /**
   * Primary Sequential State-Machine Parser
   * Accurately parses unnumbered MCQs, numbered MCQs, and unlabeled option blocks
   */
  static parseMCQsSequential(cleanLines, answerKeyMap = {}, meta = {}) {
    const optHeaderRegex = /^\s*(?:(?:\(([A-Da-d])\)[\s.:\)\-]*)|(?:\[([A-Da-d])\][\s.:\)\-]*)|(?:(?:Option|Choice)\s*\(?([A-Da-d])\)?[\s.:\)\-]*)|(?:([A-D])[\.:\)\-]\s+)|(?:\(([1-4])\)[\s.:\)\-]*)|(?:\[([1-4])\][\s.:\)\-]*)|(?:([1-4])[\.:\)\-]\s+)|(?:\(?((?:iv|iii|ii|i))\)?[\s.:\)\-]+))\s*(.*)/i;
    const qMarkerRegex = /^\s*(?:(?:Q(?:uestion|ue)?|Prob(?:lem)?)\s*[:#.-]?\s*(\d+)[\s.:)-]*|(\d+)[\.:)-]\s+)(.*)/i;
    const ansRegex = /^\s*(?:Correct\s*(?:Answer|Option)|Right\s*Answer|Answer\s*Key|Answer|Ans|Key|Correct)\s*[:=-]+\s*(.*)/i;
    const expRegex = /^\s*(?:Explanation|Exp|Reason|Solution|Note)\s*[:=-]+\s*(.*)/i;

    const questions = [];
    let currentPrompt = [];
    let currentOptions = {};
    let currentAnswer = null;
    let currentAnswerText = '';
    let currentExp = '';
    let currentQNum = null;
    let currentOptKey = null;
    let state = 'PROMPT';

    const pushQuestion = () => {
      // Case 1: Standard options with labels (A, B)
      if (currentPrompt.length > 0 && currentOptions.A && currentOptions.B) {
        let promptText = currentPrompt.join(' ').trim();
        promptText = promptText.replace(/^(?:PYTHON\s+MCQ\s+QUESTIONS?|TECHNICAL\s+QUIZ|MULTIPLE\s+CHOICE\s+QUESTIONS?|QUESTIONS?\s*BANK)\s*/i, '').trim();

        let finalAns = currentAnswer;
        if (!finalAns && currentQNum && answerKeyMap[currentQNum]) {
          finalAns = answerKeyMap[currentQNum];
        }
        if (!finalAns && answerKeyMap[questions.length + 1]) {
          finalAns = answerKeyMap[questions.length + 1];
        }
        if (!finalAns) {
          finalAns = 'A';
        }

        questions.push({
          question_text: promptText,
          option_a: currentOptions.A,
          option_b: currentOptions.B,
          option_c: currentOptions.C || 'None of the above',
          option_d: currentOptions.D || 'All of the above',
          correct_answer: finalAns,
          marks: meta.marks,
          negative_marks: meta.negative_marks,
          category: meta.category,
          difficulty: 'Medium',
          explanation: currentExp,
          event_name: meta.event_name,
          round_number: meta.round_number
        });
      } else if (currentPrompt.length >= 3 && (currentAnswer || currentQNum)) {
        // Case 2: Unlabeled options (e.g. DOCX table rows without A/B/C/D prefixes)
        let a = '', b = '', c = '', d = '';
        if (currentPrompt.length >= 5) {
          d = currentPrompt.pop();
          c = currentPrompt.pop();
          b = currentPrompt.pop();
          a = currentPrompt.pop();
        } else if (currentPrompt.length === 4) {
          c = currentPrompt.pop();
          b = currentPrompt.pop();
          a = currentPrompt.pop();
          d = 'None of the above';
        } else if (currentPrompt.length === 3) {
          b = currentPrompt.pop();
          a = currentPrompt.pop();
          c = 'None of the above';
          d = 'All of the above';
        }

        // If the answer line specified a value, e.g. "Answer: C) #" or "Answer: C"
        // and option C or D was missing/empty or placeholder:
        if (currentAnswerText) {
          if (currentAnswer === 'C' && (!c || c === 'None of the above')) {
            if (d === 'None of the above' && c) d = c;
            c = currentAnswerText;
          } else if (currentAnswer === 'D' && (!d || d === 'None of the above' || d === 'All of the above')) {
            d = currentAnswerText;
          }
        }

        let promptText = currentPrompt.join(' ').trim();
        promptText = promptText.replace(/^(?:PYTHON\s+MCQ\s+QUESTIONS?|TECHNICAL\s+QUIZ|MULTIPLE\s+CHOICE\s+QUESTIONS?|QUESTIONS?\s*BANK)\s*/i, '').trim();

        let finalAns = currentAnswer;
        if (!finalAns && currentQNum && answerKeyMap[currentQNum]) {
          finalAns = answerKeyMap[currentQNum];
        }
        if (!finalAns && answerKeyMap[questions.length + 1]) {
          finalAns = answerKeyMap[questions.length + 1];
        }
        if (!finalAns) finalAns = 'A';

        questions.push({
          question_text: promptText,
          option_a: a,
          option_b: b,
          option_c: c || 'None of the above',
          option_d: d || 'All of the above',
          correct_answer: finalAns,
          marks: meta.marks,
          negative_marks: meta.negative_marks,
          category: meta.category,
          difficulty: 'Medium',
          explanation: currentExp,
          event_name: meta.event_name,
          round_number: meta.round_number
        });
      }
    };

    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i];

      // 1. Answer line
      const ansMatch = line.match(ansRegex);
      if (ansMatch) {
        const rawAns = ansMatch[1].trim();
        const letterMatch = rawAns.match(/(?:Option\s*)?\(?([A-Da-d1-4]|iv|iii|ii|i)\)?/i);
        if (letterMatch) {
          currentAnswer = this.normalizeAnswerKey(letterMatch[1]);
          // Capture answer value text after letter: e.g. from "C) #" -> "#", or "B) 5" -> "5"
          const afterLetter = rawAns.replace(/^(?:Option\s*)?\(?[A-Da-d1-4]|iv|iii|ii|i\)?[\s.:\)\-]*/i, '').trim();
          if (afterLetter) {
            currentAnswerText = afterLetter;
          }
        } else {
          currentAnswer = this.matchAnswerTextToOption(rawAns, currentOptions) || this.normalizeAnswerKey(rawAns);
          currentAnswerText = rawAns;
        }
        state = 'ANSWER';
        currentOptKey = null;
        continue;
      }

      // 2. Explanation line
      const expMatch = line.match(expRegex);
      if (expMatch) {
        currentExp = expMatch[1].trim();
        state = 'EXPLANATION';
        currentOptKey = null;
        continue;
      }

      // 3. Question marker line (e.g. 1. , Q1. )
      const qMatch = line.match(qMarkerRegex);
      if (qMatch && !optHeaderRegex.test(line)) {
        if ((currentPrompt.length > 0 && currentOptions.A && currentOptions.B) || (currentPrompt.length >= 3 && currentAnswer)) {
          pushQuestion();
          currentOptions = {};
          currentAnswer = null;
          currentAnswerText = '';
          currentExp = '';
          currentOptKey = null;
        }
        currentQNum = parseInt(qMatch[1] || qMatch[2], 10);
        const rest = (qMatch[3] || '').trim();
        currentPrompt = rest ? [rest] : [];
        state = 'PROMPT';
        continue;
      }

      // 4. Option line (A), B), C), D), (1), etc.)
      const optMatch = line.match(optHeaderRegex);
      if (optMatch) {
        const rawKey = optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4] || optMatch[5] || optMatch[6] || optMatch[7] || optMatch[8];
        const optKey = this.normalizeAnswerKey(rawKey);
        let optVal = (optMatch[9] || '').trim();

        // Detect asterisk marking correct answer: e.g. *B) ... or B) ...*
        if (optVal.startsWith('*') || optVal.endsWith('*') || /^\([xX]\)/.test(optVal)) {
          currentAnswer = optKey;
          optVal = optVal.replace(/^\*+|\*+$/g, '').replace(/^\([xX]\)\s*/, '').trim();
        }

        // If this is option A and current question already has options A and B -> start of next question!
        if (optKey === 'A' && currentOptions.A && currentOptions.B) {
          pushQuestion();
          currentOptions = {};
          currentAnswer = null;
          currentAnswerText = '';
          currentExp = '';
          currentPrompt = [];
        }

        currentOptions[optKey] = optVal;
        currentOptKey = optKey;
        state = 'OPTIONS';
        continue;
      }

      // 5. General text line
      if (state === 'ANSWER' || state === 'EXPLANATION') {
        pushQuestion();
        currentOptions = {};
        currentAnswer = null;
        currentAnswerText = '';
        currentExp = '';
        currentOptKey = null;
        currentPrompt = [line];
        state = 'PROMPT';
      } else if (state === 'OPTIONS') {
        const nextLine = i + 1 < cleanLines.length ? cleanLines[i + 1] : '';
        const nextOptMatch = nextLine.match(optHeaderRegex);
        const isNextOptA = nextOptMatch && this.normalizeAnswerKey(nextOptMatch[1]||nextOptMatch[2]||nextOptMatch[3]||nextOptMatch[4]||'') === 'A';

        if (isNextOptA) {
          pushQuestion();
          currentOptions = {};
          currentAnswer = null;
          currentAnswerText = '';
          currentExp = '';
          currentOptKey = null;
          currentPrompt = [line];
          state = 'PROMPT';
        } else if (currentOptKey) {
          currentOptions[currentOptKey] = (currentOptions[currentOptKey] + ' ' + line).trim();
        }
      } else {
        currentPrompt.push(line);
      }
    }

    pushQuestion();
    return questions;
  }

  /**
   * Helper to match answer text to option text when answer line doesn't give a letter
   */
  static matchAnswerTextToOption(ansText, options) {
    if (!ansText || !options) return null;
    const cleanAns = ansText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanAns) return null;
    for (const key of ['A', 'B', 'C', 'D']) {
      const optVal = (options[key] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (optVal && (optVal === cleanAns || optVal.includes(cleanAns) || cleanAns.includes(optVal))) {
        return key;
      }
    }
    return null;
  }

  /**
   * Safely extract Answer Key section at the end of the document
   * MUST be at the end and contain at least 2 question-answer pairs
   */
  static extractAnswerKeySection(text) {
    const answerKeyMap = {};
    let cleanedText = text;

    const headingRegex = /(?:^|\n)\s*(?:ANSWER\s*KEYS?|ANSWER\s*SHEET|SOLUTION\s*KEYS?|ANSWERS\s*(?:SECTION|LIST|FOR\s*ALL)?)\s*[:\n]([\s\S]*)$/i;
    const match = text.match(headingRegex);

    if (match) {
      const sectionText = match[1];
      const pairRegex = /(?:Q(?:uestion)?\s*[:#.-]?)?(\d+)\s*[\s.:)-]+\s*\(?([A-Da-d1-4]|iv|iii|ii|i)\)?/gi;
      let p;
      let count = 0;
      while ((p = pairRegex.exec(sectionText)) !== null) {
        const qNum = parseInt(p[1], 10);
        const ans = this.normalizeAnswerKey(p[2]);
        if (qNum && ans) {
          answerKeyMap[qNum] = ans;
          count++;
        }
      }

      if (count >= 2) {
        cleanedText = text.slice(0, match.index);
      }
    }

    return { cleanedText, answerKeyMap };
  }

  /**
   * Primary Strategy: Question Segmentation
   * Splits document into chunks by finding question start markers
   */
  static parseByQuestionSegmentation(text, answerKeyMap, meta) {
    const qMarkerRegex = /(?:^|\n)\s*(?:(?:Q(?:uestion|ue)?|Prob(?:lem)?)\s*[:#.-]?\s*(\d+)[\s.:)-]*|(\d+)[\.:)-]\s+)/gi;

    const markers = [];
    let m;
    while ((m = qMarkerRegex.exec(text)) !== null) {
      const qNumStr = m[1] || m[2];
      markers.push({
        index: m.index,
        length: m[0].length,
        qNum: qNumStr ? parseInt(qNumStr, 10) : null,
        raw: m[0].trim()
      });
    }

    if (markers.length === 0) {
      return [];
    }

    // Detect if markers contain consecutive 1, 2, 3, 4 inside a question (numeric options)
    const optionMarkerIndices = new Set();
    const hasOptionLabels = (txt) =>
      /(?:^|\n)\s*(?:\(?([A-Da-d])\)[\s.:)-]*|\[([A-Da-d])\]|Option\s+[A-Da-d]|Choice\s+[A-Da-d])/i.test(txt);

    for (let i = 0; i < markers.length - 3; i++) {
      if (
        markers[i].qNum === 1 &&
        markers[i + 1].qNum === 2 &&
        markers[i + 2].qNum === 3 &&
        markers[i + 3].qNum === 4 &&
        i > 0
      ) {
        const nextEnd = i + 1 < markers.length ? markers[i + 1].index : text.length;
        const chunkOfOne = text.slice(markers[i].index, nextEnd);
        if (!hasOptionLabels(chunkOfOne)) {
          // Marker 1 has no A/B/C/D options: these 1, 2, 3, 4 are options for the preceding question
          optionMarkerIndices.add(i);
          optionMarkerIndices.add(i + 1);
          optionMarkerIndices.add(i + 2);
          optionMarkerIndices.add(i + 3);
        }
      }
    }

    const filteredMarkers = markers.filter((_, idx) => !optionMarkerIndices.has(idx));

    const questions = [];

    for (let i = 0; i < filteredMarkers.length; i++) {
      const start = filteredMarkers[i].index + filteredMarkers[i].length;
      const end = i + 1 < filteredMarkers.length ? filteredMarkers[i + 1].index : text.length;
      const chunkText = text.slice(start, end).trim();

      const parsed = this.parseQuestionChunk(chunkText, filteredMarkers[i].qNum, answerKeyMap, meta);
      if (parsed) {
        questions.push(parsed);
      }
    }

    return questions;
  }

  /**
   * Parse a single segmented question chunk into question, options A-D, answer, and explanation
   */
  static parseQuestionChunk(chunkText, qNum, answerKeyMap, meta) {
    if (!chunkText || chunkText.length < 5) return null;

    let text = chunkText;
    let detectedAnswer = null;
    let explanation = '';

    // 1. Extract Answer lines inside the chunk
    const ansRegex = /(?:^|\n)\s*(?:(?:Correct\s*(?:Answer|Option)|Right\s*Answer|Answer|Ans|Key|Correct)\s*[:=-]+\s*(?:Option\s*)?\(?([A-Da-d1-4]|iv|iii|ii|i)\)?)/i;
    const ansMatch = text.match(ansRegex);
    if (ansMatch) {
      detectedAnswer = this.normalizeAnswerKey(ansMatch[1]);
      text = text.replace(ansRegex, '\n');
    }

    // 2. Extract Explanation lines inside the chunk
    const expRegex = /(?:^|\n)\s*(?:(?:Explanation|Exp|Reason|Solution|Note)\s*[:=-]+\s*([\s\S]+?))(?=\n\s*(?:[A-Z]\)|Answer|\d+[\.\)]|$))/i;
    const expMatch = text.match(expRegex);
    if (expMatch) {
      explanation = expMatch[1].trim();
      text = text.replace(expRegex, '\n');
    }

    // 3. Process lines in the chunk
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return null;

    // Regex for matching Option headers at the start of a line
    const optRegex = /^\s*(?:(?:\(?([A-Da-d])\)[\s.:)-]*)|(?:([A-Da-d])[\.:)-]\s*)|(?:\[([A-Da-d])\][\s.:)-]*)|(?:(?:Option|Choice)\s*\(?([A-Da-d])\)?[\s.:)-]*)|(?:\(([1-4])\)[\s.:)-]*)|(?:([1-4])[\.:)-]\s*)|(?:\[([1-4])\][\s.:)-]*)|(?:\(?((?:iv|iii|ii|i))\)?[\s.:)-]+))\s*(.*)/i;

    const questionLines = [];
    const options = { A: '', B: '', C: '', D: '' };
    let currentOptKey = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Double check if line is an answer line
      const lineAnsMatch = line.match(/^(?:Correct\s*Answer|Answer|Ans|Key|Correct)\s*[:=-]+\s*\(?([A-Da-d1-4]|iv|iii|ii|i)\)?/i);
      if (lineAnsMatch) {
        detectedAnswer = this.normalizeAnswerKey(lineAnsMatch[1]);
        continue;
      }

      const match = line.match(optRegex);
      if (match) {
        const rawKey = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8];
        const optKey = this.normalizeAnswerKey(rawKey);
        let optVal = match[9] ? match[9].trim() : '';

        // Check if option text has asterisk or [x] marking correct answer
        if (optVal.startsWith('*') || optVal.endsWith('*') || /^\([xX]\)/.test(optVal)) {
          detectedAnswer = optKey;
          optVal = optVal.replace(/^\*+|\*+$/g, '').replace(/^\([xX]\)\s*/, '').trim();
        }

        options[optKey] = optVal;
        currentOptKey = optKey;
      } else if (currentOptKey) {
        // Line continuation of current option
        options[currentOptKey] = (options[currentOptKey] + ' ' + line).trim();
      } else {
        // Line continuation of question text
        questionLines.push(line);
      }
    }

    const questionText = questionLines.join(' ').trim();
    if (!questionText) return null;

    // Validate options: must have at least A and B
    let optA = options.A;
    let optB = options.B;
    let optC = options.C;
    let optD = options.D;

    if (!optA || !optB) {
      return null;
    }

    if (!optC) optC = 'None of the above';
    if (!optD) optD = 'All of the above';

    // Determine final correct answer
    let finalAnswer = detectedAnswer;
    if (!finalAnswer && qNum && answerKeyMap[qNum]) {
      finalAnswer = answerKeyMap[qNum];
    }
    if (!finalAnswer) {
      finalAnswer = 'A';
    }

    return {
      question_text: questionText,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_answer: finalAnswer,
      marks: meta.marks,
      negative_marks: meta.negative_marks,
      category: meta.category,
      difficulty: 'Medium',
      explanation: explanation,
      event_name: meta.event_name,
      round_number: meta.round_number
    };
  }

  /**
   * Secondary Strategy: Scan for Option Groups [A, B, C, D]
   */
  static parseByOptionGroups(text, answerKeyMap, meta) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const questions = [];

    let currentQText = [];
    let currentOptions = {};
    let currentAnswer = null;
    let currentKey = null;

    const optRegex = /^\s*(?:(?:\(?([A-Da-d])\)[\s.:)-]*)|(?:([A-Da-d])[\.:)-]\s*)|(?:Option\s*\(?([A-Da-d])\)?[\s.:)-]*)|(?:\(([1-4])\)[\s.:)-]*))\s*(.*)/i;
    const ansRegex = /^(?:Answer|Ans|Key|Correct)\s*[:=-]+\s*\(?([A-Da-d1-4]|iv|iii|ii|i)\)?/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const ansMatch = line.match(ansRegex);
      if (ansMatch) {
        currentAnswer = this.normalizeAnswerKey(ansMatch[1]);
        continue;
      }

      const optMatch = line.match(optRegex);
      if (optMatch) {
        const rawKey = optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4];
        const key = this.normalizeAnswerKey(rawKey);
        let val = optMatch[5] || '';
        if (val.startsWith('*') || val.endsWith('*')) {
          currentAnswer = key;
          val = val.replace(/^\*+|\*+$/g, '').trim();
        }

        if (key === 'A' && currentOptions.A && currentOptions.B && currentQText.length > 0) {
          questions.push({
            question_text: currentQText.join(' ').replace(/^(?:Q\d+|\d+)[\.\)\:\-]\s*/i, '').trim(),
            option_a: currentOptions.A,
            option_b: currentOptions.B,
            option_c: currentOptions.C || 'None of the above',
            option_d: currentOptions.D || 'All of the above',
            correct_answer: currentAnswer || 'A',
            marks: meta.marks,
            negative_marks: meta.negative_marks,
            category: meta.category,
            difficulty: 'Medium',
            explanation: '',
            event_name: meta.event_name,
            round_number: meta.round_number
          });
          currentQText = [];
          currentOptions = {};
          currentAnswer = null;
        }

        currentOptions[key] = val;
        currentKey = key;
      } else if (currentKey) {
        if (!/^(?:Q(?:uestion)?\s*[:#.-]?\s*\d+|\d+[\.\)\:\-])/i.test(line)) {
          currentOptions[currentKey] = (currentOptions[currentKey] + ' ' + line).trim();
        } else {
          currentKey = null;
          currentQText.push(line);
        }
      } else {
        currentQText.push(line);
      }
    }

    if (currentOptions.A && currentOptions.B && currentQText.length > 0) {
      questions.push({
        question_text: currentQText.join(' ').replace(/^(?:Q\d+|\d+)[\.\)\:\-]\s*/i, '').trim(),
        option_a: currentOptions.A,
        option_b: currentOptions.B,
        option_c: currentOptions.C || 'None of the above',
        option_d: currentOptions.D || 'All of the above',
        correct_answer: currentAnswer || 'A',
        marks: meta.marks,
        negative_marks: meta.negative_marks,
        category: meta.category,
        difficulty: 'Medium',
        explanation: '',
        event_name: meta.event_name,
        round_number: meta.round_number
      });
    }

    return questions;
  }

  /**
   * Tertiary Fallback: Paragraph Blocks
   */
  static parseByParagraphBlocks(text, meta) {
    const blocks = text.split(/\n\s*\n+/);
    const questions = [];

    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        const qText = lines[0].replace(/^(?:Q(?:uestion)?\s*[:#.-]?\s*)?\d*[\.\)\:\-]\s*/i, '');
        const remaining = lines.slice(1);

        let a = '', b = '', c = '', d = '';
        remaining.forEach((r, idx) => {
          const clean = r.replace(/^(?:(?:\(?([A-Da-d1-4])\)?[\s.:)-]+)|\[[A-Da-d]\])\s*/i, '');
          if (idx === 0) a = clean;
          else if (idx === 1) b = clean;
          else if (idx === 2) c = clean;
          else if (idx === 3) d = clean;
        });

        if (qText && a && b) {
          questions.push({
            question_text: qText,
            option_a: a,
            option_b: b,
            option_c: c || 'None of the above',
            option_d: d || 'All of the above',
            correct_answer: 'A',
            marks: meta.marks,
            negative_marks: meta.negative_marks,
            category: meta.category,
            difficulty: 'Medium',
            explanation: '',
            event_name: meta.event_name,
            round_number: meta.round_number
          });
        }
      }
    }

    return questions;
  }

  static normalizeAnswerKey(ans) {
    if (!ans) return 'A';
    const s = String(ans).toLowerCase().trim();
    if (s === 'a' || s === '1' || s === 'i' || s.startsWith('opt a') || s.startsWith('option a')) return 'A';
    if (s === 'b' || s === '2' || s === 'ii' || s.startsWith('opt b') || s.startsWith('option b')) return 'B';
    if (s === 'c' || s === '3' || s === 'iii' || s.startsWith('opt c') || s.startsWith('option c')) return 'C';
    if (s === 'd' || s === '4' || s === 'iv' || s.startsWith('opt d') || s.startsWith('option d')) return 'D';
    if (s.includes('a')) return 'A';
    if (s.includes('b')) return 'B';
    if (s.includes('c')) return 'C';
    if (s.includes('d')) return 'D';
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
