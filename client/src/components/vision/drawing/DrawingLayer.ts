import {
  DrawingUtils,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import type {
  HandLandmarks,
  PoseLandmarks,
  FaceLandmarks,
  Landmark,
} from "../types";

function toNormalized(landmarks: Landmark[]): NormalizedLandmark[] {
  return landmarks.map(({ x, y, z }) => ({ x, y, z, visibility: 1 }));
}

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

    this.utils.drawConnectors(normalizedPose, PoseLandmarker.POSE_CONNECTIONS, {
      color: "#00FFFF",
      lineWidth: 3,
    });

    this.utils.drawLandmarks(normalizedPose, {
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
