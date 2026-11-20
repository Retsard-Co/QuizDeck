import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveQuestionDisplayOptions } from './quiz';
import { generateSessionOrders } from './randomization';
import { Quiz, SCHEMA_VERSION } from './types';

function buildMatrixQuiz(): Quiz {
  return {
    id: 'quiz-rand',
    schema_version: SCHEMA_VERSION,
    revision: 1,
    title: 'Randomization Matrix Fixture',
    instructions: '',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    questions: [
      {
        id: 'qA',
        type: 'multiple_choice',
        text: 'Answer is A',
        section: 'Sec 1',
        points: 1,
        original_number: 1,
        options: [
          { id: 'a', text: 'Correct A' },
          { id: 'b', text: 'Wrong B1' },
          { id: 'c', text: 'Wrong C1' },
          { id: 'd', text: 'Wrong D1' },
        ],
        correct_option_ids: ['a'],
      },
      {
        id: 'qB',
        type: 'multiple_choice',
        text: 'Answer is B',
        section: 'Sec 1',
        points: 1,
        original_number: 2,
        options: [
          { id: 'a', text: 'Wrong A2' },
          { id: 'b', text: 'Correct B' },
          { id: 'c', text: 'Wrong C2' },
          { id: 'd', text: 'Wrong D2' },
        ],
        correct_option_ids: ['b'],
      },
      {
        id: 'qC',
        type: 'multiple_choice',
        text: 'Answer is C (only 3 options, D empty)',
        section: 'Sec 2',
        points: 1,
        original_number: 3,
        options: [
          { id: 'a', text: 'Wrong A3' },
          { id: 'b', text: 'Wrong B3' },
          { id: 'c', text: 'Correct C' },
          { id: 'd', text: '' },
        ],
        correct_option_ids: ['c'],
      },
      {
        id: 'qD',
        type: 'multiple_choice',
        text: 'Answer is D',
        section: 'Sec 2',
        points: 1,
        original_number: 4,
        options: [
          { id: 'a', text: 'Wrong A4' },
          { id: 'b', text: 'Wrong B4' },
          { id: 'c', text: 'Wrong C4' },
          { id: 'd', text: 'Correct D' },
        ],
        correct_option_ids: ['d'],
      },
    ],
  };
}

const EXPECTED_CORRECT_TEXT: Record<string, string> = {
  qA: 'Correct A',
  qB: 'Correct B',
  qC: 'Correct C',
  qD: 'Correct D',
};

test('all 4 randomization matrix combinations preserve exact correct answer mapping across 50 seeds', () => {
  const quiz = buildMatrixQuiz();
  const originalSnapshot = JSON.stringify(quiz);

  const configs = [
    { randomizeQuestions: false, randomizeChoices: false },
    { randomizeQuestions: true, randomizeChoices: false },
    { randomizeQuestions: false, randomizeChoices: true },
    { randomizeQuestions: true, randomizeChoices: true },
  ];

  let sawDifferentQuestionOrder = false;
  let sawDifferentChoiceOrder = false;

  for (const cfg of configs) {
    for (let s = 1; s <= 50; s++) {
      const orders = generateSessionOrders(quiz, {
        ...cfg,
        seed: `seed-${s}`,
      });

      assert.equal(orders.question_order.length, quiz.questions.length);
      assert.equal(new Set(orders.question_order).size, quiz.questions.length);

      if (!cfg.randomizeQuestions) {
        assert.deepEqual(orders.question_order, ['qA', 'qB', 'qC', 'qD']);
      } else if (orders.question_order.join(',') !== 'qA,qB,qC,qD') {
        sawDifferentQuestionOrder = true;
      }

      for (const qId of orders.question_order) {
        const q = quiz.questions.find((item) => item.id === qId)!;
        const optOrder = orders.option_orders[qId];
        const nonEmptyCount = q.options.filter((o) => o.text.trim().length > 0).length;
        assert.equal(optOrder.length, nonEmptyCount);
        assert.equal(new Set(optOrder).size, nonEmptyCount);

        if (cfg.randomizeChoices && optOrder.join(',') !== 'a,b,c,d' && optOrder.length === 4) {
          sawDifferentChoiceOrder = true;
        }

        const resolved = resolveQuestionDisplayOptions(q, optOrder);
        const correct = resolved.filter((r) => r.isCorrect);
        assert.equal(correct.length, 1);
        assert.equal(correct[0].option.text, EXPECTED_CORRECT_TEXT[qId]);
      }
    }
  }

  assert.equal(sawDifferentQuestionOrder, true);
  assert.equal(sawDifferentChoiceOrder, true);
  // Canonical quiz must never be mutated
  assert.equal(JSON.stringify(quiz), originalSnapshot);
});

test('seeded randomization is deterministic and reproducible', () => {
  const quiz = buildMatrixQuiz();
  const run1 = generateSessionOrders(quiz, {
    randomizeQuestions: true,
    randomizeChoices: true,
    seed: 'FALL-2026-SEC-A',
  });
  const run2 = generateSessionOrders(quiz, {
    randomizeQuestions: true,
    randomizeChoices: true,
    seed: 'FALL-2026-SEC-A',
  });
  assert.deepEqual(run1.question_order, run2.question_order);
  assert.deepEqual(run1.option_orders, run2.option_orders);
});

test('randomizeWithinSections keeps section groups contiguous while shuffling within each section', () => {
  const quiz = buildMatrixQuiz();
  for (let s = 1; s <= 25; s++) {
    const orders = generateSessionOrders(quiz, {
      randomizeQuestions: true,
      randomizeChoices: true,
      randomizeWithinSections: true,
      seed: `sec-seed-${s}`,
    });
    const firstTwo = new Set(orders.question_order.slice(0, 2));
    const lastTwo = new Set(orders.question_order.slice(2, 4));
    assert.deepEqual(firstTwo, new Set(['qA', 'qB']));
    assert.deepEqual(lastTwo, new Set(['qC', 'qD']));
  }
});
