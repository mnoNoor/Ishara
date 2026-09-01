export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
};

export type HandData = {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
};

export type FaceBlendshape = {
  categoryName: string;
  score: number;
};

export type Frame = {
  timestamp: number;

  hands: {
    left: HandData | null;
    right: HandData | null;
  };

  pose: {
    landmarks: Landmark[];
    worldLandmarks: Landmark[];
  } | null;

  face: {
    landmarks: Landmark[];
    blendshapes: FaceBlendshape[];
  } | null;
};

export type Sequence = Frame[];
