import { ImportFormat, ImportReport, MAX_IMPORT_FILE_BYTES } from '../domain/types';
import { parseCsvQuiz } from './csvAdapter';
import { parseDocxQuiz } from './docxAdapter';
import { parseJsonQuiz } from './jsonAdapter';
import { parseXlsxQuiz } from './xlsxAdapter';

export {
  exportQuizToJson,
  generateJsonTemplate,
  parseJsonQuiz,
} from './jsonAdapter';
export {
  exportQuizToCsv,
  generateCsvTemplate,
  parseCsvQuiz,
  SPREADSHEET_HEADERS,
} from './csvAdapter';
export {
  exportQuizToXlsx,
  generateXlsxTemplate,
  parseXlsxQuiz,
} from './xlsxAdapter';
export {
  exportQuizToDocx,
  generateDocxTemplate,
  parseDocxQuiz,
} from './docxAdapter';

export interface ImportableFileLike {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}

export function detectImportFormat(fileName: string): ImportFormat | 'unknown' {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx')) return 'xlsx';
  if (lower.endsWith('.docx')) return 'docx';
  return 'unknown';
}

export async function importQuizFile(file: ImportableFileLike): Promise<ImportReport> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return {
      fileName: file.name,
      detectedFormat: detectImportFormat(file.name),
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'FILE_TOO_LARGE',
          message: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB safety limit.`,
          suggestion: 'Split very large files or remove embedded media before importing.',
        },
      ],
      quiz: null,
    };
  }

  const format = detectImportFormat(file.name);
  if (format === 'unknown') {
    return {
      fileName: file.name,
      detectedFormat: 'unknown',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'UNSUPPORTED_FILE_TYPE',
          message: `Unsupported file type for "${file.name}".`,
          suggestion: 'Upload a .json, .csv, .xlsx, or .docx quiz file.',
        },
      ],
      quiz: null,
    };
  }

  if (format === 'json') {
    const text = await file.text();
    return parseJsonQuiz(text, file.name);
  }
  if (format === 'csv') {
    const text = await file.text();
    return parseCsvQuiz(text, file.name);
  }
  if (format === 'xlsx') {
    const buf = await file.arrayBuffer();
    return parseXlsxQuiz(buf, file.name);
  }
  const buf = await file.arrayBuffer();
  return parseDocxQuiz(buf, file.name);
}
