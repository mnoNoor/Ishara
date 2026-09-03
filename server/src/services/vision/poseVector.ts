import type { Frame, Landmark } from "../../db/db.types.js";

const LANDMARK_COUNT = 21;
const COORDS_PER_POINT = 3;
const HAND_SHAPE_SIZE = LANDMARK_COUNT * COORDS_PER_POINT;

const POSE_LEFT_SHOULDER = 11;
const POSE_RIGHT_SHOULDER = 12;
const CHEST_Y_OFFSET = 0.15;

const FACE_MOUTH_INDEX = 0;
const FACE_NOSE_INDEX = 1;

function zero3(): number[] {
  return [0, 0, 0];
}

function midpoint(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  };
}

function distance3(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z ?? 0) - (b.z ?? 0)) ** 2,
  );
}

interface BodyFrame {
  origin: Landmark;
  scale: number;
}

function buildBodyFrame(
  poseLandmarks: Landmark[] | undefined,
): BodyFrame | null {
  const left = poseLandmarks?.[POSE_LEFT_SHOULDER];
  const right = poseLandmarks?.[POSE_RIGHT_SHOULDER];
  if (!left || !right) return null;

  return {
    origin: midpoint(left, right),
    scale: Math.max(distance3(left, right), 1e-6),
  };
}

function toBodyRelative(
  point: Landmark | undefined,
  frame: BodyFrame | null,
): number[] {
  if (!point || !frame) return zero3();
  return [
    (point.x - frame.origin.x) / frame.scale,
    (point.y - frame.origin.y) / frame.scale,
    ((point.z ?? 0) - (frame.origin.z ?? 0)) / frame.scale,
  ];
}

function handShapeVector(landmarks: Landmark[] | undefined): number[] {
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) {
    return new Array(HAND_SHAPE_SIZE).fill(0);
  }
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const scale = Math.max(distance3(middleMcp, wrist), 1e-6);

  const vector: number[] = [];
  for (const point of landmarks) {
    vector.push(
      (point.x - wrist.x) / scale,
      (point.y - wrist.y) / scale,
      ((point.z ?? 0) - (wrist.z ?? 0)) / scale,
    );
  }
  return vector;
}

export function frameToPoseVector(frame: Frame): number[] {
  const bodyFrame = buildBodyFrame(frame.pose?.landmarks);
  const vector: number[] = [];

  for (const hand of [frame.hands.left, frame.hands.right]) {
    vector.push(...handShapeVector(hand?.landmarks));
    vector.push(...toBodyRelative(hand?.landmarks?.[0], bodyFrame));
  }

  const mouth = frame.face?.landmarks?.[FACE_MOUTH_INDEX];
  const nose = frame.face?.landmarks?.[FACE_NOSE_INDEX];
  vector.push(...toBodyRelative(mouth, bodyFrame));
  vector.push(...toBodyRelative(nose, bodyFrame));

  if (bodyFrame) {
    const chest: Landmark = {
      x: bodyFrame.origin.x,
      y: bodyFrame.origin.y + CHEST_Y_OFFSET * bodyFrame.scale,
      z: bodyFrame.origin.z ?? 0,
    };
    vector.push(...toBodyRelative(chest, bodyFrame));
  } else {
    vector.push(...zero3());
  }

  return vector;
}

export const POSE_VECTOR_SIZE =
  (HAND_SHAPE_SIZE + 3) * 2 /* يدين: شكل + موضع نسبي */ +
  3 /* الفم */ +
  3 /* الأنف */ +
  3; /* الصدر */
