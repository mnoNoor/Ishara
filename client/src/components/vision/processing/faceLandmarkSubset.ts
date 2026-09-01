import { FaceLandmarker } from "@mediapipe/tasks-vision";

function indicesFromConnections(
  connections: { start: number; end: number }[],
): number[] {
  const set = new Set<number>();
  for (const { start, end } of connections) {
    set.add(start);
    set.add(end);
  }
  return [...set];
}

const MOUTH_LANDMARK_RAW_INDEX = 13; // the lower tip of the upper lip
const NOSE_LANDMARK_RAW_INDEX = 4; // the tip of the nose

const restLandmarkIndices = indicesFromConnections([
  ...FaceLandmarker.FACE_LANDMARKS_LIPS,
  ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
  ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
  ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
  ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
  ...FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
]).filter(
  (index) =>
    index !== MOUTH_LANDMARK_RAW_INDEX && index !== NOSE_LANDMARK_RAW_INDEX,
);

export const FACE_LANDMARK_SUBSET = [
  MOUTH_LANDMARK_RAW_INDEX,
  NOSE_LANDMARK_RAW_INDEX,
  ...restLandmarkIndices,
];
