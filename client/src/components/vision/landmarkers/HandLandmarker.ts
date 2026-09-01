import {
  HandLandmarker as MediaPipeHandLandmarker,
  type HandLandmarkerOptions,
} from "@mediapipe/tasks-vision";

import { getVisionFileset } from "../VisionFileset";

let instancePromise: Promise<MediaPipeHandLandmarker> | null = null;

export interface CreateHandLandmarkerOptions {
  numHands?: number;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
}

async function createHandLandmarker(
  options: CreateHandLandmarkerOptions,
): Promise<MediaPipeHandLandmarker> {
  const vision = await getVisionFileset();

  const config: HandLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: "/mediapipe/models/hand_landmarker.task",
      delegate: "GPU",
    },

    runningMode: "VIDEO",

    numHands: options.numHands ?? 2,

    minHandDetectionConfidence: options.minDetectionConfidence ?? 0.6,
    minHandPresenceConfidence: options.minPresenceConfidence ?? 0.6,
    minTrackingConfidence: options.minTrackingConfidence ?? 0.6,
  };

  return MediaPipeHandLandmarker.createFromOptions(vision, config);
}

export function getHandLandmarker(
  options: CreateHandLandmarkerOptions = {},
): Promise<MediaPipeHandLandmarker> {
  if (!instancePromise) {
    instancePromise = createHandLandmarker(options).catch((error) => {
      instancePromise = null;
      throw error;
    });
  }

  return instancePromise;
}

export function closeHandLandmarker(): void {
  instancePromise
    ?.then((instance) => instance.close())
    .catch(() => {
      // Ignore errors during close; we just want to clean up.
    });
  instancePromise = null;
}
