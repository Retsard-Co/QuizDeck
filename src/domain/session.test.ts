import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPresentationSession,
  finishPresentation,
  getStudentSlideView,
  goToNextQuestion,
  goToPreviousQuestion,
  goToQuestion,
  hideAnswer,
  pauseSession,
  resumeSession,
  returnToPresentation,
  revealAnswer,
  tickTimer,
} from './session';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';

const sampleQuiz = SAMPLE_QUIZZES[0];

test('manual reveal policy withholds correctness before reveal and does not auto-reveal on advance', () => {
  let session = createPresentationSession(sampleQuiz, 'manual', {
    randomize_questions: true,
    randomize_choices: true,
    seed: 'manual-test',
  });

  const beforeReveal = getStudentSlideView(session)!;
  assert.equal(beforeReveal.isRevealed, false);
  assert.equal(beforeReveal.explanation, undefined);
  assert.equal(
    beforeReveal.options.some((o) => o.isMarkedCorrect),
    false,
    'Student slide view must not mark any option correct prior to reveal',
  );

  // Advancing must not reveal previous or next question
  session = goToNextQuestion(session);
  assert.equal(session.current_index, 1);
  assert.equal(session.revealed_question_ids.length, 0);

  // Explicit reveal marks exactly one correct option
  session = revealAnswer(session);
  const afterReveal = getStudentSlideView(session)!;
  assert.equal(afterReveal.isRevealed, true);
  assert.equal(afterReveal.options.filter((o) => o.isMarkedCorrect).length, 1);

  // Explicit hide conceals it again
  session = hideAnswer(session);
  const afterHide = getStudentSlideView(session)!;
  assert.equal(afterHide.isRevealed, false);
  assert.equal(
    afterHide.options.some((o) => o.isMarkedCorrect),
    false,
  );
});

test('after_entire_quiz policy blocks reveal during presentation and shows answers in review with preserved order', () => {
  let session = createPresentationSession(sampleQuiz, 'after_entire_quiz', {
    randomize_questions: true,
    randomize_choices: true,
    seed: 'entire-quiz-seed',
  });
  const savedOrder = [...session.question_order];
  const savedOptionOrders = JSON.stringify(session.option_orders);

  session = revealAnswer(session);
  assert.equal(session.revealed_question_ids.length, 0);
  assert.equal(getStudentSlideView(session)!.isRevealed, false);

  session = finishPresentation(session);
  assert.equal(session.status, 'answer_review');
  assert.deepEqual(session.question_order, savedOrder);
  assert.equal(JSON.stringify(session.option_orders), savedOptionOrders);

  // Returning to presentation preserves order without reshuffling
  session = returnToPresentation(session, 2);
  assert.equal(session.status, 'presenting');
  assert.equal(session.current_index, 2);
  assert.deepEqual(session.question_order, savedOrder);
});

test('navigation respects bounds and does not silently end session at last question', () => {
  let session = createPresentationSession(sampleQuiz, 'after_each');
  assert.equal(session.current_index, 0);

  session = goToPreviousQuestion(session);
  assert.equal(session.current_index, 0);

  const lastIndex = session.question_order.length - 1;
  session = goToQuestion(session, lastIndex);
  assert.equal(session.current_index, lastIndex);

  session = goToNextQuestion(session);
  assert.equal(session.current_index, lastIndex);
  assert.equal(session.status, 'presenting');
});

test('timer expiration never reveals answer and only auto-advances when explicitly enabled', () => {
  let session = createPresentationSession(sampleQuiz, 'manual', {
    timer_enabled: true,
    timer_seconds: 5,
    timer_auto_advance: false,
  });

  for (let i = 0; i < 5; i++) {
    session = tickTimer(session);
  }
  assert.equal(session.timer_remaining_seconds, 0);
  assert.equal(session.timer_expired, true);
  assert.equal(session.current_index, 0);
  assert.equal(session.revealed_question_ids.length, 0);

  // Pause & resume preserves remaining seconds
  let session2 = createPresentationSession(sampleQuiz, 'manual', {
    timer_enabled: true,
    timer_seconds: 10,
  });
  session2 = tickTimer(session2);
  assert.equal(session2.timer_remaining_seconds, 9);
  session2 = pauseSession(session2);
  assert.equal(session2.status, 'paused');
  session2 = tickTimer(session2);
  assert.equal(session2.timer_remaining_seconds, 9);
  session2 = resumeSession(session2);
  assert.equal(session2.status, 'presenting');
  session2 = tickTimer(session2);
  assert.equal(session2.timer_remaining_seconds, 8);
});

test('session snapshot isolates active presentation from subsequent source quiz edits', () => {
  const editableQuiz = structuredClone(sampleQuiz);
  const session = createPresentationSession(editableQuiz, 'manual');
  editableQuiz.questions[0].text = 'EDITED AFTER SESSION START';
  assert.notEqual(
    session.quiz_snapshot.questions[0].text,
    'EDITED AFTER SESSION START',
  );
});
