import {
  Option,
  Question,
  Quiz,
  SCHEMA_VERSION,
  ValidationIssue,
  ValidationResult,
} from './types';

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDisplayLetter(index: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index >= 0 && index < alphabet.length) {
    return alphabet[index];
  }
  return String(index + 1);
}

export function normalizeTextPreserveLineBreaks(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export function createBlankQuestion(index: number): Question {
  const num = index + 1;
  return {
    id: `q${num}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'multiple_choice',
    text: '',
    section: '',
    points: 1,
    original_number: num,
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correct_option_ids: ['a'],
    explanation: '',
  };
}

export function createEmptyQuiz(title = 'Untitled Quiz'): Quiz {
  const now = new Date().toISOString();
  return {
    id: generateId('quiz'),
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title,
    instructions: 'Choose the best answer for each question.',
    questions: [createBlankQuestion(0)],
    created_at: now,
    updated_at: now,
  };
}

export function cloneQuiz(quiz: Quiz): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
      correct_option_ids: [...q.correct_option_ids],
    })),
  };
}

export function normalizeQuiz(quiz: Quiz): Quiz {
  const now = new Date().toISOString();
  return {
    id: quiz.id?.trim() || generateId('quiz'),
    schema_version: quiz.schema_version || SCHEMA_VERSION,
    revision: typeof quiz.revision === 'number' && quiz.revision >= 1 ? quiz.revision : 1,
    title: normalizeTextPreserveLineBreaks(quiz.title || '') || 'Untitled Quiz',
    instructions: normalizeTextPreserveLineBreaks(quiz.instructions || ''),
    created_at: quiz.created_at || now,
    updated_at: quiz.updated_at || now,
    questions: quiz.questions.map((q, idx) => ({
      id: q.id?.trim() || `q${idx + 1}`,
      type: q.type || 'multiple_choice',
      text: normalizeTextPreserveLineBreaks(q.text || ''),
      section: q.section ? normalizeTextPreserveLineBreaks(q.section) : '',
      points: typeof q.points === 'number' && Number.isFinite(q.points) && q.points > 0 ? q.points : 1,
      original_number:
        typeof q.original_number === 'number' && q.original_number > 0
          ? q.original_number
          : idx + 1,
      options: q.options.map((opt, optIdx) => ({
        id: opt.id?.trim().toLowerCase() || getDisplayLetter(optIdx).toLowerCase(),
        text: normalizeTextPreserveLineBreaks(opt.text || ''),
      })),
      correct_option_ids: Array.from(
        new Set(
          (q.correct_option_ids || [])
            .map((id) => String(id).trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
      explanation: q.explanation ? normalizeTextPreserveLineBreaks(q.explanation) : '',
    })),
  };
}

export function validateQuiz(quiz: Quiz): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!quiz.title || !quiz.title.trim()) {
    issues.push({
      severity: 'error',
      code: 'MISSING_TITLE',
      message: 'Quiz title is required.',
      suggestion: 'Enter a clear title for this quiz before presenting.',
    });
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    issues.push({
      severity: 'error',
      code: 'EMPTY_QUIZ',
      message: 'The quiz contains no questions.',
      suggestion: 'Add at least one multiple-choice question or import a valid quiz file.',
    });
  }

  const seenQuestionIds = new Set<string>();

  quiz.questions.forEach((question, qIdx) => {
    const qLabel = `Question ${qIdx + 1}`;
    const qId = question.id?.trim();

    if (!qId) {
      issues.push({
        severity: 'error',
        code: 'MISSING_QUESTION_ID',
        message: `${qLabel} is missing a stable question ID.`,
        suggestion: 'Assign a unique identifier such as q1, q2, etc.',
        questionIndex: qIdx,
      });
    } else if (seenQuestionIds.has(qId)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_QUESTION_ID',
        message: `${qLabel} uses duplicate ID "${qId}".`,
        suggestion: 'Ensure every question has a unique question_id.',
        questionId: qId,
        questionIndex: qIdx,
      });
    } else {
      seenQuestionIds.add(qId);
    }

    if ((question.type as string) !== 'multiple_choice') {
      issues.push({
        severity: 'error',
        code: 'UNSUPPORTED_QUESTION_TYPE',
        message: `${qLabel} has unsupported question type "${String(question.type)}".`,
        suggestion: 'Use "multiple_choice" for supported classroom presentation questions.',
        questionId: qId,
        questionIndex: qIdx,
      });
    }

    if (!question.text || !question.text.trim()) {
      issues.push({
        severity: 'error',
        code: 'MISSING_QUESTION_TEXT',
        message: `${qLabel} is missing question text.`,
        suggestion: 'Enter the prompt students should read on screen.',
        questionId: qId,
        questionIndex: qIdx,
      });
    }

    const seenOptionIds = new Set<string>();
    const validOptionIds = new Set<string>();
    const nonEmptyOptions: Option[] = [];

    (question.options || []).forEach((opt, oIdx) => {
      const optId = opt.id?.trim().toLowerCase();
      if (!optId) {
        issues.push({
          severity: 'error',
          code: 'MISSING_OPTION_ID',
          message: `${qLabel}, option ${oIdx + 1} is missing an option ID.`,
          suggestion: 'Assign a stable option ID such as a, b, c, or d.',
          questionId: qId,
          questionIndex: qIdx,
        });
        return;
      }

      if (seenOptionIds.has(optId)) {
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_OPTION_ID',
          message: `${qLabel} has duplicate option ID "${optId}".`,
          suggestion: 'Use distinct option IDs (a, b, c, d) within each question.',
          questionId: qId,
          questionIndex: qIdx,
        });
        return;
      }
      seenOptionIds.add(optId);

      if (opt.text && opt.text.trim()) {
        validOptionIds.add(optId);
        nonEmptyOptions.push(opt);
      } else {
        issues.push({
          severity: 'warning',
          code: 'EMPTY_OPTIONAL_CHOICE',
          message: `${qLabel} has an empty choice (${optId.toUpperCase()}).`,
          suggestion: 'Fill in the choice text or remove unused choices to keep slides clean.',
          questionId: qId,
          questionIndex: qIdx,
        });
      }
    });

    if (nonEmptyOptions.length < 2) {
      issues.push({
        severity: 'error',
        code: 'INSUFFICIENT_OPTIONS',
        message: `${qLabel} must have at least two non-empty answer choices.`,
        suggestion: 'Fill in at least Option A and Option B.',
        questionId: qId,
        questionIndex: qIdx,
      });
    }

    const correctIds = question.correct_option_ids || [];
    if (correctIds.length === 0) {
      issues.push({
        severity: 'error',
        code: 'MISSING_CORRECT_ANSWER',
        message: `${qLabel} has no correct answer selected.`,
        suggestion: 'Select one valid answer choice as the correct answer.',
        questionId: qId,
        questionIndex: qIdx,
      });
    } else {
      if (correctIds.length > 1) {
        issues.push({
          severity: 'error',
          code: 'MULTIPLE_CORRECT_ANSWERS_UNSUPPORTED',
          message: `${qLabel} lists multiple correct answers (${correctIds.join(', ')}), which is not supported in single-choice mode.`,
          suggestion: 'Select exactly one correct option ID for this question.',
          questionId: qId,
          questionIndex: qIdx,
        });
      }

      for (const cid of correctIds) {
        const normalizedCid = cid.trim().toLowerCase();
        if (!validOptionIds.has(normalizedCid)) {
          issues.push({
            severity: 'error',
            code: 'INVALID_CORRECT_ANSWER_REF',
            message: `${qLabel} marks "${cid.toUpperCase()}" as correct, but that choice is missing or empty.`,
            suggestion: 'Update the correct answer to reference an existing non-empty choice.',
            questionId: qId,
            questionIndex: qIdx,
          });
        }
      }
    }

    if (!question.explanation || !question.explanation.trim()) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_EXPLANATION',
        message: `${qLabel} has no answer explanation.`,
        suggestion: 'Optional: add a short rationale to show during answer review.',
        questionId: qId,
        questionIndex: qIdx,
      });
    }
  });

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues,
  };
}

export interface ResolvedDisplayOption {
  option: Option;
  displayLetter: string;
  originalLetter: string;
  isCorrect: boolean;
}

/**
 * Resolves a question's choices in the specified option order.
 * INVARIANT: Correctness is determined strictly by matching option.id against
 * question.correct_option_ids, NEVER by visible displayLetter or array index.
 */
export function resolveQuestionDisplayOptions(
  question: Question,
  optionOrder?: readonly string[],
): ResolvedDisplayOption[] {
  const nonEmptyOptions = question.options.filter((o) => o.text.trim().length > 0);
  const optionById = new Map<string, { option: Option; originalIndex: number }>();

  nonEmptyOptions.forEach((opt, idx) => {
    optionById.set(opt.id, { option: opt, originalIndex: idx });
  });

  const orderedIds: string[] = [];
  if (optionOrder && optionOrder.length > 0) {
    for (const id of optionOrder) {
      if (optionById.has(id) && !orderedIds.includes(id)) {
        orderedIds.push(id);
      }
    }
  }
  for (const opt of nonEmptyOptions) {
    if (!orderedIds.includes(opt.id)) {
      orderedIds.push(opt.id);
    }
  }

  return orderedIds.map((id, displayIdx) => {
    const entry = optionById.get(id)!;
    return {
      option: entry.option,
      displayLetter: getDisplayLetter(displayIdx),
      originalLetter: getDisplayLetter(entry.originalIndex),
      isCorrect: question.correct_option_ids.includes(entry.option.id),
    };
  });
}
