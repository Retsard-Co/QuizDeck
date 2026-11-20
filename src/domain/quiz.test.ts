import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cloneQuiz,
  createEmptyQuiz,
  resolveQuestionDisplayOptions,
  validateQuiz,
} from './quiz';
import { Quiz, SCHEMA_VERSION } from './types';

function makeValidQuiz(): Quiz {
  return {
    id: 'quiz-1',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: 'Sample Quiz',
    instructions: 'Pick one.',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        text: 'What is 2 + 2?',
        points: 1,
        original_number: 1,
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4' },
          { id: 'c', text: '5' },
          { id: 'd', text: '6' },
        ],
        correct_option_ids: ['b'],
        explanation: '2 + 2 equals 4.',
      },
    ],
  };
}

test('validateQuiz passes for a well-formed quiz', () => {
  const result = validateQuiz(makeValidQuiz());
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateQuiz detects empty quiz, missing question text, and missing title', () => {
  const emptyQuiz = makeValidQuiz();
  emptyQuiz.title = '   ';
  emptyQuiz.questions = [];
  const res = validateQuiz(emptyQuiz);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'MISSING_TITLE'));
  assert.ok(res.errors.some((e) => e.code === 'EMPTY_QUIZ'));

  const blankQ = createEmptyQuiz('Has Title');
  const res2 = validateQuiz(blankQ);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.code === 'MISSING_QUESTION_TEXT'));
  assert.ok(res2.errors.some((e) => e.code === 'INSUFFICIENT_OPTIONS'));
});

test('validateQuiz rejects duplicate question IDs and invalid correct answer reference', () => {
  const quiz = makeValidQuiz();
  quiz.questions.push({
    ...quiz.questions[0],
    id: 'q1', // duplicate
    correct_option_ids: ['z'], // nonexistent
  });
  const res = validateQuiz(quiz);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'DUPLICATE_QUESTION_ID'));
  assert.ok(res.errors.some((e) => e.code === 'INVALID_CORRECT_ANSWER_REF'));
});

test('validateQuiz flags unsupported question types and multiple correct answers explicitly', () => {
  const quiz = makeValidQuiz();
  (quiz.questions[0] as unknown as { type: string }).type = 'short_answer';
  quiz.questions[0].correct_option_ids = ['a', 'b'];
  const res = validateQuiz(quiz);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'UNSUPPORTED_QUESTION_TYPE'));
  assert.ok(res.errors.some((e) => e.code === 'MULTIPLE_CORRECT_ANSWERS_UNSUPPORTED'));
});

test('resolveQuestionDisplayOptions resolves correctness strictly by stable option ID', () => {
  const quiz = makeValidQuiz();
  const q = quiz.questions[0];
  // Original correct option is id "b" ("4")
  const resolved = resolveQuestionDisplayOptions(q, ['d', 'a', 'b', 'c']);
  assert.deepEqual(
    resolved.map((r) => r.displayLetter),
    ['A', 'B', 'C', 'D'],
  );
  const correctItems = resolved.filter((r) => r.isCorrect);
  assert.equal(correctItems.length, 1);
  assert.equal(correctItems[0].option.id, 'b');
  assert.equal(correctItems[0].option.text, '4');
  assert.equal(correctItems[0].displayLetter, 'C');
});

test('cloneQuiz creates an independent deep copy', () => {
  const original = makeValidQuiz();
  const copy = cloneQuiz(original);
  copy.questions[0].text = 'Mutated';
  copy.questions[0].options[0].text = 'Mutated opt';
  copy.questions[0].correct_option_ids.push('c');
  assert.equal(original.questions[0].text, 'What is 2 + 2?');
  assert.equal(original.questions[0].options[0].text, '3');
  assert.deepEqual(original.questions[0].correct_option_ids, ['b']);
});
