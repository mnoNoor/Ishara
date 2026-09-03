import type { Frame } from "../../db/db.types.js";
import { frameDistance } from "./frameDistance.js";
import { frameToPoseVector } from "./poseVector.js";

export interface HoldDetectorOptions {
  stillThreshold?: number;
  minHoldFrames?: number;
}

export interface HoldEvent {
  vector: number[];
  frameCount: number;
  timestamp: number;
}

const DEFAULT_OPTIONS: Required<HoldDetectorOptions> = {
  stillThreshold: 0.02,
  minHoldFrames: 6,
};

const REFERENCE_DT_MS = 66;
const MIN_DT_MS = 1;

export type HoldSignal =
  | { type: "confirmed"; event: HoldEvent }
  | { type: "continuing" }
  | { type: "ended" }
  | { type: "none" };

export class HoldDetector {
  private readonly opts: Required<HoldDetectorOptions>;
  private previousFrame: Frame | null = null;
  private previousTimestamp = 0;
  private stillStreak: Frame[] = [];
  private inHold = false;

  constructor(options: HoldDetectorOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  processFrame(frame: Frame, timestamp: number): HoldSignal {
    if (this.previousFrame === null) {
      this.previousFrame = frame;
      this.previousTimestamp = timestamp;
      this.stillStreak = [frame];
      return { type: "none" };
    }

    const dt = Math.max(timestamp - this.previousTimestamp, MIN_DT_MS);
    const rawChange = frameDistance(frame, this.previousFrame);
    const normalizedChange = rawChange * (REFERENCE_DT_MS / dt);
    const isStill = normalizedChange < this.opts.stillThreshold;

    this.previousFrame = frame;
    this.previousTimestamp = timestamp;

    if (isStill) {
      this.stillStreak.push(frame);

      if (!this.inHold && this.stillStreak.length >= this.opts.minHoldFrames) {
        this.inHold = true;
        const midFrame =
          this.stillStreak[Math.floor(this.stillStreak.length / 2)];
        return {
          type: "confirmed",
          event: {
            vector: frameToPoseVector(midFrame),
            frameCount: this.stillStreak.length,
            timestamp,
          },
        };
      }
      return this.inHold ? { type: "continuing" } : { type: "none" };
    }

    const wasHold = this.inHold;
    this.stillStreak = [frame];
    this.inHold = false;
    return wasHold ? { type: "ended" } : { type: "none" };
  }

  reset(): void {
    this.previousFrame = null;
    this.previousTimestamp = 0;
    this.stillStreak = [];
    this.inHold = false;
  }
}
