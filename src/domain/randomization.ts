import { Quiz } from './types';

export const RANDOMIZATION_ALGORITHM = 'fisher-yates-mulberry32-v1';

/**
 * Deterministic 128-bit string hash (cyrb128) feeding Mulberry32 PRNG.
 */
export function createSeededRng(seed: string): () => number {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  let state = (h1 ^ h2 ^ h3 ^ h4) >>> 0;

  return function nextRandom(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCryptoOrMathRng(): () => number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return () => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    };
  }
  return () => Math.random();
}

/**
 * Unbiased Fisher-Yates shuffle. Returns a new array without mutating input.
 */
export function fisherYatesShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

export interface RandomizationConfig {
  randomizeQuestions: boolean;
  randomizeChoices: boolean;
  randomizeWithinSections?: boolean;
  seed?: string | null;
}

export interface GeneratedSessionOrders {
  question_order: string[];
  option_orders: Record<string, string[]>;
  seed_used: string | null;
  algorithm: string;
}

/**
 * Generates session-level question and option ID orders without mutating the canonical quiz.
 * Correct answers remain bound to stable option IDs on the canonical question objects.
 */
export function generateSessionOrders(
  quiz: Quiz,
  config: RandomizationConfig,
): GeneratedSessionOrders {
  const trimmedSeed = config.seed ? config.seed.trim() : '';
  const needsRandom = config.randomizeQuestions || config.randomizeChoices;
  const seedUsed = needsRandom ? trimmedSeed || null : null;
  const rng = seedUsed ? createSeededRng(seedUsed) : createCryptoOrMathRng();

  let questionOrder: string[];

  if (!config.randomizeQuestions) {
    questionOrder = quiz.questions.map((q) => q.id);
  } else if (config.randomizeWithinSections) {
    // Group questions by section in order of first appearance, shuffle within each section
    const sectionOrder: string[] = [];
    const bySection = new Map<string, string[]>();
    for (const q of quiz.questions) {
      const key = (q.section || '').trim();
      if (!bySection.has(key)) {
        sectionOrder.push(key);
        bySection.set(key, []);
      }
      bySection.get(key)!.push(q.id);
    }
    questionOrder = [];
    for (const sec of sectionOrder) {
      const ids = bySection.get(sec)!;
      questionOrder.push(...fisherYatesShuffle(ids, rng));
    }
  } else {
    questionOrder = fisherYatesShuffle(
      quiz.questions.map((q) => q.id),
      rng,
    );
  }

  const optionOrders: Record<string, string[]> = {};
  for (const q of quiz.questions) {
    const activeOptionIds = q.options
      .filter((o) => o.text.trim().length > 0)
      .map((o) => o.id);
    optionOrders[q.id] = config.randomizeChoices
      ? fisherYatesShuffle(activeOptionIds, rng)
      : activeOptionIds;
  }

  return {
    question_order: questionOrder,
    option_orders: optionOrders,
    seed_used: seedUsed,
    algorithm: RANDOMIZATION_ALGORITHM,
  };
}
