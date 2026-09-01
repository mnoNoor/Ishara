import type { Category } from "@mediapipe/tasks-vision";

import type {
  HandData,
  HandLandmarks,
  HandWorldLandmarks,
  TrackedHands,
} from "../types";

interface Track {
  wrist: HandLandmarks[number] | null;
  lastSeenAt: number;
}

const TRACK_STALE_MS = 500;

/*
 * Handedness is only used as an assignment hint.
 * Spatial continuity is what keeps the hand identity stable.
 */
const HANDEDNESS_PENALTY = 0.15;

function createTrack(): Track {
  return {
    wrist: null,
    lastSeenAt: 0,
  };
}

function createTracks(): {
  left: Track;
  right: Track;
} {
  return {
    left: createTrack(),
    right: createTrack(),
  };
}

function wristOf(landmarks: HandLandmarks): HandLandmarks[number] | null {
  return landmarks[0] ?? null;
}

function positionDistance(
  a: HandLandmarks[number],
  b: HandLandmarks[number],
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFresh(track: Track, now: number): boolean {
  return track.wrist !== null && now - track.lastSeenAt <= TRACK_STALE_MS;
}

function getHandedness(categories: Category[]): "Left" | "Right" | null {
  const top = categories[0];

  if (!top) {
    return null;
  }

  if (top.categoryName === "Left") {
    return "Left";
  }

  if (top.categoryName === "Right") {
    return "Right";
  }

  return null;
}

function createHandData(
  landmarks: HandLandmarks,
  worldLandmarks: HandWorldLandmarks,
): HandData {
  return {
    landmarks,
    worldLandmarks,
  };
}

export class HandTracker {
  private tracks = createTracks();

  reset(): void {
    this.tracks = createTracks();
  }

  update(
    landmarks: HandLandmarks[],
    worldLandmarks: HandWorldLandmarks[],
    handedness: Category[][],
    now: number,
  ): TrackedHands {
    if (landmarks.length === 0) {
      return {
        left: null,
        right: null,
      };
    }

    if (landmarks.length === 1) {
      return this.assignSingleHand(landmarks, worldLandmarks, handedness, now);
    }

    return this.assignTwoHands(landmarks, worldLandmarks, handedness, now);
  }

  private assignSingleHand(
    landmarks: HandLandmarks[],
    worldLandmarks: HandWorldLandmarks[],
    handedness: Category[][],
    now: number,
  ): TrackedHands {
    const detectedHand = landmarks[0];
    const detectedWorld = worldLandmarks[0] ?? [];

    const detectedSide = getHandedness(handedness[0] ?? []);

    /*
     * When MediaPipe gives us reliable handedness,
     * use it directly. This is the strongest signal
     * when only one hand is visible.
     */
    if (detectedSide === "Left") {
      const hand = createHandData(detectedHand, detectedWorld);

      this.updateTrack(this.tracks.left, detectedHand, now);

      return {
        left: hand,
        right: null,
      };
    }

    if (detectedSide === "Right") {
      const hand = createHandData(detectedHand, detectedWorld);

      this.updateTrack(this.tracks.right, detectedHand, now);

      return {
        left: null,
        right: hand,
      };
    }

    /*
     * No reliable handedness:
     * preserve temporal continuity using wrist position.
     */
    const wrist = wristOf(detectedHand);

    if (!wrist) {
      return {
        left: null,
        right: null,
      };
    }

    const leftDistance = isFresh(this.tracks.left, now)
      ? positionDistance(wrist, this.tracks.left.wrist!)
      : Infinity;

    const rightDistance = isFresh(this.tracks.right, now)
      ? positionDistance(wrist, this.tracks.right.wrist!)
      : Infinity;

    const hand = createHandData(detectedHand, detectedWorld);

    if (leftDistance === Infinity && rightDistance === Infinity) {
      /*
       * No previous identity exists.
       * There is no information that can tell us
       * which physical hand this is, so choose left
       * as the initial slot.
       *
       * The next frame can correct this once
       * handedness or spatial continuity is available.
       */
      this.updateTrack(this.tracks.left, detectedHand, now);

      return {
        left: hand,
        right: null,
      };
    }

    if (leftDistance <= rightDistance) {
      this.updateTrack(this.tracks.left, detectedHand, now);

      return {
        left: hand,
        right: null,
      };
    }

    this.updateTrack(this.tracks.right, detectedHand, now);

    return {
      left: null,
      right: hand,
    };
  }

  private assignTwoHands(
    landmarks: HandLandmarks[],
    worldLandmarks: HandWorldLandmarks[],
    handedness: Category[][],
    now: number,
  ): TrackedHands {
    const first = landmarks[0];
    const second = landmarks[1];

    const firstWorld = worldLandmarks[0] ?? [];

    const secondWorld = worldLandmarks[1] ?? [];

    const firstSide = getHandedness(handedness[0] ?? []);

    const secondSide = getHandedness(handedness[1] ?? []);

    /*
     * If handedness clearly identifies both hands,
     * use it directly.
     */
    if (firstSide === "Left" && secondSide === "Right") {
      this.updateBothTracks(first, second, now);

      return {
        left: createHandData(first, firstWorld),
        right: createHandData(second, secondWorld),
      };
    }

    if (firstSide === "Right" && secondSide === "Left") {
      this.updateBothTracks(second, first, now);

      return {
        left: createHandData(second, secondWorld),
        right: createHandData(first, firstWorld),
      };
    }

    /*
     * Otherwise compare the two possible assignments:
     *
     * A:
     * first  -> left
     * second -> right
     *
     * B:
     * first  -> right
     * second -> left
     */
    const keepCost =
      this.assignmentCost(first, firstSide, this.tracks.left, "Left", now) +
      this.assignmentCost(second, secondSide, this.tracks.right, "Right", now);

    const swapCost =
      this.assignmentCost(first, firstSide, this.tracks.right, "Right", now) +
      this.assignmentCost(second, secondSide, this.tracks.left, "Left", now);

    if (swapCost < keepCost) {
      this.updateBothTracks(second, first, now);

      return {
        left: createHandData(second, secondWorld),
        right: createHandData(first, firstWorld),
      };
    }

    this.updateBothTracks(first, second, now);

    return {
      left: createHandData(first, firstWorld),
      right: createHandData(second, secondWorld),
    };
  }

  private assignmentCost(
    landmarks: HandLandmarks,
    detectedSide: "Left" | "Right" | null,
    track: Track,
    expectedSide: "Left" | "Right",
    now: number,
  ): number {
    const wrist = wristOf(landmarks);

    if (!wrist) {
      return Infinity;
    }

    let cost = 0;

    /*
     * Temporal/spatial continuity.
     */
    if (isFresh(track, now)) {
      cost += positionDistance(wrist, track.wrist!);
    } else {
      /*
       * Stale tracks get a neutral spatial cost.
       * Handedness can still help us initialize them.
       */
      cost += 0.5;
    }

    /*
     * Handedness is a secondary signal.
     */
    if (detectedSide !== null && detectedSide !== expectedSide) {
      cost += HANDEDNESS_PENALTY;
    }

    return cost;
  }

  private updateTrack(
    track: Track,
    landmarks: HandLandmarks,
    now: number,
  ): void {
    const wrist = wristOf(landmarks);

    if (!wrist) {
      return;
    }

    track.wrist = wrist;
    track.lastSeenAt = now;
  }

  private updateBothTracks(
    left: HandLandmarks,
    right: HandLandmarks,
    now: number,
  ): void {
    this.updateTrack(this.tracks.left, left, now);

    this.updateTrack(this.tracks.right, right, now);
  }
}
