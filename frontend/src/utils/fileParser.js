import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
}

/**
 * Derives default password from phone number (first 4 digits of phone)
 * e.g., "+91 9876543210" -> "9876"
 */
export const derivePasswordFromPhone = (phone) => {
  if (!phone) return '1234';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.substring(0, 4);
  }
  return digits.length > 0 ? digits.padEnd(4, '0') : '1234';
};

/**
 * Helper to clean and format extracted string data
 */
const cleanString = (str) => (str ? str.trim().replace(/^["']|["']$/g, '') : '');

/**
 * Helper to test if string is a phone number (e.g. 10 digits, +91..., etc.)
 */
const isPhone = (str) => {
  const digits = str.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

/**
 * Helper to test if string is an email
 */
const isEmail = (str) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
};

/**
 * Parse plain text, CSV, TSV, or semicolon-separated lines into structured user list
 */
export const parseTextContent = (text) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const users = [];

  for (let line of lines) {
    // Skip headers like "Name, Phone, Email"
    if (
      line.toLowerCase().includes('name') &&
      (line.toLowerCase().includes('phone') || line.toLowerCase().includes('mobile') || line.toLowerCase().includes('email'))
    ) {
      continue;
    }

    // Split by comma, tab, pipe, or multiple spaces
    let parts = line.split(/[,;\t|]+/).map((p) => cleanString(p)).filter(Boolean);

    if (parts.length < 2) {
      // Try space delimiter if line contains phone
      const phoneMatch = line.match(/(\+?\d[\d\s-]{7,15}\d)/);
      if (phoneMatch) {
        const phone = phoneMatch[0].trim();
        const name = line.replace(phone, '').replace(/[^\w\s]/g, '').trim();
        if (name && phone) {
          users.push({
            name,
            phone,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
            password: derivePasswordFromPhone(phone),
            role: 'user',
            status: 'Active'
          });
          continue;
        }
      }
    }

    if (parts.length >= 2) {
      let name = '';
      let phone = '';
      let email = '';

      parts.forEach((part) => {
        if (isEmail(part)) {
          email = part;
        } else if (isPhone(part)) {
          phone = part;
        } else if (!name && part.length > 1 && !/^\d+$/.test(part)) {
          name = part;
        }
      });

      // Fallback assignment if fields not matched by type
      if (!name) name = parts[0];
      if (!phone && parts[1] && (isPhone(parts[1]) || /^\+?\d+/.test(parts[1]))) {
        phone = parts[1];
      }

      if (name && phone) {
        users.push({
          name,
          phone,
          email: email || `${name.toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
          password: derivePasswordFromPhone(phone),
          role: 'user',
          status: 'Active'
        });
      }
    }
  }

  return users;
};

/**
 * Parse PDF files page by page
 */
export const parsePDFFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let pageText = '';

      for (let item of textContent.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }

      fullText += pageText + '\n';
    }

    return parseTextContent(fullText);
  } catch (err) {
    console.error('Error parsing PDF file:', err);
    throw new Error('Failed to parse PDF document. Please make sure it contains selectable text.');
  }
};

/**
 * Main parser entry point handling PDF, CSV, TXT, and JSON files
 */
export const parseUserFile = async (file) => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    return await parsePDFFile(file);
  } else if (fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : (parsed.users || [parsed]);
    return list.map((u) => ({
      name: u.name || u.username || 'User',
      phone: u.phone || u.phoneno || u.mobile || '0000000000',
      email: u.email || `${(u.name || 'user').toLowerCase().replace(/\s+/g, '')}@eloquence.com`,
      password: derivePasswordFromPhone(u.phone || u.phoneno || u.mobile),
      role: u.role || 'user',
      status: u.status || 'Active'
    }));
  } else {
    // CSV, TXT, TSV
    const text = await file.text();
    return parseTextContent(text);
  }
};

/**
 * Parse plain text, CSV, TSV, PDF text into structured question list
 */
export const parseQuestionTextContent = (text) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const questions = [];

  // 1. Try CSV / TSV header parsing
  const isCSVHeader = lines.length > 1 && (
    lines[0].toLowerCase().includes('question') || 
    lines[0].toLowerCase().includes('prompt') || 
    lines[0].toLowerCase().includes('option')
  );

  if (isCSVHeader) {
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]+/).map(cleanString);
      if (parts.length >= 3) {
        questions.push({
          prompt: parts[0],
          optionA: parts[1] || '',
          optionB: parts[2] || '',
          optionC: parts[3] || '',
          optionD: parts[4] || '',
          optionsCount: parts[4] ? 4 : (parts[3] ? 3 : 2),
          correct_answer: (parts[5] || 'A').toUpperCase().replace(/[^ABCD]/g, '') || 'A',
          marks: parseFloat(parts[6]) || 1,
          explanation: parts[7] || '',
          question_order: questions.length + 1
        });
      }
    }
    if (questions.length > 0) return questions;
  }

  // 2. Structured text parser (Q1. ..., A), B), Ans: B)
  let currentQ = null;

  for (let line of lines) {
    const optionMatch = line.match(/^([A-D])[.):\s]+(.+)/i);
    const ansMatch = line.match(/^(?:ans(?:wer)?|correct(?:_answer)?)[.:\s]+([A-D])/i);
    const markMatch = line.match(/^(?:marks?)[.:\s]+(\d+(?:\.\d+)?)/i);

    if (ansMatch && currentQ) {
      currentQ.correct_answer = ansMatch[1].toUpperCase();
    } else if (markMatch && currentQ) {
      currentQ.marks = parseFloat(markMatch[1]);
    } else if (optionMatch && currentQ) {
      const optKey = `option${optionMatch[1].toUpperCase()}`;
      currentQ[optKey] = optionMatch[2].trim();
      if (optionMatch[1].toUpperCase() === 'C' && currentQ.optionsCount < 3) currentQ.optionsCount = 3;
      if (optionMatch[1].toUpperCase() === 'D' && currentQ.optionsCount < 4) currentQ.optionsCount = 4;
    } else if (/^(?:Q\d+|Question\s*\d+|\d+[.)])/i.test(line) || (!currentQ && line.length > 5)) {
      if (currentQ && currentQ.prompt && currentQ.optionA && currentQ.optionB) {
        questions.push(currentQ);
      }
      const promptText = line.replace(/^(?:Q\d+|Question\s*\d+|\d+[.)])\s*/i, '').trim();
      currentQ = {
        prompt: promptText || line,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        optionsCount: 2,
        correct_answer: 'A',
        marks: 1,
        explanation: '',
        question_order: questions.length + 1
      };
    }
  }

  if (currentQ && currentQ.prompt && currentQ.optionA && currentQ.optionB) {
    questions.push(currentQ);
  }

  return questions;
};

/**
 * Main Question File Parser for PDF, DOC, TXT, CSV, JSON
 */
export const parseQuestionFile = async (file) => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((i) => i.str).join(' ') + '\n';
    }
    return parseQuestionTextContent(fullText);
  } else if (fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : (parsed.questions || [parsed]);
    return list.map((q, idx) => ({
      prompt: q.prompt || q.question || q.questionText || 'Question Prompt',
      optionA: q.optionA || q.option_a || q.a || '',
      optionB: q.optionB || q.option_b || q.b || '',
      optionC: q.optionC || q.option_c || q.c || '',
      optionD: q.optionD || q.option_d || q.d || '',
      optionsCount: parseInt(q.optionsCount || q.options_count, 10) || (q.optionD || q.d ? 4 : (q.optionC || q.c ? 3 : 2)),
      correct_answer: (q.correct_answer || q.correctAnswer || q.correctOption || q.correct_option || 'A').toUpperCase(),
      marks: parseFloat(q.marks) || 1,
      negative_marks: parseFloat(q.negative_marks || q.negativeMarks) || 0,
      explanation: q.explanation || '',
      question_order: idx + 1
    }));
  } else {
    // DOC, DOCX, CSV, TXT
    const text = await file.text();
    return parseQuestionTextContent(text);
  }
};
