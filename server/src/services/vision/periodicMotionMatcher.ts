import type { Frame } from "../../db/db.types.js";
import {
  minAmplitudeFor,
  MOTION_CHANNELS,
  motionFeatures,
  type MotionChannel,
} from "./handMotionProfile.js";
import { analyzeOscillation } from "./oscillation.js";

const MIN_PROMINENCE = 0.12;
const MIN_EXTREMA_FOR_PERIODIC = 2;
const LIVE_WINDOW_FRAMES = 60;
const EVALUATE_EVERY_N_FRAMES = 5;

export interface PeriodicMotionTemplate {
  variantId: number;
  word: string;
  arabicText: string;
  activeChannels: MotionChannel[];
  amplitudeByChannel: Record<MotionChannel, number>;
}

export interface PeriodicMatchResult {
  word: string;
  arabicText: string;
  confidence: number;
}

function emptyBuffer(): Record<MotionChannel, number[]> {
  return {
    thumb: [],
    index: [],
    middle: [],
    ring: [],
    pinky: [],
    wristX: [],
    wristY: [],
    indexTipY: [],
  };
}

function extractSeries(frames: Frame[]): Record<MotionChannel, number[]> {
  const series = emptyBuffer();
  for (const frame of frames) {
    const features = motionFeatures(frame);
    if (!features) continue;
    for (const channel of MOTION_CHANNELS) {
      series[channel].push(features[channel]);
    }
  }
  return series;
}

function evaluateSeries(series: Record<MotionChannel, number[]>): {
  active: Set<MotionChannel>;
  amplitude: Record<MotionChannel, number>;
} {
  const active = new Set<MotionChannel>();
  const amplitude = {} as Record<MotionChannel, number>;

  for (const channel of MOTION_CHANNELS) {
    const { amplitude: amp, extremaCount } = analyzeOscillation(
      series[channel],
      MIN_PROMINENCE,
    );
    amplitude[channel] = amp;
    if (
      amp >= minAmplitudeFor(channel) &&
      extremaCount >= MIN_EXTREMA_FOR_PERIODIC
    ) {
      active.add(channel);
    }
  }
  return { active, amplitude };
}

export function detectPeriodicMotion(
  frames: Frame[],
  context: { variantId: number; word: string; arabicText: string },
): PeriodicMotionTemplate | null {
  const { active, amplitude } = evaluateSeries(extractSeries(frames));
  if (active.size === 0) return null;

  return {
    variantId: context.variantId,
    word: context.word,
    arabicText: context.arabicText,
    activeChannels: [...active],
    amplitudeByChannel: amplitude,
  };
}

export class PeriodicMotionMatcher {
  private readonly templates: PeriodicMotionTemplate[];
  private buffer = emptyBuffer();
  private framesSinceEval = 0;
  private motionActive = false;

  constructor(templates: PeriodicMotionTemplate[]) {
    this.templates = templates;
  }

  hasCandidates(): boolean {
    return this.templates.length > 0;
  }

  isMotionActive(): boolean {
    return this.motionActive;
  }

  pushFrame(frame: Frame): PeriodicMatchResult | null {
    this.pushInto(frame);

    this.framesSinceEval += 1;
    if (this.framesSinceEval < EVALUATE_EVERY_N_FRAMES) return null;
    this.framesSinceEval = 0;

    const evaluated = evaluateSeries(this.buffer);
    this.motionActive = evaluated.active.size > 0;

    if (this.templates.length === 0) return null;
    return this.matchEvaluated(evaluated);
  }

  private pushInto(frame: Frame): void {
    const features = motionFeatures(frame);
    for (const channel of MOTION_CHANNELS) {
      const arr = this.buffer[channel];
      arr.push(features ? features[channel] : (arr[arr.length - 1] ?? 0));
      if (arr.length > LIVE_WINDOW_FRAMES) arr.shift();
    }
  }

  private matchEvaluated(evaluated: {
    active: Set<MotionChannel>;
    amplitude: Record<MotionChannel, number>;
  }): PeriodicMatchResult | null {
    if (evaluated.active.size === 0) return null;

    let best: { template: PeriodicMotionTemplate; score: number } | null = null;

    for (const template of this.templates) {
      const templateSet = new Set(template.activeChannels);
      const intersection = [...templateSet].filter((c) =>
        evaluated.active.has(c),
      ).length;
      const union = new Set([...templateSet, ...evaluated.active]).size;
      const overlap = union === 0 ? 0 : intersection / union;

      if (overlap < 0.5) continue;

      const amplitudeScore = this.amplitudeSimilarity(
        template.amplitudeByChannel,
        evaluated.amplitude,
      );
      const score = overlap * 0.5 + amplitudeScore * 0.5;

      if (!best || score > best.score) best = { template, score };
    }

    if (!best) return null;

    return {
      word: best.template.word,
      arabicText: best.template.arabicText,
      confidence: Math.max(0, Math.min(1, best.score)),
    };
  }

  private amplitudeSimilarity(
    templateAmp: Record<MotionChannel, number>,
    liveAmp: Record<MotionChannel, number>,
  ): number {
    let diff = 0;
    for (const channel of MOTION_CHANNELS) {
      diff += Math.abs(templateAmp[channel] - liveAmp[channel]);
    }
    return 1 - Math.min(1, diff / (MOTION_CHANNELS.length * 1.5));
  }

  reset(): void {
    this.buffer = emptyBuffer();
    this.framesSinceEval = 0;
    this.motionActive = false;
  }
}
