import { z } from "zod";

const landmarkSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  visibility: z.number().optional(),
  presence: z.number().optional(),
});

const handDataSchema = z.object({
  landmarks: z.array(landmarkSchema),
  worldLandmarks: z.array(landmarkSchema),
});

const poseDataSchema = z.object({
  landmarks: z.array(landmarkSchema),
  worldLandmarks: z.array(landmarkSchema),
});

const blendshapeSchema = z.object({
  categoryName: z.string(),
  score: z.number(),
});

const faceDataSchema = z.object({
  landmarks: z.array(landmarkSchema),
  blendshapes: z.array(blendshapeSchema),
});

const frameSchema = z
  .object({
    timestamp: z.number(),
    hands: z.object({
      left: handDataSchema.nullable(),
      right: handDataSchema.nullable(),
    }),
    pose: poseDataSchema.nullable(),
    face: faceDataSchema.nullable(),
  })
  .refine(
    (frame) =>
      frame.hands.left !== null ||
      frame.hands.right !== null ||
      frame.pose !== null ||
      frame.face !== null,
    { message: "frame must contain at least one detected modality" },
  );

export const recordSignSchema = z.object({
  word: z.string().min(1).max(255),
  arabicText: z.string().min(1),
  category: z.string().optional().default("general"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional()
    .default("beginner"),
  dialect: z.string().min(1),
  videoUrl: z.string().optional().default(""),
  imageUrls: z.array(z.string()).optional().default([]),
  landmarksJson: z.array(frameSchema).min(1),
});
