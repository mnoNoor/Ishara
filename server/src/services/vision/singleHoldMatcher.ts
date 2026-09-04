export interface SingleHoldTemplate {
  variantId: number;
  word: string;
  arabicText: string;
  vector: number[];
}

export interface SingleHoldMatchResult {
  word: string;
  arabicText: string;
  confidence: number;
}

export interface SingleHoldMatcherOptions {
  maxDistance?: number;
  minMargin?: number;
}

const DEFAULT_OPTIONS: Required<SingleHoldMatcherOptions> = {
  maxDistance: 1.0,
  minMargin: 0.12,
};

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function classifySingleHold(
  vector: number[],
  templates: SingleHoldTemplate[],
  options: SingleHoldMatcherOptions = {},
): SingleHoldMatchResult | null {
  if (templates.length === 0) return null;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const scored = templates
    .map((t) => ({
      template: t,
      distance: euclideanDistance(vector, t.vector),
    }))
    .sort((a, b) => a.distance - b.distance);

  const best = scored[0];
  if (best.distance > opts.maxDistance) return null;

  const second = scored[1];
  if (second && second.distance - best.distance < opts.minMargin) {
    return null;
  }

  return {
    word: best.template.word,
    arabicText: best.template.arabicText,
    confidence: Math.max(0, 1 - best.distance / opts.maxDistance),
  };
}
