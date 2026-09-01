import type { Landmark, RecordedFrame, Sequence, VisionFrame } from "../types";
import {
  cloneLandmarks,
  cloneWorldLandmarks,
} from "../processing/landmarkFilters";

const DEFAULT_CHANGE_THRESHOLD = 0.015;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 150;

const HAND_WEIGHT = 0.65;
const POSE_WEIGHT = 0.15;
const FACE_WEIGHT = 0.2;

type LandmarkSet = Landmark[];

export interface FrameRecorderOptions {
  changeThreshold?: number;
  heartbeatIntervalMs?: number;
}

function cloneFrame(frame: VisionFrame): RecordedFrame {
  return {
    timestamp: frame.timestamp,

    hands: {
      left: frame.hands.left
        ? {
            landmarks: cloneLandmarks(frame.hands.left.landmarks as any),
            worldLandmarks: cloneWorldLandmarks(
              frame.hands.left.worldLandmarks as any,
            ),
          }
        : null,

      right: frame.hands.right
        ? {
            landmarks: cloneLandmarks(frame.hands.right.landmarks as any),
            worldLandmarks: cloneWorldLandmarks(
              frame.hands.right.worldLandmarks as any,
            ),
          }
        : null,
    },

    pose: frame.pose
      ? {
          landmarks: cloneLandmarks(frame.pose.landmarks as any),
          worldLandmarks: cloneWorldLandmarks(frame.pose.worldLandmarks as any),
        }
      : null,

    face: frame.face
      ? {
          landmarks: cloneLandmarks(frame.face.landmarks as any),
          blendshapes: frame.face.blendshapes.map((blendshape) => ({
            ...blendshape,
          })),
        }
      : null,
  };
}

function landmarkDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function averageLandmarkDistance(
  current: LandmarkSet,
  previous: LandmarkSet,
): number | null {
  if (current.length === 0 || previous.length === 0) {
    return null;
  }

  if (current.length !== previous.length) {
    return Infinity;
  }

  let totalDistance = 0;

  for (let i = 0; i < current.length; i++) {
    totalDistance += landmarkDistance(current[i], previous[i]);
  }

  return totalDistance / current.length;
}

interface ModalChange {
  distance: number;
  available: boolean;
}

function calculateModalChange(
  current: LandmarkSet | null,
  previous: LandmarkSet | null,
): ModalChange {
  const currentPresent = current !== null;
  const previousPresent = previous !== null;

  if (currentPresent !== previousPresent) {
    return {
      distance: Infinity,
      available: true,
    };
  }

  if (!currentPresent || !previousPresent) {
    return {
      distance: 0,
      available: false,
    };
  }

  const distance = averageLandmarkDistance(current, previous);

  if (distance === null) {
    return {
      distance: 0,
      available: false,
    };
  }

  return {
    distance,
    available: true,
  };
}

function calculateFrameChange(
  current: VisionFrame,
  previous: VisionFrame,
): number {
  const leftHand = calculateModalChange(
    current.hands.left?.landmarks ?? null,
    previous.hands.left?.landmarks ?? null,
  );

  const rightHand = calculateModalChange(
    current.hands.right?.landmarks ?? null,
    previous.hands.right?.landmarks ?? null,
  );

  const pose = calculateModalChange(
    current.pose?.landmarks ?? null,
    previous.pose?.landmarks ?? null,
  );

  const face = calculateModalChange(
    current.face?.landmarks ?? null,
    previous.face?.landmarks ?? null,
  );

  let weightedDistance = 0;
  let totalWeight = 0;

  if (leftHand.available) {
    weightedDistance += leftHand.distance * (HAND_WEIGHT / 2);

    totalWeight += HAND_WEIGHT / 2;
  }

  if (rightHand.available) {
    weightedDistance += rightHand.distance * (HAND_WEIGHT / 2);

    totalWeight += HAND_WEIGHT / 2;
  }

  if (pose.available) {
    weightedDistance += pose.distance * POSE_WEIGHT;

    totalWeight += POSE_WEIGHT;
  }

  if (face.available) {
    weightedDistance += face.distance * FACE_WEIGHT;

    totalWeight += FACE_WEIGHT;
  }

  if (totalWeight === 0) {
    return Infinity;
  }

  return weightedDistance / totalWeight;
}

export class FrameRecorder {
  private readonly changeThreshold: number;

  private readonly heartbeatIntervalMs: number;

  private frames: RecordedFrame[] = [];

  private recording = false;

  private previousFrame: VisionFrame | null = null;

  private lastRecordedAt = 0;

  constructor(options: FrameRecorderOptions = {}) {
    this.changeThreshold = options.changeThreshold ?? DEFAULT_CHANGE_THRESHOLD;

    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
  }

  start(): void {
    this.frames = [];
    this.previousFrame = null;
    this.lastRecordedAt = 0;
    this.recording = true;
  }

  stop(): void {
    this.recording = false;
  }

  reset(): void {
    this.frames = [];
    this.previousFrame = null;
    this.lastRecordedAt = 0;
    this.recording = false;
  }

  addFrame(frame: VisionFrame, now: number): boolean {
    if (!this.recording) {
      return false;
    }

    const changed =
      this.previousFrame === null ||
      calculateFrameChange(frame, this.previousFrame) > this.changeThreshold;

    const heartbeatDue = now - this.lastRecordedAt >= this.heartbeatIntervalMs;

    if (!changed && !heartbeatDue) {
      return false;
    }

    this.frames.push(cloneFrame(frame));

    this.previousFrame = frame;
    this.lastRecordedAt = now;

    return true;
  }

  getFrames(): Sequence {
    return [...this.frames];
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  get isRecording(): boolean {
    return this.recording;
  }
}
