import { LayoutDensity, Option } from './types';

export const FONT_BOUNDS = {
  question: { min: 22, max: 80, default: 44, step: 4 },
  choice: { min: 18, max: 52, default: 28, step: 2 },
  title: { min: 14, max: 28, default: 18, step: 2 },
  review: { min: 14, max: 32, default: 17, step: 2 },
} as const;

export function clampFontSize(
  kind: keyof typeof FONT_BOUNDS,
  value: number,
): number {
  const bounds = FONT_BOUNDS[kind];
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
}

export interface AutoFitInput {
  preferredQuestionPx: number;
  preferredChoicePx: number;
  autoFitEnabled: boolean;
  density: LayoutDensity;
  /** Ratio of content height to available container height (> 1 means overflow). */
  overflowRatio: number;
  currentQuestionPx: number;
  currentChoicePx: number;
}

export interface AutoFitDecision {
  nextQuestionPx: number;
  nextChoicePx: number;
  effectiveDensity: LayoutDensity;
  isOverflowing: boolean;
  needsScrollFallback: boolean;
  reachedMinimumFloor: boolean;
}

/**
 * Computes the next adaptive typography step according to the overflow priority policy:
 * 1. Reduce excess whitespace / step down layout density before aggressive font shrinkage.
 * 2. Scale down question and choice fonts proportionally while respecting independent minimums.
 * 3. If content still overflows at minimum readable bounds, activate scroll fallback + warning.
 */
export function computeAutoFitStep(input: AutoFitInput): AutoFitDecision {
  const minQ = FONT_BOUNDS.question.min;
  const minC = FONT_BOUNDS.choice.min;

  if (!input.autoFitEnabled) {
    return {
      nextQuestionPx: clampFontSize('question', input.preferredQuestionPx),
      nextChoicePx: clampFontSize('choice', input.preferredChoicePx),
      effectiveDensity: input.density,
      isOverflowing: input.overflowRatio > 1.01,
      needsScrollFallback: input.overflowRatio > 1.01,
      reachedMinimumFloor: false,
    };
  }

  if (input.overflowRatio <= 1.01) {
    return {
      nextQuestionPx: input.currentQuestionPx,
      nextChoicePx: input.currentChoicePx,
      effectiveDensity: input.density,
      isOverflowing: false,
      needsScrollFallback: false,
      reachedMinimumFloor: false,
    };
  }

  // Step 1: Tighten density first if currently spacious or balanced.
  if (input.density === 'spacious') {
    return {
      nextQuestionPx: input.currentQuestionPx,
      nextChoicePx: input.currentChoicePx,
      effectiveDensity: 'balanced',
      isOverflowing: true,
      needsScrollFallback: false,
      reachedMinimumFloor: false,
    };
  }

  if (input.density === 'balanced' && input.overflowRatio > 1.04) {
    return {
      nextQuestionPx: input.currentQuestionPx,
      nextChoicePx: input.currentChoicePx,
      effectiveDensity: 'compact',
      isOverflowing: true,
      needsScrollFallback: false,
      reachedMinimumFloor: false,
    };
  }

  // Step 2: Reduce font sizes smoothly based on overflow severity, floored at readable minimums.
  const scaleFactor = Math.max(0.84, Math.min(0.94, 1 / Math.sqrt(input.overflowRatio)));
  const candidateQ = Math.max(
    minQ,
    Math.min(input.currentQuestionPx - 2, Math.floor(input.currentQuestionPx * scaleFactor)),
  );
  const candidateC = Math.max(
    minC,
    Math.min(input.currentChoicePx - 1, Math.floor(input.currentChoicePx * scaleFactor)),
  );

  const atFloor =
    input.currentQuestionPx <= minQ && input.currentChoicePx <= minC;

  return {
    nextQuestionPx: atFloor ? minQ : candidateQ,
    nextChoicePx: atFloor ? minC : candidateC,
    effectiveDensity: 'compact',
    isOverflowing: true,
    needsScrollFallback: atFloor,
    reachedMinimumFloor: atFloor,
  };
}

/**
 * Decides whether answer choices should be rendered as a single vertical stack
 * instead of a 2-column grid to keep long choices readable without cramped wrapping.
 */
export function shouldStackChoices(
  options: readonly Pick<Option, 'text'>[],
  containerWidthPx: number,
  choiceFontPx: number,
): boolean {
  if (containerWidthPx < 780) return true;
  if (options.length <= 2 || options.length > 4) return true;

  const maxChars = options.reduce((max, o) => Math.max(max, o.text.trim().length), 0);
  const hasMultiline = options.some((o) => o.text.includes('\n'));
  if (hasMultiline) return true;

  // Estimate roughly how many characters fit comfortably in half-width column
  const halfColPx = (containerWidthPx - 64) / 2 - 96;
  const approxCharWidth = choiceFontPx * 0.54;
  const approxLines = (maxChars * approxCharWidth) / Math.max(120, halfColPx);

  return maxChars > 58 || approxLines > 2.2;
}
