import type { Frame } from "../db/db.types";
import { HoldDetector, type HoldSignal } from "./vision/holdDetector";
import { frameToPoseVector } from "./vision/poseVector";
import { DtwFallbackMatcher, type DtwTemplate } from "./vision/dtwMatcher";
import {
  buildDialectIndex,
  HoldBeamMatcher,
  type SegmentedTemplate,
} from "./signTrie";

const IDLE_RESET_MS = 1200;

export type LiveTranslateEvent =
  | { type: "partial"; word: string; arabicText: string; confidence: number }
  | { type: "final"; word: string; arabicText: string; confidence: number }
  | { type: "idle" };

export class LiveTranslateSession {
  private detector = new HoldDetector();
  private matcher: HoldBeamMatcher;
  private dtwMatcher: DtwFallbackMatcher;
  private lastHoldAt = 0;
  private hasPendingBeam = false;
  private segmentActive = false;

  private constructor(pool: SegmentedTemplate[], dtwTemplates: DtwTemplate[]) {
    this.matcher = new HoldBeamMatcher(pool);
    this.dtwMatcher = new DtwFallbackMatcher(dtwTemplates);
  }

  static async create(dialect: string): Promise<LiveTranslateSession> {
    const index = await buildDialectIndex(dialect);

    if (index.segmented.length === 0 && index.dtwFallback.length === 0) {
      throw new Error(
        `لا توجد بيانات تدريب كافية للهجة "${dialect}" — تحقّق من وجود عينات مسجّلة لهذه اللهجة.`,
      );
    }

    return new LiveTranslateSession(index.segmented, index.dtwFallback);
  }

  private finalizeSegment(resetDetector: boolean): LiveTranslateEvent {
    const forced =
      this.matcher.getCurrentBest() ?? this.dtwMatcher.matchBuffered();
    this.matcher.reset();
    if (resetDetector) this.detector.reset();
    this.dtwMatcher.reset();
    this.hasPendingBeam = false;
    return forced ? { type: "final", ...forced } : { type: "idle" };
  }

  pushFrame(frame: Frame, now: number): LiveTranslateEvent[] {
    const events: LiveTranslateEvent[] = [];
    const handsPresent = !!(frame.hands.left || frame.hands.right);

    if (!handsPresent) {
      if (this.segmentActive) {
        events.push(this.finalizeSegment(true));
        this.segmentActive = false;
      }
      return events;
    }

    this.segmentActive = true;

    const dtwMatch = this.dtwMatcher.pushFrame(frameToPoseVector(frame));
    if (dtwMatch && !this.hasPendingBeam) {
      events.push({ type: "final", ...dtwMatch });
      this.dtwMatcher.reset();
    }

    const signal: HoldSignal = this.detector.processFrame(frame, now);

    if (signal.type === "confirmed") {
      this.lastHoldAt = now;
      this.hasPendingBeam = true;

      const result = this.matcher.pushHold(signal.event.vector);

      if (result.status === "final" && result.best) {
        events.push({ type: "final", ...result.best });
        this.hasPendingBeam = false;
        this.dtwMatcher.reset();
      } else if (result.status === "partial" && result.best) {
        events.push({ type: "partial", ...result.best });
      } else if (result.status === "no_match") {
        this.hasPendingBeam = false;
        const fallback = this.dtwMatcher.matchBuffered();
        if (fallback) {
          events.push({ type: "final", ...fallback });
          this.dtwMatcher.reset();
        }
      }
    }

    if (this.hasPendingBeam && now - this.lastHoldAt > IDLE_RESET_MS) {
      events.push(this.finalizeSegment(false));
    }

    return events;
  }

  reset(): void {
    this.detector.reset();
    this.matcher.reset();
    this.dtwMatcher.reset();
    this.hasPendingBeam = false;
    this.segmentActive = false;
  }
}
