import NodeCache from "node-cache";
import { eq } from "drizzle-orm";

import { db } from "../db/db.js";
import { sample, signVariants, words } from "../db/schema.js";
import type { Sequence } from "../db/db.types.js";
import { HoldDetector } from "./vision/holdDetector.js";
import { frameToPoseVector } from "./vision/poseVector.js";
import type { DtwTemplate } from "./vision/dtwMatcher.js";
import type { SingleHoldTemplate } from "./vision/singleHoldMatcher.js";
import {
  detectPeriodicMotion,
  type PeriodicMotionTemplate,
} from "./vision/periodicMotionMatcher.js";

const cache = new NodeCache({ stdTTL: 3600 });
const MIN_HOLDS_FOR_BEAM = 2;
const MAX_DTW_TEMPLATE_FRAMES = 60;

export interface SegmentedTemplate {
  variantId: number;
  word: string;
  arabicText: string;
  holds: number[][];
}

export interface DialectIndex {
  singleHold: SingleHoldTemplate[];
  segmented: SegmentedTemplate[];
  dtwFallback: DtwTemplate[];
  periodicMotion: PeriodicMotionTemplate[];
}

function segmentSequence(frames: Sequence): number[][] {
  const detector = new HoldDetector();
  const holds: number[][] = [];
  for (const frame of frames) {
    const signal = detector.processFrame(frame, frame.timestamp * 1000);
    if (signal.type === "confirmed") holds.push(signal.event.vector);
  }
  return holds;
}

function downsample<T>(items: T[], maxLen: number): T[] {
  if (items.length <= maxLen) return items;
  const stride = items.length / maxLen;
  const result: T[] = [];
  for (let i = 0; i < maxLen; i++) {
    result.push(items[Math.floor(i * stride)]);
  }
  return result;
}

export async function buildDialectIndex(
  dialect: string,
): Promise<DialectIndex> {
  const cacheKey = `holdindex_${dialect}`;
  const cached = cache.get<DialectIndex>(cacheKey);
  if (cached) return cached;

  const samples = await db
    .select({
      variantId: sample.variantId,
      landmarks: sample.landmarks,
      word: words.word,
      arabicText: words.arabicText,
    })
    .from(sample)
    .innerJoin(signVariants, eq(sample.variantId, signVariants.id))
    .innerJoin(words, eq(signVariants.signId, words.id))
    .where(eq(signVariants.dialect, dialect));

  const singleHold: SingleHoldTemplate[] = [];
  const segmented: SegmentedTemplate[] = [];
  const dtwFallback: DtwTemplate[] = [];
  const periodicMotion: PeriodicMotionTemplate[] = [];

  for (const s of samples) {
    const sequence = s.landmarks as Sequence;

    const holds = segmentSequence(sequence);
    const periodic = detectPeriodicMotion(sequence, {
      variantId: s.variantId,
      word: s.word,
      arabicText: s.arabicText,
    });

    if (periodic && holds.length < MIN_HOLDS_FOR_BEAM) {
      periodicMotion.push(periodic);
    }

    if (holds.length === 1) {
      singleHold.push({
        variantId: s.variantId,
        word: s.word,
        arabicText: s.arabicText,
        vector: holds[0],
      });
    } else if (holds.length >= MIN_HOLDS_FOR_BEAM) {
      segmented.push({
        variantId: s.variantId,
        word: s.word,
        arabicText: s.arabicText,
        holds,
      });
    } else if (holds.length === 0 && !periodic) {
      console.warn(
        `⚠️ عينة "${s.word}" (variant ${s.variantId}) ما سجّلت ولا hold ولا حركة دورية — على الأغلب تسجيل مهتز يستحق إعادة، استُخدمت كـ DTW fallback مؤقتاً.`,
      );
    }

    const vectors = downsample(
      sequence.map(frameToPoseVector),
      MAX_DTW_TEMPLATE_FRAMES,
    );
    dtwFallback.push({
      variantId: s.variantId,
      word: s.word,
      arabicText: s.arabicText,
      vectors,
    });
  }

  const index: DialectIndex = {
    singleHold,
    segmented,
    dtwFallback,
    periodicMotion,
  };
  cache.set(cacheKey, index);

  console.log(
    `🌳 فهرس "${dialect}": ${singleHold.length} حرف مفرد (single-hold)، ${segmented.length} إشارة متعددة الـ holds، ${dtwFallback.length} على مسار DTW الاحتياطي، ${periodicMotion.length} حركة دورية`,
  );

  console.log(
    "Single-hold templates:",
    singleHold.map((s) => s.word),
  );
  console.log(
    "Beam templates:",
    segmented.map((s) => `${s.word} (${s.holds.length} holds)`),
  );
  console.log(
    "DTW fallback templates:",
    dtwFallback.map((s) => `${s.word} (${s.vectors.length} frames)`),
  );
  console.log(
    "Periodic motion templates:",
    periodicMotion.map(
      (s) =>
        `${s.word} (قنوات: ${s.activeChannels.join(",")}, اتساع: ${CHANNEL_DEBUG(s)})`,
    ),
  );

  return index;
}

function CHANNEL_DEBUG(t: PeriodicMotionTemplate): string {
  return t.activeChannels
    .map((c) => `${c}=${t.amplitudeByChannel[c].toFixed(2)}`)
    .join(" ");
}

export function clearDialectIndexCache(dialect?: string): void {
  if (dialect) cache.del(`holdindex_${dialect}`);
  else cache.flushAll();
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export interface BeamMatchResult {
  best: { word: string; arabicText: string; confidence: number } | null;
  status: "partial" | "final" | "no_match";
}

export interface BeamMatcherOptions {
  maxDepth?: number;
  pruneTolerance?: number;
  absoluteMaxDistance?: number;
}

const DEFAULT_BEAM_OPTIONS: Required<BeamMatcherOptions> = {
  maxDepth: 6,
  pruneTolerance: 0.35,
  absoluteMaxDistance: 1.4,
};

export class HoldBeamMatcher {
  private readonly pool: SegmentedTemplate[];
  private readonly opts: Required<BeamMatcherOptions>;
  private alive: SegmentedTemplate[];
  private depth = 0;
  private lastBestInfo: {
    word: string;
    arabicText: string;
    confidence: number;
  } | null = null;

  constructor(pool: SegmentedTemplate[], options: BeamMatcherOptions = {}) {
    this.pool = pool;
    this.opts = { ...DEFAULT_BEAM_OPTIONS, ...options };
    this.alive = pool;
  }

  hasCandidates(): boolean {
    return this.alive.length > 0;
  }

  reset(): void {
    this.alive = this.pool;
    this.depth = 0;
    this.lastBestInfo = null;
  }

  getCurrentBest() {
    return this.lastBestInfo;
  }

  getDepth(): number {
    return this.depth;
  }

  hasCompleteCandidate(): boolean {
    return this.alive.some((c) => c.holds.length === this.depth);
  }

  pushHold(vector: number[]): BeamMatchResult {
    const scored = this.alive
      .filter((c) => c.holds.length > this.depth)
      .map((c) => ({
        candidate: c,
        distance: euclideanDistance(vector, c.holds[this.depth]),
      }))
      .filter((s) => s.distance <= this.opts.absoluteMaxDistance);

    if (scored.length === 0) {
      this.alive = [];
      return { best: this.lastBestInfo, status: "no_match" };
    }

    scored.sort((a, b) => a.distance - b.distance);
    const bestDistance = scored[0].distance;
    const survivors = scored.filter(
      (s) => s.distance <= bestDistance * (1 + this.opts.pruneTolerance),
    );

    this.alive = survivors.map((s) => s.candidate);
    this.depth += 1;

    const confidence = Math.max(
      0,
      1 - bestDistance / this.opts.absoluteMaxDistance,
    );
    const bestCandidate = scored[0].candidate;
    const bestInfo = {
      word: bestCandidate.word,
      arabicText: bestCandidate.arabicText,
      confidence,
    };
    this.lastBestInfo = bestInfo;

    const complete = this.alive.filter((c) => c.holds.length === this.depth);
    const stillLonger = this.alive.filter((c) => c.holds.length > this.depth);

    if (complete.length === 1 && stillLonger.length === 0) {
      return { best: bestInfo, status: "final" };
    }

    if (this.depth >= this.opts.maxDepth) {
      return { best: bestInfo, status: "final" };
    }

    return { best: bestInfo, status: "partial" };
  }
}
