import type { Landmark, NormalizedLandmark } from "@mediapipe/tasks-vision";

export function cloneLandmarks(
  landmarks: NormalizedLandmark[],
): NormalizedLandmark[] {
  return landmarks.map((landmark) => ({
    ...landmark,
  }));
}

export function cloneWorldLandmarks(landmarks: Landmark[]): Landmark[] {
  return landmarks.map((landmark) => ({
    ...landmark,
  }));
}

export function selectLandmarks(
  landmarks: NormalizedLandmark[],
  indices: number[],
) {
  return indices
    .map((index) => landmarks[index])
    .filter((landmark): landmark is NormalizedLandmark => Boolean(landmark));
}

export function normalizeLandmarks(landmarks: NormalizedLandmark[]) {
  if (landmarks.length === 0) {
    return [];
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;

  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x);
    minY = Math.min(minY, landmark.y);
    minZ = Math.min(minZ, landmark.z ?? 0);

    maxX = Math.max(maxX, landmark.x);
    maxY = Math.max(maxY, landmark.y);
    maxZ = Math.max(maxZ, landmark.z ?? 0);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;

  return landmarks.map((landmark) => ({
    ...landmark,
    x: (landmark.x - minX) / rangeX,
    y: (landmark.y - minY) / rangeY,
    z: ((landmark.z ?? 0) - minZ) / rangeZ,
  }));
}
