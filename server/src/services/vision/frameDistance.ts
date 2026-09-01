import type { Frame, Landmark } from "../../db/db.types";

const HAND_WEIGHT = 0.65;
const POSE_WEIGHT = 0.15;
const FACE_WEIGHT = 0.2;

type LandmarkSet = Landmark[];

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
  if (current.length === 0 || previous.length === 0) return null;
  if (current.length !== previous.length) return Infinity;

  let total = 0;
  for (let i = 0; i < current.length; i++) {
    total += landmarkDistance(current[i], previous[i]);
  }
  return total / current.length;
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

  // ظهور/اختفاء اليد أو الوجه فجأة = تغيّر جوهري، مو صفر
  if (currentPresent !== previousPresent) {
    return { distance: Infinity, available: true };
  }
  if (!currentPresent || !previousPresent) {
    return { distance: 0, available: false };
  }

  const distance = averageLandmarkDistance(current, previous);
  if (distance === null) return { distance: 0, available: false };
  return { distance, available: true };
}

/**
 * نفس فكرة calculateFrameChange في client/.../FrameRecorder.ts، بس نسخة
 * مستقلة تشتغل على السيرفر. نستخدمها هنا عكسياً: مو لتصفية فريمات متكررة
 * عند التسجيل، بل لكشف متى تستمر عدة فريمات متتالية شبه ثابتة (= hold).
 */
export function frameDistance(current: Frame, previous: Frame): number {
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

  if (totalWeight === 0) return Infinity; // لا يوجد شيء نقارنه = اعتبرها تغيّر إجباري
  return weightedDistance / totalWeight;
}
