import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

import { VisionEngine } from "../vision/VisionEngine";
import { DrawingLayer } from "../vision/drawing/DrawingLayer";
import { FrameRecorder } from "../vision/recording/FrameRecorder";
import { normalizeLandmarks } from "../vision/processing/landmarkFilters";
import type {
  Landmark,
  Sequence,
  VisionEngineOptions,
  VisionFrame,
} from "../vision/types";

export type VideoMode = "record" | "practice" | "translate";

export type ReferenceFrame = Landmark[][];

export interface VideoProps {
  mode?: VideoMode;
  referenceLandmarks?: ReferenceFrame[];
  onFrame?: (frame: VisionFrame) => void;
  isActive?: boolean;
  feedbackThreshold?: number;
  className?: string;
  engineOptions?: VisionEngineOptions;
}

export interface VideoHandle {
  startRecording: () => void;
  stopRecording: () => void;
  getRecordedFrames: () => Sequence;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

function euclideanDistance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function frameSimilarity(
  userHands: Landmark[][],
  refHands: ReferenceFrame,
): number {
  if (!userHands.length || !refHands.length) return 0;

  const userHand = userHands[0];
  const refHand = refHands[0];
  if (!userHand || !refHand || userHand.length !== refHand.length) return 0;

  if (userHand.length === 0) return 0;
  const normalizedUserHand = normalizeLandmarks(
    userHand.map((l) => ({ ...l, visibility: 1 })),
  );
  const normalizedRefHand = normalizeLandmarks(
    refHand.map((l) => ({ ...l, visibility: 1 })),
  );

  let totalDist = 0;
  for (let i = 0; i < normalizedUserHand.length; i++) {
    totalDist += euclideanDistance(normalizedUserHand[i], normalizedRefHand[i]);
  }
  const avgDist = totalDist / normalizedUserHand.length;
  // Convert distance to similarity score in [0, 1]
  // need to tune the scaling factor (10) based on empirical testing
  return Math.min(1, Math.exp(-avgDist * 10));
}

function presentHands(frame: VisionFrame): Landmark[][] {
  const hands: Landmark[][] = [];
  if (frame.hands.left) hands.push(frame.hands.left.landmarks);
  if (frame.hands.right) hands.push(frame.hands.right.landmarks);
  return hands;
}

const Video = forwardRef<VideoHandle, VideoProps>(
  (
    {
      mode = "practice",
      referenceLandmarks,
      onFrame,
      isActive = true,
      feedbackThreshold = 0.85,
      className = "",
      engineOptions,
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [engineReady, setEngineReady] = useState(false);
    const [modelError, setModelError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const engineRef = useRef<VisionEngine | null>(null);
    const drawingLayerRef = useRef<DrawingLayer | null>(null);
    const frameRecorderRef = useRef(new FrameRecorder());
    const isRecordingRef = useRef(false);

    const frameIndexRef = useRef(0);
    const lastFeedbackRef = useRef<number | null>(null);

    const animationRef = useRef<number>(0);
    const detectFrameRef = useRef<() => void>(() => {});

    useEffect(() => {
      const engine = new VisionEngine();
      engineRef.current = engine;

      engine
        .initialize(engineOptions)
        .then(() => setEngineReady(true))
        .catch((err: Error) => {
          console.error("Failed to load vision tracking models:", err);
          setModelError(
            "تعذّر تحميل نظام تتبع الحركة. تحقق من اتصال الإنترنت وأعد تحميل الصفحة.",
          );
        });

      return () => {
        engine.close();
        engineRef.current = null;
        drawingLayerRef.current = null;
      };
    }, []);

    const detectFrame = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const engine = engineRef.current;

      if (
        !video ||
        !canvas ||
        !engine ||
        !engine.ready ||
        video.readyState < 2
      ) {
        animationRef.current = requestAnimationFrame(detectFrameRef.current);
        return;
      }

      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (!drawingLayerRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawingLayerRef.current = new DrawingLayer(ctx);
        }
      }

      const now = performance.now();
      const frame = engine.detect(video, now, video.currentTime);

      drawingLayerRef.current?.clear(canvas.width, canvas.height);
      drawingLayerRef.current?.drawAll({
        leftHand: frame.hands.left?.landmarks ?? [],
        rightHand: frame.hands.right?.landmarks ?? [],
        pose: frame.pose?.landmarks ?? [],
        face: frame.face?.landmarks ?? [],
      });

      onFrame?.(frame);

      if (
        (mode === "record" || mode === "translate") &&
        isRecordingRef.current &&
        isActive
      ) {
        frameRecorderRef.current.addFrame(frame, now);
      }

      if (
        mode === "practice" &&
        referenceLandmarks &&
        referenceLandmarks.length > 0
      ) {
        const currentIdx = frameIndexRef.current;

        if (currentIdx >= referenceLandmarks.length) {
          frameIndexRef.current = 0;
        } else {
          const similarity = frameSimilarity(
            presentHands(frame),
            referenceLandmarks[currentIdx],
          );
          lastFeedbackRef.current = similarity;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            const color =
              similarity >= feedbackThreshold ? "#00FF00" : "#FF0000";
            ctx.beginPath();
            ctx.arc(canvas.width - 40, 40, 20, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = "16px Arial";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText(
              `${Math.round(similarity * 100)}%`,
              canvas.width - 40,
              70,
            );
          }

          if (similarity >= feedbackThreshold) {
            frameIndexRef.current = Math.min(
              currentIdx + 1,
              referenceLandmarks.length - 1,
            );
          }
        }
      }

      animationRef.current = requestAnimationFrame(detectFrameRef.current);
    }, [mode, isActive, onFrame, referenceLandmarks, feedbackThreshold]);

    useEffect(() => {
      detectFrameRef.current = detectFrame;
    }, [detectFrame]);

    useEffect(() => {
      if (stream && engineReady) {
        frameIndexRef.current = 0;
        lastFeedbackRef.current = null;
        animationRef.current = requestAnimationFrame(detectFrameRef.current);
      } else {
        cancelAnimationFrame(animationRef.current);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return () => cancelAnimationFrame(animationRef.current);
    }, [stream, engineReady]);

    useEffect(() => {
      frameIndexRef.current = 0;
      lastFeedbackRef.current = null;
    }, [referenceLandmarks]);

    useEffect(() => {
      return () => {
        cancelAnimationFrame(animationRef.current);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [stream]);

    useImperativeHandle(ref, () => ({
      startRecording() {
        isRecordingRef.current = true;
        frameRecorderRef.current.start();
      },
      stopRecording() {
        isRecordingRef.current = false;
        frameRecorderRef.current.stop();
      },
      getRecordedFrames() {
        return frameRecorderRef.current.getFrames();
      },
      async startCamera() {
        if (stream) return;
        return toggleCamera();
      },
      stopCamera() {
        if (stream) {
          toggleCamera();
        }
      },
    }));

    const toggleCamera = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
        setStream(null);
        isRecordingRef.current = false;
        frameRecorderRef.current.reset();
        engineRef.current?.resetTracking();
      } else {
        try {
          setIsLoading(true);
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
          });
          videoElement.srcObject = mediaStream;
          await videoElement.play();
          setStream(mediaStream);
          setCameraError(null);
        } catch (err) {
          console.error("Failed to access the camera:", err);
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setCameraError(
              "تم رفض إذن الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.",
            );
          } else if (
            err instanceof DOMException &&
            err.name === "NotFoundError"
          ) {
            setCameraError(
              "لم يتم العثور على كاميرا. تأكد من توصيل كاميرا بجهازك.",
            );
          } else {
            setCameraError("تعذّر تشغيل الكاميرا. حاول مرة أخرى.");
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    const buttonDisabled = isLoading || !engineReady;

    return (
      <div className={`flex flex-col gap-4 p-4 ${className}`}>
        {modelError && (
          <div className="p-3 rounded-lg text-center text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {modelError}
          </div>
        )}
        {cameraError && (
          <div className="p-3 rounded-lg text-center text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            {cameraError}
          </div>
        )}
        <div className="relative aspect-video rounded-lg bg-black overflow-hidden">
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10" />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`-scale-x-100 w-full h-full object-cover transition-opacity duration-300 ${
              stream ? "opacity-100" : "opacity-0"
            }`}
          />
          <canvas
            ref={canvasRef}
            className="-scale-x-100 absolute top-0 left-0 w-full h-full object-cover"
          />
        </div>
        <button
          onClick={toggleCamera}
          disabled={buttonDisabled}
          className={`px-6 py-3 rounded-lg font-bold text-white transition-colors ${
            stream
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } ${buttonDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading
            ? "جاري التحميل..."
            : !engineReady
              ? "جاري تجهيز نظام التتبع..."
              : stream
                ? "إيقاف الكاميرا"
                : "تشغيل الكاميرا"}
        </button>
      </div>
    );
  },
);

Video.displayName = "Video";

export default Video;
