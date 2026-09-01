function pointDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function dtwDistance(
  query: number[][],
  template: number[][],
  radius: number,
): number {
  const n = query.length;
  const m = template.length;
  if (n === 0 || m === 0) return Infinity;

  const band = Math.max(radius, Math.abs(n - m) + 1);

  let prev = new Array(m + 1).fill(Infinity);
  let curr = new Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(Infinity);
    const jStart = Math.max(1, i - band);
    const jEnd = Math.min(m, i + band);
    for (let j = jStart; j <= jEnd; j++) {
      const cost = pointDistance(query[i - 1], template[j - 1]);
      const best = Math.min(prev[j], curr[j - 1], prev[j - 1]);
      curr[j] = cost + best;
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

export interface DtwTemplate {
  variantId: number;
  word: string;
  arabicText: string;
  vectors: number[][];
}

export interface DtwMatchResult {
  word: string;
  arabicText: string;
  confidence: number;
}

export interface DtwMatcherOptions {
  maxNormalizedDistance?: number;
  bandRadius?: number;
  minQueryFrames?: number;
  evaluateEveryNFrames?: number;
}

const DEFAULT_DTW_OPTIONS: Required<DtwMatcherOptions> = {
  maxNormalizedDistance: 1.2,
  bandRadius: 15,
  minQueryFrames: 8,
  evaluateEveryNFrames: 5,
};

export class DtwFallbackMatcher {
  private readonly templates: DtwTemplate[];
  private readonly opts: Required<DtwMatcherOptions>;
  private readonly maxBufferLen: number;
  private buffer: number[][] = [];
  private framesSinceEval = 0;

  constructor(templates: DtwTemplate[], options: DtwMatcherOptions = {}) {
    this.templates = templates;
    this.opts = { ...DEFAULT_DTW_OPTIONS, ...options };
    const longestTemplate = templates.reduce(
      (max, t) => Math.max(max, t.vectors.length),
      1,
    );
    this.maxBufferLen = longestTemplate * 2;
  }

  pushFrame(vector: number[]): DtwMatchResult | null {
    this.buffer.push(vector);
    if (this.buffer.length > this.maxBufferLen) {
      this.buffer.shift();
    }

    this.framesSinceEval += 1;
    if (this.framesSinceEval < this.opts.evaluateEveryNFrames) {
      return null;
    }
    this.framesSinceEval = 0;

    return this.matchBuffered();
  }

  matchBuffered(): DtwMatchResult | null {
    if (
      this.buffer.length < this.opts.minQueryFrames ||
      this.templates.length === 0
    ) {
      return null;
    }

    let best: { template: DtwTemplate; normalizedDistance: number } | null =
      null;

    for (const template of this.templates) {
      const distance = dtwDistance(
        this.buffer,
        template.vectors,
        this.opts.bandRadius,
      );
      const normalizedDistance =
        distance / Math.max(this.buffer.length, template.vectors.length);
      if (!best || normalizedDistance < best.normalizedDistance) {
        best = { template, normalizedDistance };
      }
    }

    if (!best || best.normalizedDistance > this.opts.maxNormalizedDistance) {
      return null;
    }

    const confidence = Math.max(
      0,
      1 - best.normalizedDistance / this.opts.maxNormalizedDistance,
    );

    return {
      word: best.template.word,
      arabicText: best.template.arabicText,
      confidence,
    };
  }

  reset(): void {
    this.buffer = [];
    this.framesSinceEval = 0;
  }
}
