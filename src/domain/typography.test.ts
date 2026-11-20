import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAutoFitStep, FONT_BOUNDS, shouldStackChoices } from './typography';

test('auto-fit steps down density before shrinking font sizes', () => {
  const step1 = computeAutoFitStep({
    preferredQuestionPx: 48,
    preferredChoicePx: 30,
    autoFitEnabled: true,
    density: 'spacious',
    overflowRatio: 1.15,
    currentQuestionPx: 48,
    currentChoicePx: 30,
  });
  assert.equal(step1.effectiveDensity, 'balanced');
  assert.equal(step1.nextQuestionPx, 48);
  assert.equal(step1.needsScrollFallback, false);

  const step2 = computeAutoFitStep({
    preferredQuestionPx: 48,
    preferredChoicePx: 30,
    autoFitEnabled: true,
    density: 'balanced',
    overflowRatio: 1.15,
    currentQuestionPx: 48,
    currentChoicePx: 30,
  });
  assert.equal(step2.effectiveDensity, 'compact');
  assert.equal(step2.nextQuestionPx, 48);

  const step3 = computeAutoFitStep({
    preferredQuestionPx: 48,
    preferredChoicePx: 30,
    autoFitEnabled: true,
    density: 'compact',
    overflowRatio: 1.25,
    currentQuestionPx: 48,
    currentChoicePx: 30,
  });
  assert.ok(step3.nextQuestionPx < 48);
  assert.ok(step3.nextChoicePx < 30);
});

test('auto-fit never shrinks below readable minimum floor and activates scroll fallback', () => {
  const atFloor = computeAutoFitStep({
    preferredQuestionPx: 48,
    preferredChoicePx: 30,
    autoFitEnabled: true,
    density: 'compact',
    overflowRatio: 1.4,
    currentQuestionPx: FONT_BOUNDS.question.min,
    currentChoicePx: FONT_BOUNDS.choice.min,
  });
  assert.equal(atFloor.nextQuestionPx, FONT_BOUNDS.question.min);
  assert.equal(atFloor.nextChoicePx, FONT_BOUNDS.choice.min);
  assert.equal(atFloor.reachedMinimumFloor, true);
  assert.equal(atFloor.needsScrollFallback, true);
});

test('manual mode applies preferred sizes directly and flags overflow without shrinking', () => {
  const manual = computeAutoFitStep({
    preferredQuestionPx: 64,
    preferredChoicePx: 40,
    autoFitEnabled: false,
    density: 'balanced',
    overflowRatio: 1.3,
    currentQuestionPx: 64,
    currentChoicePx: 40,
  });
  assert.equal(manual.nextQuestionPx, 64);
  assert.equal(manual.nextChoicePx, 40);
  assert.equal(manual.isOverflowing, true);
  assert.equal(manual.needsScrollFallback, true);
});

test('shouldStackChoices switches long choices to stacked layout and keeps short 4-choice slides side-by-side on wide screens', () => {
  const shortOpts = [{ text: 'CPU' }, { text: 'GPU' }, { text: 'RAM' }, { text: 'SSD' }];
  assert.equal(shouldStackChoices(shortOpts, 1280, 28), false);
  assert.equal(shouldStackChoices(shortOpts, 640, 28), true);

  const longOpts = [
    { text: 'Mitochondria lack the cytosolic enzymes of glycolysis needed to break glucose down into pyruvate.' },
    { text: 'Option B short' },
    { text: 'Option C short' },
    { text: 'Option D short' },
  ];
  assert.equal(shouldStackChoices(longOpts, 1280, 28), true);
});
