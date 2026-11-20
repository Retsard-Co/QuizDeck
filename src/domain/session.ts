import { cloneQuiz, generateId, resolveQuestionDisplayOptions } from './quiz';
import { generateSessionOrders } from './randomization';
import {
  PresentationSession,
  Question,
  Quiz,
  RevealPolicy,
  SCHEMA_VERSION,
  SessionSettings,
} from './types';
import { FONT_BOUNDS } from './typography';

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  randomize_questions: false,
  randomize_choices: false,
  randomize_within_sections: false,
  seed: '',
  show_question_number: true,
  show_original_number: false,
  show_progress: true,
  auto_fit: true,
  question_font_preference: FONT_BOUNDS.question.default,
  choice_font_preference: FONT_BOUNDS.choice.default,
  title_font_preference: FONT_BOUNDS.title.default,
  review_font_preference: FONT_BOUNDS.review.default,
  layout_density: 'balanced',
  theme: 'dark',
  timer_enabled: false,
  timer_seconds: 30,
  timer_auto_advance: false,
  allow_hide_after_reveal: true,
};

export function createPresentationSession(
  quiz: Quiz,
  revealPolicy: RevealPolicy,
  settingsInput: Partial<SessionSettings> = {},
): PresentationSession {
  const now = new Date().toISOString();
  const settings: SessionSettings = {
    ...DEFAULT_SESSION_SETTINGS,
    ...settingsInput,
  };

  // Snapshot the canonical quiz so later library edits do not silently mutate an active session.
  const snapshot = cloneQuiz(quiz);

  const orders = generateSessionOrders(snapshot, {
    randomizeQuestions: settings.randomize_questions,
    randomizeChoices: settings.randomize_choices,
    randomizeWithinSections: settings.randomize_within_sections,
    seed: settings.seed,
  });

  const initialTimer = settings.timer_enabled
    ? Math.max(5, Math.round(settings.timer_seconds || 30))
    : null;

  return {
    id: generateId('session'),
    schema_version: SCHEMA_VERSION,
    quiz_id: snapshot.id,
    quiz_revision: snapshot.revision,
    quiz_snapshot: snapshot,
    status: 'presenting',
    question_order: orders.question_order,
    option_orders: orders.option_orders,
    randomization_algorithm: orders.algorithm,
    seed_used: orders.seed_used,
    current_index: orders.question_order.length > 0 ? 0 : -1,
    reveal_policy: revealPolicy,
    revealed_question_ids: [],
    revisit_question_ids: [],
    settings,
    timer_remaining_seconds: initialTimer,
    timer_running: settings.timer_enabled,
    timer_expired: false,
    created_at: now,
    updated_at: now,
  };
}

export function getActiveQuestion(session: PresentationSession): Question | null {
  if (
    session.current_index < 0 ||
    session.current_index >= session.question_order.length
  ) {
    return null;
  }
  const activeId = session.question_order[session.current_index];
  return session.quiz_snapshot.questions.find((q) => q.id === activeId) || null;
}

export function isQuestionRevealed(
  session: PresentationSession,
  questionId: string,
): boolean {
  if (session.status === 'answer_review') {
    return true;
  }
  if (session.reveal_policy === 'after_entire_quiz') {
    return false;
  }
  return session.revealed_question_ids.includes(questionId);
}

export interface StudentSlideOptionView {
  id: string;
  displayLetter: string;
  text: string;
  /** Only true when the answer has been revealed to students. */
  isMarkedCorrect: boolean;
}

export interface StudentSlideView {
  questionId: string;
  presentationNumber: number;
  totalQuestions: number;
  originalNumber?: number;
  section?: string;
  text: string;
  options: StudentSlideOptionView[];
  isRevealed: boolean;
  /** Only populated when isRevealed === true. */
  explanation?: string;
}

/**
 * Builds the student-facing slide view model.
 * Prevents accidental disclosure by withholding correctness flags and explanation
 * whenever the active question is not revealed.
 */
export function getStudentSlideView(
  session: PresentationSession,
): StudentSlideView | null {
  const question = getActiveQuestion(session);
  if (!question) return null;

  const optionOrder = session.option_orders[question.id];
  const resolved = resolveQuestionDisplayOptions(question, optionOrder);
  const revealed = isQuestionRevealed(session, question.id);

  return {
    questionId: question.id,
    presentationNumber: session.current_index + 1,
    totalQuestions: session.question_order.length,
    originalNumber: question.original_number,
    section: question.section,
    text: question.text,
    isRevealed: revealed,
    explanation: revealed ? question.explanation : undefined,
    options: resolved.map((item) => ({
      id: item.option.id,
      displayLetter: item.displayLetter,
      text: item.option.text,
      isMarkedCorrect: revealed ? item.isCorrect : false,
    })),
  };
}

function resetTimerForQuestion(session: PresentationSession): Pick<
  PresentationSession,
  'timer_remaining_seconds' | 'timer_running' | 'timer_expired'
> {
  if (!session.settings.timer_enabled) {
    return {
      timer_remaining_seconds: null,
      timer_running: false,
      timer_expired: false,
    };
  }
  return {
    timer_remaining_seconds: Math.max(5, Math.round(session.settings.timer_seconds || 30)),
    timer_running: session.status === 'presenting',
    timer_expired: false,
  };
}

export function goToQuestion(
  session: PresentationSession,
  targetIndex: number,
): PresentationSession {
  if (session.question_order.length === 0) return session;
  const clamped = Math.max(0, Math.min(session.question_order.length - 1, targetIndex));
  if (clamped === session.current_index) return session;

  return {
    ...session,
    current_index: clamped,
    ...resetTimerForQuestion(session),
    updated_at: new Date().toISOString(),
  };
}

export function goToNextQuestion(session: PresentationSession): PresentationSession {
  if (session.current_index >= session.question_order.length - 1) {
    // Guard: do not silently end session at the final question.
    return session;
  }
  return goToQuestion(session, session.current_index + 1);
}

export function goToPreviousQuestion(
  session: PresentationSession,
): PresentationSession {
  if (session.current_index <= 0) {
    return session;
  }
  return goToQuestion(session, session.current_index - 1);
}

export function revealAnswer(session: PresentationSession): PresentationSession {
  const active = getActiveQuestion(session);
  if (!active) return session;

  // Under after_entire_quiz policy, answers cannot be revealed during live question presentation.
  if (
    session.reveal_policy === 'after_entire_quiz' &&
    session.status !== 'answer_review'
  ) {
    return session;
  }

  if (session.revealed_question_ids.includes(active.id)) {
    return session;
  }

  return {
    ...session,
    revealed_question_ids: [...session.revealed_question_ids, active.id],
    timer_running: false,
    updated_at: new Date().toISOString(),
  };
}

export function hideAnswer(session: PresentationSession): PresentationSession {
  const active = getActiveQuestion(session);
  if (!active) return session;
  if (!session.settings.allow_hide_after_reveal) return session;
  if (!session.revealed_question_ids.includes(active.id)) return session;

  return {
    ...session,
    revealed_question_ids: session.revealed_question_ids.filter((id) => id !== active.id),
    updated_at: new Date().toISOString(),
  };
}

export function toggleRevisit(
  session: PresentationSession,
  questionId?: string,
): PresentationSession {
  const targetId = questionId || getActiveQuestion(session)?.id;
  if (!targetId || !session.question_order.includes(targetId)) return session;

  const exists = session.revisit_question_ids.includes(targetId);
  return {
    ...session,
    revisit_question_ids: exists
      ? session.revisit_question_ids.filter((id) => id !== targetId)
      : [...session.revisit_question_ids, targetId],
    updated_at: new Date().toISOString(),
  };
}

export function pauseSession(session: PresentationSession): PresentationSession {
  if (session.status !== 'presenting') return session;
  return {
    ...session,
    status: 'paused',
    timer_running: false,
    updated_at: new Date().toISOString(),
  };
}

export function resumeSession(session: PresentationSession): PresentationSession {
  if (session.status !== 'paused') return session;
  return {
    ...session,
    status: 'presenting',
    timer_running:
      session.settings.timer_enabled &&
      (session.timer_remaining_seconds ?? 0) > 0 &&
      !session.timer_expired,
    updated_at: new Date().toISOString(),
  };
}

export function finishPresentation(
  session: PresentationSession,
): PresentationSession {
  return {
    ...session,
    status: 'answer_review',
    timer_running: false,
    updated_at: new Date().toISOString(),
  };
}

export function returnToPresentation(
  session: PresentationSession,
  index?: number,
): PresentationSession {
  const targetIndex =
    typeof index === 'number'
      ? Math.max(0, Math.min(session.question_order.length - 1, index))
      : session.current_index;

  return {
    ...session,
    status: 'presenting',
    current_index: targetIndex,
    updated_at: new Date().toISOString(),
  };
}

export function completeSession(session: PresentationSession): PresentationSession {
  return {
    ...session,
    status: 'completed',
    timer_running: false,
    updated_at: new Date().toISOString(),
  };
}

export function tickTimer(session: PresentationSession): PresentationSession {
  if (
    session.status !== 'presenting' ||
    !session.settings.timer_enabled ||
    !session.timer_running ||
    session.timer_remaining_seconds === null
  ) {
    return session;
  }

  const nextSeconds = Math.max(0, session.timer_remaining_seconds - 1);
  if (nextSeconds > 0) {
    return {
      ...session,
      timer_remaining_seconds: nextSeconds,
    };
  }

  // Timer reached zero: NEVER reveal answers automatically.
  // Only auto-advance if teacher explicitly enabled timer_auto_advance and there is a next question.
  if (
    session.settings.timer_auto_advance &&
    session.current_index < session.question_order.length - 1
  ) {
    return goToNextQuestion({
      ...session,
      timer_remaining_seconds: 0,
      timer_running: false,
      timer_expired: true,
    });
  }

  return {
    ...session,
    timer_remaining_seconds: 0,
    timer_running: false,
    timer_expired: true,
    updated_at: new Date().toISOString(),
  };
}

export function resetActiveTimer(session: PresentationSession): PresentationSession {
  if (!session.settings.timer_enabled) return session;
  return {
    ...session,
    timer_remaining_seconds: Math.max(5, Math.round(session.settings.timer_seconds || 30)),
    timer_running: session.status === 'presenting',
    timer_expired: false,
    updated_at: new Date().toISOString(),
  };
}

export type LiveDisplaySettingsPatch = Partial<
  Pick<
    SessionSettings,
    | 'auto_fit'
    | 'question_font_preference'
    | 'choice_font_preference'
    | 'title_font_preference'
    | 'review_font_preference'
    | 'layout_density'
    | 'theme'
    | 'show_question_number'
    | 'show_original_number'
    | 'show_progress'
  >
>;

/**
 * Updates live display preferences while keeping locked randomization settings immutable.
 */
export function updateSessionDisplaySettings(
  session: PresentationSession,
  patch: LiveDisplaySettingsPatch,
): PresentationSession {
  return {
    ...session,
    settings: {
      ...session.settings,
      ...patch,
    },
    updated_at: new Date().toISOString(),
  };
}
