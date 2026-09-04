import type { Frame } from "../db/db.types.js";
import { HoldDetector, type HoldSignal } from "./vision/holdDetector.js";
import { frameToPoseVector } from "./vision/poseVector.js";
import { DtwFallbackMatcher, type DtwTemplate } from "./vision/dtwMatcher.js";
import {
  classifySingleHold,
  type SingleHoldTemplate,
} from "./vision/singleHoldMatcher.js";
import {
  buildDialectIndex,
  HoldBeamMatcher,
  type SegmentedTemplate,
} from "./signTrie.js";

const IDLE_RESET_MS = 1200;
const DUPLICATE_SUPPRESS_MS = 700;

type MatchInfo = { word: string; arabicText: string; confidence: number };

export type LiveTranslateEvent =
  | { type: "partial"; word: string; arabicText: string; confidence: number }
  | { type: "final"; word: string; arabicText: string; confidence: number }
  | { type: "idle" };

export class LiveTranslateSession {
  private detector = new HoldDetector();
  private singleHoldTemplates: SingleHoldTemplate[];
  private matcher: HoldBeamMatcher;
  private dtwMatcher: DtwFallbackMatcher;
  private lastHoldAt = 0;
  private hasPendingBeam = false;
  private segmentActive = false;
  private lastFinal: { word: string; at: number } | null = null;

  private constructor(
    singleHoldTemplates: SingleHoldTemplate[],
    beamPool: SegmentedTemplate[],
    dtwTemplates: DtwTemplate[],
  ) {
    this.singleHoldTemplates = singleHoldTemplates;
    this.matcher = new HoldBeamMatcher(beamPool);
    this.dtwMatcher = new DtwFallbackMatcher(dtwTemplates);
  }

  static async create(dialect: string): Promise<LiveTranslateSession> {
    const index = await buildDialectIndex(dialect);

    if (
      index.singleHold.length === 0 &&
      index.segmented.length === 0 &&
      index.dtwFallback.length === 0
    ) {
      throw new Error(
        `لا توجد بيانات تدريب كافية للهجة "${dialect}" — تحقّق من وجود عينات مسجّلة لهذه اللهجة.`,
      );
    }

    return new LiveTranslateSession(
      index.singleHold,
      index.segmented,
      index.dtwFallback,
    );
  }

  private finalizeSegment(resetDetector: boolean): MatchInfo | null {
    const forced =
      this.matcher.getCurrentBest() ?? this.dtwMatcher.matchBuffered();
    this.matcher.reset();
    if (resetDetector) this.detector.reset();
    this.dtwMatcher.reset();
    this.hasPendingBeam = false;
    return forced;
  }

  private emitFinal(
    events: LiveTranslateEvent[],
    result: MatchInfo,
    now: number,
  ): void {
    const isDuplicate =
      this.lastFinal !== null &&
      this.lastFinal.word === result.word &&
      now - this.lastFinal.at < DUPLICATE_SUPPRESS_MS;

    this.lastFinal = { word: result.word, at: now };

    if (isDuplicate) return;

    events.push({ type: "final", ...result });
  }

  pushFrame(frame: Frame, now: number): LiveTranslateEvent[] {
    const events: LiveTranslateEvent[] = [];
    const handsPresent = !!(frame.hands.left || frame.hands.right);

    if (!handsPresent) {
      if (this.segmentActive) {
        const forced = this.finalizeSegment(true);
        if (forced) {
          this.emitFinal(events, forced, now);
        } else {
          events.push({ type: "idle" });
        }
        this.segmentActive = false;
      }
      return events;
    }

    this.segmentActive = true;

    const dtwMatch = this.dtwMatcher.pushFrame(frameToPoseVector(frame));
    if (dtwMatch && !this.hasPendingBeam) {
      this.emitFinal(events, dtwMatch, now);
      this.dtwMatcher.reset();
    }

    const signal: HoldSignal = this.detector.processFrame(frame, now);

    if (signal.type === "confirmed") {
      this.lastHoldAt = now;

      const singleHold = classifySingleHold(
        signal.event.vector,
        this.singleHoldTemplates,
      );

      if (singleHold) {
        this.emitFinal(events, singleHold, now);
        this.dtwMatcher.reset();
      } else if (this.matcher.hasCandidates()) {
        this.hasPendingBeam = true;
        const result = this.matcher.pushHold(signal.event.vector);

        if (result.status === "final" && result.best) {
          this.emitFinal(events, result.best, now);
          this.hasPendingBeam = false;
          this.dtwMatcher.reset();
        } else if (result.status === "partial" && result.best) {
          events.push({ type: "partial", ...result.best });
        } else if (result.status === "no_match") {
          this.hasPendingBeam = false;
          const fallback = this.dtwMatcher.matchBuffered();
          if (fallback) {
            this.emitFinal(events, fallback, now);
            this.dtwMatcher.reset();
          }
        }
      }
    }

    if (this.hasPendingBeam && now - this.lastHoldAt > IDLE_RESET_MS) {
      const forced = this.finalizeSegment(false);
      if (forced) {
        this.emitFinal(events, forced, now);
      } else {
        events.push({ type: "idle" });
      }
    }

    return events;
  }

  reset(): void {
    this.detector.reset();
    this.matcher.reset();
    this.dtwMatcher.reset();
    this.hasPendingBeam = false;
    this.segmentActive = false;
    this.lastFinal = null;
  }
}
