import {
  PoseLandmarker as MediaPipePoseLandmarker,
  type PoseLandmarkerOptions,
} from "@mediapipe/tasks-vision";

import { getVisionFileset } from "../VisionFileset";

let instancePromise: Promise<MediaPipePoseLandmarker> | null = null;

export interface CreatePoseLandmarkerOptions {
  numPoses?: number;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
}

async function createPoseLandmarker(
  options: CreatePoseLandmarkerOptions,
): Promise<MediaPipePoseLandmarker> {
  const vision = await getVisionFileset();

  const config: PoseLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: "/mediapipe/models/pose_landmarker_lite.task",
      delegate: "GPU",
    },

    runningMode: "VIDEO",

    numPoses: options.numPoses ?? 1,

    minPoseDetectionConfidence: options.minDetectionConfidence ?? 0.6,

    minPosePresenceConfidence: options.minPresenceConfidence ?? 0.6,

    minTrackingConfidence: options.minTrackingConfidence ?? 0.6,

    outputSegmentationMasks: false,
  };

  return MediaPipePoseLandmarker.createFromOptions(vision, config);
}

export function getPoseLandmarker(
  options: CreatePoseLandmarkerOptions = {},
): Promise<MediaPipePoseLandmarker> {
  if (!instancePromise) {
    instancePromise = createPoseLandmarker(options).catch((error) => {
      instancePromise = null;
      throw error;
    });
  }

  return instancePromise;
}

export function closePoseLandmarker(): void {
  instancePromise
    ?.then((instance) => instance.close())
    .catch(() => {
      // Ignore errors during close; we just want to clean up.
    });
  instancePromise = null;
}
