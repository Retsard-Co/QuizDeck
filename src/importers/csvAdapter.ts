import { generateId, normalizeQuiz, validateQuiz } from '../domain/quiz';
import {
  ImportReport,
  Option,
  Question,
  Quiz,
  SCHEMA_VERSION,
  ValidationIssue,
} from '../domain/types';

export const SPREADSHEET_HEADERS = [
  'question_id',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'explanation',
  'section',
  'question_type',
  'points',
] as const;

/**
 * Standards-compliant RFC-4180 CSV parser supporting quoted commas, escaped quotes,
 * embedded newlines, and UTF-8 BOM.
 */
export function parseCsvMatrix(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (currentField.length === 0) {
        inQuotes = true;
      } else {
        currentField += ch;
      }
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function escapeCsvCell(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function quizToTabularRows(quiz: Quiz): Record<string, string | number>[] {
  return quiz.questions.map((q) => {
    const optMap = new Map<string, string>();
    q.options.forEach((o) => optMap.set(o.id.toLowerCase(), o.text));
    return {
      question_id: q.id,
      question: q.text,
      option_a: optMap.get('a') ?? q.options[0]?.text ?? '',
      option_b: optMap.get('b') ?? q.options[1]?.text ?? '',
      option_c: optMap.get('c') ?? q.options[2]?.text ?? '',
      option_d: optMap.get('d') ?? q.options[3]?.text ?? '',
      correct_answer: q.correct_option_ids.map((id) => id.toUpperCase()).join(','),
      explanation: q.explanation ?? '',
      section: q.section ?? '',
      question_type: q.type,
      points: q.points,
    };
  });
}

export function exportQuizToCsv(quiz: Quiz): string {
  const rows = quizToTabularRows(quiz);
  const lines = [
    SPREADSHEET_HEADERS.join(','),
    ...rows.map((row) =>
      SPREADSHEET_HEADERS.map((h) => escapeCsvCell(row[h])).join(','),
    ),
  ];
  return lines.join('\r\n');
}

export function generateCsvTemplate(): string {
  const sampleRows: Record<string, string | number>[] = [
    {
      question_id: 'q1',
      question: 'Which component executes program instructions?',
      option_a: 'CPU',
      option_b: 'Monitor',
      option_c: 'Keyboard',
      option_d: 'Printer',
      correct_answer: 'A',
      explanation: 'The CPU fetches and executes program instructions.',
      section: 'Computer Fundamentals',
      question_type: 'multiple_choice',
      points: 1,
    },
    {
      question_id: 'q2',
      question: 'Which layer of Earth lies directly beneath the crust?',
      option_a: 'Outer core',
      option_b: 'Mantle',
      option_c: 'Inner core',
      option_d: 'Atmosphere',
      correct_answer: 'B',
      explanation: 'The mantle sits directly below the crust and surrounds the outer core.',
      section: 'Earth Science',
      question_type: 'multiple_choice',
      points: 1,
    },
  ];

  const lines = [
    SPREADSHEET_HEADERS.join(','),
    ...sampleRows.map((row) =>
      SPREADSHEET_HEADERS.map((h) => escapeCsvCell(row[h])).join(','),
    ),
  ];
  return lines.join('\r\n');
}

export function normalizeTabularAnswerRefs(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((part) => part.trim().toLowerCase())
    .map((part) => part.replace(/^option[\s_-]*/, ''))
    .filter(Boolean);
}

/**
 * Shared tabular parser used by both CSV and XLSX importers to guarantee identical
 * column validation, error reporting, and canonical quiz normalization.
 */
export function buildReportFromTabularMatrix(
  matrix: string[][],
  fileName: string,
  format: 'csv' | 'xlsx',
  extraWarnings: ValidationIssue[] = [],
  titleOverride?: string,
): ImportReport {
  if (matrix.length === 0) {
    return {
      fileName,
      detectedFormat: format,
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: extraWarnings,
      errors: [
        {
          severity: 'error',
          code: 'EMPTY_FILE',
          message: `The ${format.toUpperCase()} file is empty.`,
          suggestion: `Download the QuizDeck ${format.toUpperCase()} template and add your questions.`,
        },
      ],
      quiz: null,
    };
  }

  const rawHeaders = matrix[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const headerIndex = new Map<string, number>();
  const duplicateHeaders: string[] = [];

  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    if (headerIndex.has(h)) {
      duplicateHeaders.push(h);
    } else {
      headerIndex.set(h, idx);
    }
  });

  if (duplicateHeaders.length > 0) {
    return {
      fileName,
      detectedFormat: format,
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: extraWarnings,
      errors: [
        {
          severity: 'error',
          code: 'AMBIGUOUS_HEADERS',
          message: `Duplicate column header(s) detected: ${duplicateHeaders.join(', ')}.`,
          suggestion: 'Remove duplicate header columns so each field maps unambiguously.',
          rowNumber: 1,
        },
      ],
      quiz: null,
    };
  }

  const requiredHeaders = ['question', 'option_a', 'option_b', 'correct_answer'];
  const missingHeaders = requiredHeaders.filter((h) => !headerIndex.has(h));
  if (missingHeaders.length > 0) {
    return {
      fileName,
      detectedFormat: format,
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: extraWarnings,
      errors: [
        {
          severity: 'error',
          code: 'MISSING_TEMPLATE_HEADERS',
          message: `Missing required column header(s): ${missingHeaders.join(', ')}.`,
          suggestion: `Use exact QuizDeck headers: ${SPREADSHEET_HEADERS.join(', ')}.`,
          rowNumber: 1,
        },
      ],
      quiz: null,
    };
  }

  const getCell = (row: string[], col: string): string => {
    const idx = headerIndex.get(col);
    if (idx === undefined) return '';
    return String(row[idx] ?? '');
  };

  const questions: Question[] = [];
  let skippedCount = 0;
  const rowWarnings: ValidationIssue[] = [...extraWarnings];
  const rowToQuestionIndex = new Map<number, number>();

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const isCompletelyEmpty = row.every((cell) => String(cell ?? '').trim() === '');
    if (isCompletelyEmpty) {
      skippedCount++;
      continue;
    }

    const rowNumber = r + 1;
    const qIdx = questions.length;
    rowToQuestionIndex.set(qIdx, rowNumber);

    const rawId = getCell(row, 'question_id').trim();
    const qText = getCell(row, 'question');
    const optA = getCell(row, 'option_a');
    const optB = getCell(row, 'option_b');
    const optC = getCell(row, 'option_c');
    const optD = getCell(row, 'option_d');
    const rawCorrect = getCell(row, 'correct_answer');
    const explanation = getCell(row, 'explanation');
    const section = getCell(row, 'section');
    const rawType = getCell(row, 'question_type').trim().toLowerCase() || 'multiple_choice';
    const rawPoints = getCell(row, 'points').trim();
    const parsedPoints = rawPoints ? Number(rawPoints) : 1;

    const options: Option[] = [
      { id: 'a', text: optA },
      { id: 'b', text: optB },
    ];
    if (optC.trim() !== '') options.push({ id: 'c', text: optC });
    if (optD.trim() !== '') options.push({ id: 'd', text: optD });

    // Also inspect any optional extra columns like option_e, option_f
    for (const extraLetter of ['e', 'f']) {
      const colVal = getCell(row, `option_${extraLetter}`);
      if (colVal.trim() !== '') {
        options.push({ id: extraLetter, text: colVal });
      }
    }

    if (rawPoints && (!Number.isFinite(parsedPoints) || parsedPoints <= 0)) {
      rowWarnings.push({
        severity: 'warning',
        code: 'INVALID_POINTS',
        message: `Row ${rowNumber}: Invalid points value "${rawPoints}"; defaulted to 1.`,
        suggestion: 'Use a positive number in the points column.',
        questionIndex: qIdx,
        rowNumber,
      });
    }

    questions.push({
      id: rawId || `q${qIdx + 1}`,
      type: rawType as Question['type'],
      text: qText,
      options,
      correct_option_ids: normalizeTabularAnswerRefs(rawCorrect),
      explanation,
      section,
      points: Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 1,
      original_number: qIdx + 1,
    });
  }

  const now = new Date().toISOString();
  const baseTitle =
    titleOverride?.trim() ||
    fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() ||
    'Imported Quiz';

  const normalized = normalizeQuiz({
    id: generateId('quiz'),
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: baseTitle,
    instructions: 'Choose the best answer for each question.',
    questions,
    created_at: now,
    updated_at: now,
  });

  const validation = validateQuiz(normalized);
  const annotateRow = (issue: ValidationIssue): ValidationIssue => {
    if (issue.questionIndex !== undefined && rowToQuestionIndex.has(issue.questionIndex)) {
      const rowNumber = rowToQuestionIndex.get(issue.questionIndex)!;
      return {
        ...issue,
        rowNumber,
        message: `Row ${rowNumber}: ${issue.message}`,
      };
    }
    return issue;
  };

  const errors = validation.errors.map(annotateRow);
  const warnings = [...rowWarnings, ...validation.warnings.map(annotateRow)];
  const errorQuestionIndices = new Set(
    errors
      .map((e) => e.questionIndex)
      .filter((i): i is number => typeof i === 'number'),
  );
  const validCount = Math.max(0, normalized.questions.length - errorQuestionIndices.size);

  return {
    fileName,
    detectedFormat: format,
    recognizedCount: normalized.questions.length,
    validCount,
    skippedCount,
    warnings,
    errors,
    quiz: normalized,
  };
}

export function parseCsvQuiz(content: string, fileName: string): ImportReport {
  const matrix = parseCsvMatrix(content);
  return buildReportFromTabularMatrix(matrix, fileName, 'csv');
}
