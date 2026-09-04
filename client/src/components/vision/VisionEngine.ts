import type {
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

import {
  getFaceLandmarker,
  closeFaceLandmarker,
} from "./landmarkers/FaceLandmarker";

import {
  getHandLandmarker,
  closeHandLandmarker,
} from "./landmarkers/HandLandmarker";

import {
  getPoseLandmarker,
  closePoseLandmarker,
} from "./landmarkers/PoseLandmarker";

import { HandTracker } from "./tracking/HandTracker";
import { selectLandmarks } from "./processing/landmarkFilters";
import { FACE_LANDMARK_SUBSET } from "./processing/faceLandmarkSubset";
import { POSE_LANDMARK_SUBSET } from "./processing/poseLandmarkSubset";

import type { VisionEngineOptions, VisionFrame } from "./types";

export class VisionEngine {
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;

  private readonly handTracker = new HandTracker();

  private initialized = false;

  async initialize(options: VisionEngineOptions = {}): Promise<void> {
    if (this.initialized) {
      return;
    }

    const [handLandmarker, poseLandmarker, faceLandmarker] = await Promise.all([
      getHandLandmarker(options.hand),
      getPoseLandmarker(options.pose),
      getFaceLandmarker(options.face),
    ]);

    this.handLandmarker = handLandmarker;
    this.poseLandmarker = poseLandmarker;
    this.faceLandmarker = faceLandmarker;

    this.handTracker.reset();

    this.initialized = true;
  }

  detect(
    video: HTMLVideoElement,
    timestampMs: number,
    videoTimestamp: number,
  ): VisionFrame {
    if (
      !this.initialized ||
      !this.handLandmarker ||
      !this.poseLandmarker ||
      !this.faceLandmarker
    ) {
      throw new Error("VisionEngine is not initialized.");
    }

    const hands = this.handLandmarker.detectForVideo(video, timestampMs);

    const pose = this.poseLandmarker.detectForVideo(video, timestampMs);

    const face = this.faceLandmarker.detectForVideo(video, timestampMs);

    const trackedHands = this.handTracker.update(
      hands.landmarks,
      hands.worldLandmarks,
      hands.handedness,
      timestampMs,
    );

    return {
      timestamp: videoTimestamp,

      hands: trackedHands,

      pose:
        pose.landmarks.length > 0
          ? {
              landmarks: selectLandmarks(
                pose.landmarks[0] ?? [],
                POSE_LANDMARK_SUBSET,
              ),
              worldLandmarks: selectLandmarks(
                pose.worldLandmarks[0] ?? [],
                POSE_LANDMARK_SUBSET,
              ),
            }
          : null,

      face:
        face.faceLandmarks.length > 0
          ? {
              landmarks: selectLandmarks(
                face.faceLandmarks[0],
                FACE_LANDMARK_SUBSET,
              ),
              blendshapes: face.faceBlendshapes[0]?.categories ?? [],
            }
          : null,
    };
  }

  resetTracking(): void {
    this.handTracker.reset();
  }

  close(): void {
    closeHandLandmarker();
    closePoseLandmarker();
    closeFaceLandmarker();

    this.handLandmarker = null;
    this.poseLandmarker = null;
    this.faceLandmarker = null;

    this.handTracker.reset();

    this.initialized = false;
  }

  get ready(): boolean {
    return this.initialized;
  }
}
