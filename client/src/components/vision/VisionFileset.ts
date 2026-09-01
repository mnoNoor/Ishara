import { FilesetResolver } from "@mediapipe/tasks-vision";

type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

let filesetPromise: Promise<VisionFileset> | null = null;

export function getVisionFileset(): Promise<VisionFileset> {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks("/mediapipe/wasm").catch(
      (error) => {
        filesetPromise = null;
        throw error;
      },
    );
  }

  return filesetPromise;
}
