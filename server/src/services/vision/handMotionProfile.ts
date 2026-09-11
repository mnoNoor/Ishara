import type { Frame, Landmark } from "../../db/db.types.js";

const WRIST_INDEX = 0;
const MIDDLE_MCP_INDEX = 9;
const INDEX_TIP_INDEX = 8;
const POSE_LEFT_SHOULDER = 1;
const POSE_RIGHT_SHOULDER = 2;

const FINGER_TIP_INDEX = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
} as const;

export type FingerName = keyof typeof FINGER_TIP_INDEX;

export const FINGER_NAMES = Object.keys(FINGER_TIP_INDEX) as FingerName[];

export type MotionChannel = FingerName | "wristX" | "wristY" | "indexTipY";

export const MOTION_CHANNELS: MotionChannel[] = [
  ...FINGER_NAMES,
  "wristX",
  "wristY",
  "indexTipY",
];

function distance3(a: Landmark, b: Landmark): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z ?? 0) - (b.z ?? 0)) ** 2,
  );
}

export function fingerExtensions(
  hand: Landmark[] | null | undefined,
): Record<FingerName, number> | null {
  if (!hand || hand.length !== 21) return null;

  const wrist = hand[WRIST_INDEX];
  const scale = Math.max(distance3(hand[MIDDLE_MCP_INDEX], wrist), 1e-6);

  const result = {} as Record<FingerName, number>;
  for (const finger of FINGER_NAMES) {
    const tip = hand[FINGER_TIP_INDEX[finger]];
    result[finger] = distance3(tip, wrist) / scale;
  }
  return result;
}

function dominantHand(frame: Frame): Landmark[] | null {
  const hand =
    frame.hands.right?.landmarks ?? frame.hands.left?.landmarks ?? null;
  return hand && hand.length === 21 ? hand : null;
}

export function motionFeatures(
  frame: Frame,
): Record<MotionChannel, number> | null {
  const hand = dominantHand(frame);
  const extensions = fingerExtensions(hand);
  if (!hand || !extensions) return null;

  const wrist = hand[WRIST_INDEX];
  const scale = Math.max(distance3(hand[MIDDLE_MCP_INDEX], wrist), 1e-6);
  const left = frame.pose?.landmarks?.[POSE_LEFT_SHOULDER];
  const right = frame.pose?.landmarks?.[POSE_RIGHT_SHOULDER];

  let wristX = wrist.x;
  let wristY = wrist.y;
  if (left && right) {
    const originX = (left.x + right.x) / 2;
    const originY = (left.y + right.y) / 2;
    const bodyScale = Math.max(distance3(left, right), 1e-6);
    wristX = (wrist.x - originX) / bodyScale;
    wristY = (wrist.y - originY) / bodyScale;
  }

  return {
    ...extensions,
    wristX,
    wristY,
    indexTipY: (hand[INDEX_TIP_INDEX].y - wrist.y) / scale,
  };
}

export function minAmplitudeFor(channel: MotionChannel): number {
  if (channel === "wristX" || channel === "wristY") return 0.08;
  if (channel === "indexTipY") return 0.18;
  return 0.25;
}
