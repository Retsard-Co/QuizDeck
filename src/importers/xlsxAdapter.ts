import * as XLSX from 'xlsx';
import { ImportReport, Quiz, ValidationIssue } from '../domain/types';
import {
  buildReportFromTabularMatrix,
  quizToTabularRows,
  SPREADSHEET_HEADERS,
} from './csvAdapter';

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function hasZipSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return ZIP_MAGIC.every((b, idx) => bytes[idx] === b);
}

export function generateXlsxTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  const sampleRows = [
    {
      question_id: 'q1',
      question: 'Which component executes program instructions?',
      option_a: 'CPU',
      option_b: 'Monitor',
      option_c: 'Keyboard',
      option_d: 'Printer',
      correct_answer: 'A',
      explanation: 'The CPU fetches, decodes, and executes program instructions.',
      section: 'Computer Fundamentals',
      question_type: 'multiple_choice',
      points: 1,
    },
    {
      question_id: 'q2',
      question: 'What is the chemical symbol for sodium?',
      option_a: 'So',
      option_b: 'Na',
      option_c: 'Sd',
      option_d: 'Sn',
      correct_answer: 'B',
      explanation: 'Na comes from the Latin name natrium.',
      section: 'Chemistry',
      question_type: 'multiple_choice',
      points: 1,
    },
  ];

  const wsQuestions = XLSX.utils.json_to_sheet(sampleRows, {
    header: [...SPREADSHEET_HEADERS],
  });
  wsQuestions['!cols'] = [
    { wch: 14 },
    { wch: 48 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 42 },
    { wch: 22 },
    { wch: 18 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions');

  const instructionsData = [
    ['QuizDeck Spreadsheet Template Instructions'],
    [''],
    ['1. Fill in your questions on the "Questions" worksheet. Do not rename column headers.'],
    ['2. Required columns: question, option_a, option_b, correct_answer, question_type.'],
    ['3. Optional columns: question_id, option_c, option_d, explanation, section, points.'],
    ['4. IMPORTANT: correct_answer refers to the ORIGINAL option letter (A, B, C, or D), not its randomized display position.'],
    ['5. Supported question_type is currently: multiple_choice.'],
    ['6. Save as .xlsx and upload into QuizDeck to preview, edit, and present.'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 96 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export function exportQuizToXlsx(quiz: Quiz): Uint8Array {
  const wb = XLSX.utils.book_new();
  const rows = quizToTabularRows(quiz);
  const wsQuestions = XLSX.utils.json_to_sheet(rows, {
    header: [...SPREADSHEET_HEADERS],
  });
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

export function parseXlsxQuiz(
  input: ArrayBuffer | Uint8Array,
  fileName: string,
): ImportReport {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!hasZipSignature(bytes)) {
    return {
      fileName,
      detectedFormat: 'xlsx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'CORRUPT_XLSX',
          message: 'The file does not have a valid XLSX spreadsheet signature.',
          suggestion:
            'Make sure you saved the workbook as .xlsx (Excel Workbook) and that the file is not corrupted.',
        },
      ],
      quiz: null,
    };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: 'array' });
  } catch (err) {
    return {
      fileName,
      detectedFormat: 'xlsx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'UNREADABLE_XLSX',
          message: `Unable to read XLSX workbook: ${err instanceof Error ? err.message : 'Corrupt archive'}.`,
          suggestion: 'Re-save the spreadsheet from Excel, LibreOffice, or Google Sheets as .xlsx.',
        },
      ],
      quiz: null,
    };
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      fileName,
      detectedFormat: 'xlsx',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'NO_WORKSHEETS',
          message: 'The XLSX workbook contains no worksheets.',
          suggestion: 'Download the QuizDeck XLSX template and add rows to the "Questions" sheet.',
        },
      ],
      quiz: null,
    };
  }

  const warnings: ValidationIssue[] = [];
  let targetSheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === 'questions',
  );
  if (!targetSheetName) {
    targetSheetName = workbook.SheetNames[0];
    warnings.push({
      severity: 'warning',
      code: 'DEFAULT_SHEET_USED',
      message: `No "Questions" worksheet found; read first worksheet "${targetSheetName}".`,
      suggestion: 'Name the question sheet "Questions" to match the QuizDeck template.',
    });
  }

  const sheet = workbook.Sheets[targetSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  const matrix: string[][] = rawMatrix.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [],
  );

  return buildReportFromTabularMatrix(matrix, fileName, 'xlsx', warnings);
}
