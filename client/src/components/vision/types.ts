export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark[];
export type HandWorldLandmarks = Landmark[];
export type PoseLandmarks = Landmark[];
export type FaceLandmarks = Landmark[];

export interface HandData {
  landmarks: HandLandmarks;
  worldLandmarks: HandWorldLandmarks;
}

export interface TrackedHands {
  left: HandData | null;
  right: HandData | null;
}

export interface PoseData {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
}

export interface FaceBlendshape {
  categoryName: string;
  score: number;
}

export interface FaceData {
  landmarks: Landmark[];
  blendshapes: FaceBlendshape[];
}

export interface VisionFrame {
  timestamp: number;

  hands: TrackedHands;

  pose: PoseData | null;

  face: FaceData | null;
}

export type RecordedFrame = VisionFrame;

export type Sequence = RecordedFrame[];

export interface VisionEngineOptions {
  hand?: {
    numHands?: number;
    minDetectionConfidence?: number;
    minPresenceConfidence?: number;
    minTrackingConfidence?: number;
  };

  pose?: {
    numPoses?: number;
    minDetectionConfidence?: number;
    minPresenceConfidence?: number;
    minTrackingConfidence?: number;
  };

  face?: {
    numFaces?: number;
    minDetectionConfidence?: number;
    minPresenceConfidence?: number;
    minTrackingConfidence?: number;
    outputBlendshapes?: boolean;
  };
}
