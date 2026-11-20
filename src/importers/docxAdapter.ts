import JSZip from 'jszip';
import { generateId, normalizeQuiz, validateQuiz } from '../domain/quiz';
import {
  ImportReport,
  Option,
  Question,
  Quiz,
  SCHEMA_VERSION,
  ValidationIssue,
} from '../domain/types';

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function hasZipSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return ZIP_MAGIC.every((b, idx) => bytes[idx] === b);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function buildParagraphXml(text: string, bold = false): string {
  const lines = text.split(/\r?\n/);
  const runs = lines
    .map((line, idx) => {
      const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
      const br = idx > 0 ? '<w:br/>' : '';
      return `<w:r>${rPr}${br}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
    })
    .join('');
  return `<w:p>${runs}</w:p>`;
}

async function buildDocxBytes(paragraphs: Array<{ text: string; bold?: boolean }>): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );

  const bodyXml = paragraphs.map((p) => buildParagraphXml(p.text, p.bold)).join('\n');
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr/>
  </w:body>
</w:document>`,
  );

  return zip.generateAsync({ type: 'uint8array' });
}

export async function generateDocxTemplate(): Promise<Uint8Array> {
  const paragraphs: Array<{ text: string; bold?: boolean }> = [
    { text: 'Title: Sample Classroom Quiz (Replace Title)', bold: true },
    { text: 'Instructions: Choose the best answer for each question.' },
    {
      text: 'Note: Keep numbered questions (1., 2., ...), explicit choice labels (A), (B), (C), (D), and explicit Answer: lines. Do not rely on bold or highlight alone to mark correct answers.',
    },
    { text: '' },
    { text: '1. Which component executes program instructions?', bold: true },
    { text: '(A) CPU' },
    { text: '(B) Monitor' },
    { text: '(C) Keyboard' },
    { text: '(D) Printer' },
    { text: 'Answer: A' },
    { text: 'Explanation: The CPU fetches, decodes, and executes program instructions.' },
    { text: 'Section: Computer Fundamentals' },
    { text: 'Points: 1' },
    { text: '' },
    { text: '2. Which gas makes up roughly 78% of Earth’s atmosphere?', bold: true },
    { text: '(A) Oxygen' },
    { text: '(B) Carbon Dioxide' },
    { text: '(C) Nitrogen' },
    { text: '(D) Argon' },
    { text: 'Answer: C' },
    { text: 'Explanation: Dry air is approximately 78% nitrogen and 21% oxygen.' },
    { text: 'Section: Earth Science' },
    { text: 'Points: 1' },
  ];

  return buildDocxBytes(paragraphs);
}

export async function exportQuizToDocx(quiz: Quiz): Promise<Uint8Array> {
  const paragraphs: Array<{ text: string; bold?: boolean }> = [
    { text: `Title: ${quiz.title}`, bold: true },
  ];
  if (quiz.instructions) {
    paragraphs.push({ text: `Instructions: ${quiz.instructions}` });
  }
  paragraphs.push({ text: '' });

  quiz.questions.forEach((q, idx) => {
    paragraphs.push({ text: `${idx + 1}. ${q.text}`, bold: true });
    q.options.forEach((opt) => {
      if (opt.text.trim()) {
        paragraphs.push({ text: `(${opt.id.toUpperCase()}) ${opt.text}` });
      }
    });
    paragraphs.push({
      text: `Answer: ${q.correct_option_ids.map((id) => id.toUpperCase()).join(', ')}`,
    });
    if (q.explanation) {
      paragraphs.push({ text: `Explanation: ${q.explanation}` });
    }
    if (q.section) {
      paragraphs.push({ text: `Section: ${q.section}` });
    }
    if (q.points !== 1) {
      paragraphs.push({ text: `Points: ${q.points}` });
    }
    paragraphs.push({ text: '' });
  });

  return buildDocxBytes(paragraphs);
}

/**
 * Extracts plain text paragraphs from word/document.xml safely without executing HTML/scripts.
 */
function extractParagraphsFromDocumentXml(xml: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const inner = pMatch[1];
    // Preserve explicit Word line breaks (<w:br/>) and tabs (<w:tab/>)
    const tokenRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*\/>|<w:tab\b[^>]*\/>/g;
    let buf = '';
    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(inner)) !== null) {
      if (tok[0].startsWith('<w:br')) {
        buf += '\n';
      } else if (tok[0].startsWith('<w:tab')) {
        buf += ' ';
      } else {
        buf += decodeXmlEntities(tok[1] || '');
      }
    }
    paragraphs.push(buf.trim());
  }

  return paragraphs;
}

export async function parseDocxQuiz(
  input: ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<ImportReport> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!hasZipSignature(bytes)) {
    return {
      fileName,
      detectedFormat: 'docx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'CORRUPT_DOCX',
          message: 'The file does not have a valid DOCX document signature.',
          suggestion: 'Upload a valid .docx Word document created from the QuizDeck template.',
        },
      ],
      quiz: null,
    };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (err) {
    return {
      fileName,
      detectedFormat: 'docx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'UNREADABLE_DOCX',
          message: `Unable to open DOCX archive: ${err instanceof Error ? err.message : 'Corrupt file'}.`,
          suggestion: 'Re-save the document as .docx and try again.',
        },
      ],
      quiz: null,
    };
  }

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    return {
      fileName,
      detectedFormat: 'docx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'MISSING_DOCUMENT_XML',
          message: 'This file is missing word/document.xml and is not a standard DOCX file.',
          suggestion: 'Download and use the QuizDeck DOCX template.',
        },
      ],
      quiz: null,
    };
  }

  const xml = await docFile.async('string');
  const paragraphs = extractParagraphsFromDocumentXml(xml);

  let title = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported Word Quiz';
  let instructions = 'Choose the best answer for each question.';
  const questions: Question[] = [];
  const answerKeyMap = new Map<number, string[]>();
  const warnings: ValidationIssue[] = [];

  let currentQuestion: Question | null = null;
  let inAnswerKeySection = false;

  const commitCurrent = () => {
    if (currentQuestion) {
      questions.push(currentQuestion);
      currentQuestion = null;
    }
  };

  for (const para of paragraphs) {
    if (!para) continue;

    if (/^answer\s*key\s*:?$/i.test(para)) {
      commitCurrent();
      inAnswerKeySection = true;
      continue;
    }

    if (inAnswerKeySection) {
      const keyMatch = para.match(/^(\d+)\s*[.):-]\s*([a-zA-Z,\s]+)$/);
      if (keyMatch) {
        const qNum = parseInt(keyMatch[1], 10);
        const answers = keyMatch[2]
          .split(/[,;\s]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        answerKeyMap.set(qNum, answers);
      }
      continue;
    }

    if (!currentQuestion && /^title\s*:/i.test(para)) {
      const extracted = para.replace(/^title\s*:/i, '').trim();
      if (extracted) title = extracted;
      continue;
    }

    if (!currentQuestion && /^instructions?\s*:/i.test(para)) {
      instructions = para.replace(/^instructions?\s*:/i, '').trim();
      continue;
    }

    if (!currentQuestion && /^note\s*:/i.test(para)) {
      continue;
    }

    // Question header: "1. Question text" or "Q1. Question text"
    const qMatch = para.match(/^(?:Q\s*)?(\d+)\s*[.)]\s+([\s\S]+)$/);
    if (qMatch) {
      commitCurrent();
      const num = parseInt(qMatch[1], 10);
      currentQuestion = {
        id: `q${num}`,
        type: 'multiple_choice',
        text: qMatch[2].trim(),
        options: [],
        correct_option_ids: [],
        explanation: '',
        section: '',
        points: 1,
        original_number: num,
      };
      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    // Option line: "(A) Text" or "A) Text" or "A. Text"
    const optMatch = para.match(/^(?:\(([A-Fa-f])\)|([A-Fa-f])[.)])\s+([\s\S]+)$/);
    if (optMatch) {
      const letter = (optMatch[1] || optMatch[2]).toLowerCase();
      const optText = optMatch[3].trim();
      const option: Option = { id: letter, text: optText };
      currentQuestion.options.push(option);
      continue;
    }

    if (/^(?:correct\s*)?answer\s*:/i.test(para)) {
      const rawAns = para.replace(/^(?:correct\s*)?answer\s*:/i, '').trim();
      currentQuestion.correct_option_ids = rawAns
        .split(/[,;|]/)
        .map((s) => s.trim().replace(/[()]/g, '').toLowerCase())
        .filter(Boolean);
      continue;
    }

    if (/^explanation\s*:/i.test(para)) {
      currentQuestion.explanation = para.replace(/^explanation\s*:/i, '').trim();
      continue;
    }

    if (/^section\s*:/i.test(para)) {
      currentQuestion.section = para.replace(/^section\s*:/i, '').trim();
      continue;
    }

    if (/^points?\s*:/i.test(para)) {
      const pts = Number(para.replace(/^points?\s*:/i, '').trim());
      if (Number.isFinite(pts) && pts > 0) {
        currentQuestion.points = pts;
      }
      continue;
    }

    // Continuation paragraph of the question prompt if no choices have started yet
    if (currentQuestion.options.length === 0) {
      currentQuestion.text = `${currentQuestion.text}\n${para}`;
    }
  }

  commitCurrent();

  // Apply dedicated Answer Key entries if present
  questions.forEach((q, idx) => {
    const num = q.original_number ?? idx + 1;
    if (q.correct_option_ids.length === 0 && answerKeyMap.has(num)) {
      q.correct_option_ids = answerKeyMap.get(num)!;
    }
  });

  if (questions.length === 0) {
    return {
      fileName,
      detectedFormat: 'docx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings,
      errors: [
        {
          severity: 'error',
          code: 'NO_DOCX_QUESTIONS_FOUND',
          message: 'No numbered questions were recognized in the Word document.',
          suggestion:
            'Format questions as "1. Question text" followed by "(A) Choice", "(B) Choice", and "Answer: A", or download the DOCX template.',
        },
      ],
      quiz: null,
    };
  }

  const now = new Date().toISOString();
  const normalized = normalizeQuiz({
    id: generateId('quiz'),
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title,
    instructions,
    questions,
    created_at: now,
    updated_at: now,
  });

  const validation = validateQuiz(normalized);
  const errorQuestionIndices = new Set(
    validation.errors
      .map((e) => e.questionIndex)
      .filter((i): i is number => typeof i === 'number'),
  );
  const validCount = Math.max(0, normalized.questions.length - errorQuestionIndices.size);

  return {
    fileName,
    detectedFormat: 'docx',
    recognizedCount: normalized.questions.length,
    validCount,
    skippedCount: 0,
    warnings: [...warnings, ...validation.warnings],
    errors: validation.errors,
    quiz: normalized,
  };
}
