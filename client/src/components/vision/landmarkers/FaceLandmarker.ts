import {
  FaceLandmarker as MediaPipeFaceLandmarker,
  type FaceLandmarkerOptions,
} from "@mediapipe/tasks-vision";

import { getVisionFileset } from "../VisionFileset";

let instancePromise: Promise<MediaPipeFaceLandmarker> | null = null;

export interface CreateFaceLandmarkerOptions {
  numFaces?: number;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
  outputBlendshapes?: boolean;
}

async function createFaceLandmarker(
  options: CreateFaceLandmarkerOptions,
): Promise<MediaPipeFaceLandmarker> {
  const vision = await getVisionFileset();

  const config: FaceLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: "/mediapipe/models/face_landmarker.task",
      delegate: "GPU",
    },

    runningMode: "VIDEO",

    numFaces: options.numFaces ?? 1,

    minFaceDetectionConfidence: options.minDetectionConfidence ?? 0.6,

    minFacePresenceConfidence: options.minPresenceConfidence ?? 0.6,

    minTrackingConfidence: options.minTrackingConfidence ?? 0.6,

    outputFaceBlendshapes: options.outputBlendshapes ?? true,

    outputFacialTransformationMatrixes: false,
  };

  return MediaPipeFaceLandmarker.createFromOptions(vision, config);
}

export function getFaceLandmarker(
  options: CreateFaceLandmarkerOptions = {},
): Promise<MediaPipeFaceLandmarker> {
  if (!instancePromise) {
    instancePromise = createFaceLandmarker(options).catch((error) => {
      instancePromise = null;
      throw error;
    });
  }

  return instancePromise;
}

export function closeFaceLandmarker(): void {
  instancePromise
    ?.then((instance) => instance.close())
    .catch(() => {
      // Ignore errors during close; we just want to clean up.
    });
  instancePromise = null;
}
