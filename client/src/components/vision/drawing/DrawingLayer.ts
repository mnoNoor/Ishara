import { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import type {
  HandLandmarks,
  PoseLandmarks,
  FaceLandmarks,
  Landmark,
} from "../types";

import { selectLandmarks } from "../processing/landmarkFilters";

import {
  POSE_SUBSET_LEFT_SHOULDER,
  POSE_SUBSET_RIGHT_SHOULDER,
  POSE_SUBSET_LEFT_HIP,
  POSE_SUBSET_RIGHT_HIP,
} from "../processing/poseLandmarkSubset";

function toNormalized(landmarks: Landmark[]): NormalizedLandmark[] {
  return landmarks.map(({ x, y, z }) => ({ x, y, z, visibility: 1 }));
}

const POSE_SUBSET_CONNECTIONS: { start: number; end: number }[] = [
  { start: POSE_SUBSET_LEFT_SHOULDER, end: POSE_SUBSET_RIGHT_SHOULDER },
  { start: POSE_SUBSET_LEFT_SHOULDER, end: POSE_SUBSET_LEFT_HIP },
  { start: POSE_SUBSET_RIGHT_SHOULDER, end: POSE_SUBSET_RIGHT_HIP },
  { start: POSE_SUBSET_LEFT_HIP, end: POSE_SUBSET_RIGHT_HIP },
];

const POSE_DRAWN_LANDMARK_INDICES = [
  POSE_SUBSET_LEFT_SHOULDER,
  POSE_SUBSET_RIGHT_SHOULDER,
  POSE_SUBSET_LEFT_HIP,
  POSE_SUBSET_RIGHT_HIP,
];

export class DrawingLayer {
  private readonly utils: DrawingUtils;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.utils = new DrawingUtils(ctx);
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width, height);
  }

  drawHands(left: HandLandmarks, right: HandLandmarks) {
    if (left.length) {
      this.drawHand(left);
    }

    if (right.length) {
      this.drawHand(right);
    }
  }

  drawPose(pose: PoseLandmarks) {
    if (!pose.length) {
      return;
    }

    const normalizedPose = toNormalized(pose);

    this.utils.drawConnectors(normalizedPose, POSE_SUBSET_CONNECTIONS, {
      color: "#00FFFF",
      lineWidth: 3,
    });

    const drawnLandmarks = selectLandmarks(
      normalizedPose,
      POSE_DRAWN_LANDMARK_INDICES,
    );

    this.utils.drawLandmarks(drawnLandmarks, {
      color: "#FFFFFF",
      lineWidth: 1,
    });
  }

  drawFace(face: FaceLandmarks) {
    if (!face.length) {
      return;
    }
  }

  drawAll({
    leftHand,
    rightHand,
    pose,
    face,
  }: {
    leftHand: HandLandmarks;
    rightHand: HandLandmarks;
    pose: PoseLandmarks;
    face: FaceLandmarks;
  }) {
    this.drawPose(pose);
    this.drawFace(face);
    this.drawHands(leftHand, rightHand);
  }

  private drawHand(hand: HandLandmarks) {
    const normalizedHand = toNormalized(hand);

    this.utils.drawConnectors(normalizedHand, HandLandmarker.HAND_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 4,
    });

    this.utils.drawLandmarks(normalizedHand, {
      color: "#FF0000",
      lineWidth: 2,
    });
  }
}
