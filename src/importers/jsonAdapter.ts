import { generateId, normalizeQuiz, validateQuiz } from '../domain/quiz';
import {
  CanonicalQuizExport,
  ImportReport,
  Question,
  Quiz,
  SCHEMA_VERSION,
  ValidationIssue,
} from '../domain/types';

export function exportQuizToJson(quiz: Quiz): string {
  const payload: CanonicalQuizExport = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    quiz: {
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      questions: quiz.questions.map((q, idx) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        section: q.section || undefined,
        points: q.points,
        original_number: q.original_number ?? idx + 1,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        correct_option_ids: [...q.correct_option_ids],
        explanation: q.explanation || undefined,
      })),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function generateJsonTemplate(): string {
  const template: CanonicalQuizExport = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    quiz: {
      id: 'quiz-template-sample',
      title: 'Sample Classroom Quiz (Replace Title)',
      instructions:
        'Choose the best answer. Replace the sample question below with your own questions. Keep option IDs (a, b, c, d) stable; correct_option_ids must match an option id.',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          text: 'Which component executes program instructions in a computer?',
          section: 'Computer Fundamentals',
          points: 1,
          original_number: 1,
          options: [
            { id: 'a', text: 'CPU' },
            { id: 'b', text: 'Monitor' },
            { id: 'c', text: 'Keyboard' },
            { id: 'd', text: 'Printer' },
          ],
          correct_option_ids: ['a'],
          explanation:
            'The Central Processing Unit (CPU) fetches, decodes, and executes program instructions.',
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          text: 'Which planet is known as the Red Planet?',
          section: 'Earth & Space',
          points: 1,
          original_number: 2,
          options: [
            { id: 'a', text: 'Venus' },
            { id: 'b', text: 'Mars' },
            { id: 'c', text: 'Jupiter' },
            { id: 'd', text: 'Saturn' },
          ],
          correct_option_ids: ['b'],
          explanation:
            'Iron oxide dust on the Martian surface gives Mars its reddish appearance.',
        },
      ],
    },
  };
  return JSON.stringify(template, null, 2);
}

export function parseJsonQuiz(content: string, fileName: string): ImportReport {
  const trimmed = content.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return {
      fileName,
      detectedFormat: 'json',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'EMPTY_FILE',
          message: 'The JSON file is empty.',
          suggestion: 'Upload a QuizDeck JSON file or download the JSON template first.',
        },
      ],
      quiz: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      fileName,
      detectedFormat: 'json',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'MALFORMED_JSON',
          message: `Could not parse JSON: ${err instanceof Error ? err.message : 'Syntax error'}.`,
          suggestion: 'Check for missing commas, quotes, or brackets, or export a fresh JSON template.',
        },
      ],
      quiz: null,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      fileName,
      detectedFormat: 'json',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings: [],
      errors: [
        {
          severity: 'error',
          code: 'INVALID_JSON_ROOT',
          message: 'JSON root must be an object containing a "quiz" definition.',
          suggestion: 'Follow the canonical QuizDeck JSON schema.',
        },
      ],
      quiz: null,
    };
  }

  const root = parsed as Record<string, unknown>;
  const warnings: ValidationIssue[] = [];
  const rawQuiz =
    root.quiz && typeof root.quiz === 'object'
      ? (root.quiz as Record<string, unknown>)
      : root;

  if (root.schema_version && String(root.schema_version) !== SCHEMA_VERSION) {
    warnings.push({
      severity: 'warning',
      code: 'SCHEMA_VERSION_MISMATCH',
      message: `File uses schema version "${String(root.schema_version)}" (current is "${SCHEMA_VERSION}").`,
      suggestion: 'Review the imported questions carefully before presenting.',
    });
  }

  if (!Array.isArray(rawQuiz.questions)) {
    return {
      fileName,
      detectedFormat: 'json',
      recognizedCount: 0,
      validCount: 0,
      skippedCount: 0,
      warnings,
      errors: [
        {
          severity: 'error',
          code: 'MISSING_QUESTIONS_ARRAY',
          message: 'JSON file does not contain a "questions" array.',
          suggestion: 'Ensure your JSON has a "quiz.questions" list matching the QuizDeck template.',
        },
      ],
      quiz: null,
    };
  }

  const now = new Date().toISOString();
  const questions: Question[] = rawQuiz.questions.map((raw, idx) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const rawOptions = Array.isArray(item.options) ? item.options : [];
    const options = rawOptions.map((opt, optIdx) => {
      const o = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : String.fromCharCode(97 + optIdx),
        text: typeof o.text === 'string' ? o.text : String(o.text ?? ''),
      };
    });

    const correctOptionIds = Array.isArray(item.correct_option_ids)
      ? item.correct_option_ids.map((c) => String(c))
      : typeof item.correct_answer === 'string'
        ? item.correct_answer
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    return {
      id: typeof item.id === 'string' ? item.id : `q${idx + 1}`,
      type: (typeof item.type === 'string' ? item.type : 'multiple_choice') as Question['type'],
      text: typeof item.text === 'string' ? item.text : '',
      section: typeof item.section === 'string' ? item.section : '',
      points:
        typeof item.points === 'number' && Number.isFinite(item.points) ? item.points : 1,
      original_number:
        typeof item.original_number === 'number' ? item.original_number : idx + 1,
      options,
      correct_option_ids: correctOptionIds,
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
    };
  });

  const normalized = normalizeQuiz({
    id: typeof rawQuiz.id === 'string' && rawQuiz.id.trim() ? rawQuiz.id : generateId('quiz'),
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title:
      typeof rawQuiz.title === 'string' && rawQuiz.title.trim()
        ? rawQuiz.title
        : fileName.replace(/\.[^.]+$/, ''),
    instructions: typeof rawQuiz.instructions === 'string' ? rawQuiz.instructions : '',
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
    detectedFormat: 'json',
    recognizedCount: normalized.questions.length,
    validCount,
    skippedCount: 0,
    warnings: [...warnings, ...validation.warnings],
    errors: validation.errors,
    quiz: normalized,
  };
}
