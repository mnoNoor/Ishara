import type { Frame } from "../db/db.types.js";
import { HoldDetector, type HoldSignal } from "./vision/holdDetector.js";
import { frameToPoseVector } from "./vision/poseVector.js";
import { DtwFallbackMatcher, type DtwTemplate } from "./vision/dtwMatcher.js";
import {
  classifySingleHold,
  type SingleHoldTemplate,
} from "./vision/singleHoldMatcher.js";
import {
  PeriodicMotionMatcher,
  type PeriodicMatchResult,
} from "./vision/periodicMotionMatcher.js";
import {
  buildDialectIndex,
  HoldBeamMatcher,
  type SegmentedTemplate,
} from "./signTrie.js";

const WORD_END_STILL_MS = 800;
const DUPLICATE_SUPPRESS_MS = 1200;

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
  private periodicMatcher: PeriodicMotionMatcher;
  private pendingSingleHold: MatchInfo | null = null;
  private periodicPending: MatchInfo | null = null;
  private lastMotionAt = 0;
  private awaitMotion = false;
  private segmentActive = false;
  private lastFinal: { word: string; at: number } | null = null;

  private constructor(
    singleHoldTemplates: SingleHoldTemplate[],
    beamPool: SegmentedTemplate[],
    dtwTemplates: DtwTemplate[],
    periodicMatcher: PeriodicMotionMatcher,
  ) {
    this.singleHoldTemplates = singleHoldTemplates;
    this.matcher = new HoldBeamMatcher(beamPool);
    this.dtwMatcher = new DtwFallbackMatcher(dtwTemplates);
    this.periodicMatcher = periodicMatcher;
  }

  static async create(dialect: string): Promise<LiveTranslateSession> {
    const index = await buildDialectIndex(dialect);

    if (
      index.singleHold.length === 0 &&
      index.segmented.length === 0 &&
      index.dtwFallback.length === 0 &&
      index.periodicMotion.length === 0
    ) {
      throw new Error(
        `لا توجد بيانات تدريب كافية للهجة "${dialect}" — تحقّق من وجود عينات مسجّلة لهذه اللهجة.`,
      );
    }

    return new LiveTranslateSession(
      index.singleHold,
      index.segmented,
      index.dtwFallback,
      new PeriodicMotionMatcher(index.periodicMotion),
    );
  }

  private pickResult(): MatchInfo | null {
    const depth = this.matcher.getDepth();
    const beamBest = this.matcher.getCurrentBest();
    const complete = this.matcher.hasCompleteCandidate();

    if (this.periodicPending && depth < 2) {
      return this.periodicPending;
    }
    if ((depth >= 2 || complete) && beamBest) {
      return beamBest;
    }
    if (this.pendingSingleHold) {
      return this.pendingSingleHold;
    }
    return this.dtwMatcher.matchBuffered();
  }

  private hasPendingInterpretation(): boolean {
    return (
      this.periodicPending !== null ||
      this.pendingSingleHold !== null ||
      this.matcher.getDepth() > 0 ||
      this.dtwMatcher.hasQuery()
    );
  }

  private resetSegmentState(resetDetector: boolean): void {
    this.matcher.reset();
    if (resetDetector) this.detector.reset();
    this.dtwMatcher.reset();
    this.periodicMatcher.reset();
    this.pendingSingleHold = null;
    this.periodicPending = null;
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

  private commitWord(
    events: LiveTranslateEvent[],
    now: number,
    resetDetector: boolean,
  ): void {
    const result = this.pickResult();
    this.resetSegmentState(resetDetector);
    this.lastMotionAt = now;
    this.awaitMotion = true;

    if (result) {
      this.emitFinal(events, result, now);
    } else {
      events.push({ type: "idle" });
    }
  }

  private handleConfirmedHold(
    vector: number[],
    events: LiveTranslateEvent[],
    now: number,
    isRetry = false,
  ): void {
    const singleHold = classifySingleHold(vector, this.singleHoldTemplates);

    if (this.matcher.hasCandidates()) {
      const result = this.matcher.pushHold(vector);

      if (result.status === "no_match") {
        const canClosePrevious =
          this.matcher.getDepth() > 0 ||
          this.pendingSingleHold !== null ||
          this.periodicPending !== null;
        if (!isRetry && canClosePrevious) {
          this.commitWord(events, now, true);
          this.segmentActive = true;
          this.awaitMotion = false;
          this.handleConfirmedHold(vector, events, now, true);
          return;
        }
        this.matcher.reset();
        if (singleHold) {
          this.pendingSingleHold = singleHold;
          events.push({ type: "partial", ...singleHold });
        }
        return;
      }

      const depth = this.matcher.getDepth();
      this.pendingSingleHold = depth >= 2 ? null : singleHold;

      const preview =
        depth >= 2 || result.status === "final"
          ? result.best
          : (singleHold ?? result.best);
      if (preview) {
        events.push({ type: "partial", ...preview });
      }
      return;
    }

    if (singleHold) {
      this.pendingSingleHold = singleHold;
      events.push({ type: "partial", ...singleHold });
    }
  }

  pushFrame(frame: Frame, now: number): LiveTranslateEvent[] {
    const events: LiveTranslateEvent[] = [];
    const handsPresent = !!(frame.hands.left || frame.hands.right);

    if (!handsPresent) {
      if (this.segmentActive) {
        this.commitWord(events, now, true);
        this.segmentActive = false;
      }
      this.periodicMatcher.reset();
      return events;
    }

    if (!this.segmentActive) {
      this.lastMotionAt = now;
      this.awaitMotion = false;
    }
    this.segmentActive = true;

    const periodicHit: PeriodicMatchResult | null =
      this.periodicMatcher.pushFrame(frame);
    const periodicBusy = this.periodicMatcher.isMotionActive();

    if (periodicHit) {
      this.periodicPending = periodicHit;
      events.push({ type: "partial", ...periodicHit });
    }

    const signal: HoldSignal = this.detector.processFrame(frame, now);
    if (signal.type === "moving" || signal.type === "ended") {
      this.lastMotionAt = now;
      this.awaitMotion = false;
    }
    if (signal.type === "confirmed") {
      this.lastMotionAt = now;
    }
    if (periodicBusy) {
      this.lastMotionAt = now;
      this.awaitMotion = false;
    }

    // temporary debug logging
    console.log("[live-debug]", {
      signal: signal.type,
      awaitMotion: this.awaitMotion,
      depth: this.matcher.getDepth(),
      periodicBusy,
      handsPresent,
      segmentActive: this.segmentActive,
    });

    if (!this.awaitMotion) {
      this.dtwMatcher.pushFrame(frameToPoseVector(frame));
    }

    if (!periodicBusy && !this.awaitMotion && signal.type === "confirmed") {
      this.handleConfirmedHold(signal.event.vector, events, now);
    }

    if (
      this.segmentActive &&
      !periodicBusy &&
      !this.awaitMotion &&
      now - this.lastMotionAt >= WORD_END_STILL_MS &&
      this.hasPendingInterpretation()
    ) {
      this.commitWord(events, now, true);
    }

    return events;
  }

  reset(): void {
    this.resetSegmentState(true);
    this.segmentActive = false;
    this.awaitMotion = false;
    this.lastFinal = null;
    this.lastMotionAt = 0;
  }
}
