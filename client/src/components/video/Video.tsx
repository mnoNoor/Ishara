import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import type {
  HandLandmarkerResult,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

export type VideoMode = "record" | "practice" | "translate";

export interface RecordedFrame {
  timestamp: number;
  landmarks: NormalizedLandmark[][];
}

export interface VideoProps {
  mode?: VideoMode;
  referenceLandmarks?: NormalizedLandmark[][][];
  onLandmarks?: (landmarks: NormalizedLandmark[][], timestamp: number) => void;
  isActive?: boolean;
  feedbackThreshold?: number;
  className?: string;
}

export interface VideoHandle {
  startRecording: () => void;
  stopRecording: () => void;
  getRecordedFrames: () => RecordedFrame[];
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const FRAME_CHANGE_THRESHOLD = 0.015;
const HEARTBEAT_INTERVAL_MS = 150;
const TRACK_STALE_MS = 500;

function euclideanDistance(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function frameSimilarity(
  userLandmarks: NormalizedLandmark[][],
  refLandmarks: NormalizedLandmark[][],
): number {
  if (!userLandmarks.length || !refLandmarks.length) return 0;
  const userHand = userLandmarks[0];
  const refHand = refLandmarks[0];
  if (!userHand || !refHand || userHand.length !== refHand.length) return 0;

  let totalDist = 0;
  for (let i = 0; i < userHand.length; i++) {
    totalDist += euclideanDistance(userHand[i], refHand[i]);
  }
  const avgDist = totalDist / userHand.length;
  const similarity = Math.exp(-avgDist * 10);
  return Math.min(1, similarity);
}

function frameHasSignificantChange(
  current: NormalizedLandmark[][],
  previous: NormalizedLandmark[][] | null,
  threshold: number,
): boolean {
  if (!previous) return true;
  if (current.length !== previous.length) return true;

  let totalDist = 0;
  let totalPoints = 0;

  for (let h = 0; h < current.length; h++) {
    const curHand = current[h];
    const prevHand = previous[h];
    if (!curHand || !prevHand || curHand.length !== prevHand.length) {
      return true;
    }
    for (let p = 0; p < curHand.length; p++) {
      totalDist += euclideanDistance(curHand[p], prevHand[p]);
      totalPoints++;
    }
  }

  if (totalPoints === 0) return true;
  return totalDist / totalPoints > threshold;
}

interface HandTrack {
  lastWrist: NormalizedLandmark | null;
  lastSeenAt: number;
  leftVotes: number;
  rightVotes: number;
}

function freshTracks(): [HandTrack, HandTrack] {
  return [
    { lastWrist: null, lastSeenAt: 0, leftVotes: 0, rightVotes: 0 },
    { lastWrist: null, lastSeenAt: 0, leftVotes: 0, rightVotes: 0 },
  ];
}

function wristOf(hand: NormalizedLandmark[]): NormalizedLandmark {
  return hand[0];
}

function posDist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function liveWrist(track: HandTrack, now: number): NormalizedLandmark | null {
  if (!track.lastWrist) return null;
  if (now - track.lastSeenAt > TRACK_STALE_MS) return null;
  return track.lastWrist;
}

function assignToTracks(
  detectedHands: NormalizedLandmark[][],
  tracks: [HandTrack, HandTrack],
  now: number,
): [NormalizedLandmark[] | null, NormalizedLandmark[] | null] {
  if (detectedHands.length === 0) return [null, null];

  const w0 = liveWrist(tracks[0], now);
  const w1 = liveWrist(tracks[1], now);

  if (detectedHands.length === 1) {
    const wrist = wristOf(detectedHands[0]);
    const d0 = w0 ? posDist(wrist, w0) : Infinity;
    const d1 = w1 ? posDist(wrist, w1) : Infinity;
    if (d0 === Infinity && d1 === Infinity) {
      return [detectedHands[0], null];
    }
    return d1 < d0 ? [null, detectedHands[0]] : [detectedHands[0], null];
  }

  const [handA, handB] = detectedHands;
  const wristA = wristOf(handA);
  const wristB = wristOf(handB);

  if (w0 && w1) {
    const costKeep = posDist(wristA, w0) + posDist(wristB, w1);
    const costSwap = posDist(wristA, w1) + posDist(wristB, w0);
    return costSwap < costKeep ? [handB, handA] : [handA, handB];
  }

  return [handA, handB];
}

const Video = forwardRef<VideoHandle, VideoProps>(
  (
    {
      mode = "practice",
      referenceLandmarks,
      onLandmarks,
      isActive = true,
      feedbackThreshold = 0.85,
      className = "",
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(
      null,
    );
    const [modelError, setModelError] = useState<string | null>(null);

    const recordedFramesRef = useRef<RecordedFrame[]>([]);
    const isRecordingRef = useRef(false);

    const rawTrackFramesRef = useRef<
      {
        timestamp: number;
        slots: [NormalizedLandmark[] | null, NormalizedLandmark[] | null];
      }[]
    >([]);
    const tracksRef = useRef<[HandTrack, HandTrack]>(freshTracks());

    const lastPushedFrameRef = useRef<NormalizedLandmark[][] | null>(null);
    const lastPushedTimestampRef = useRef<number>(0);

    const frameIndexRef = useRef(0);
    const lastFeedbackRef = useRef<number | null>(null);

    const animationRef = useRef<number>(0);
    const detectFrameRef = useRef<() => void>(() => {});

    useEffect(() => {
      const loadModel = async () => {
        try {
          const wasm = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
          );
          const instance = await HandLandmarker.createFromOptions(wasm, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            numHands: 2,
            runningMode: "VIDEO",
          });
          setHandLandmarker(instance);
        } catch (err) {
          console.error("فشل تحميل نموذج تتبع اليد:", err);
          setModelError(
            "تعذر تحميل نظام تتبع اليد. تحقق من الاتصال بالإنترنت وأعد تحميل الصفحة.",
          );
        }
      };
      loadModel();
    }, []);

    const detectFrame = useCallback(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !handLandmarker || video.readyState < 2) {
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

      const detections = handLandmarker.detectForVideo(
        video,
        performance.now(),
      );
      drawResults(detections, canvas, video);

      if (detections.landmarks && detections.landmarks.length > 0) {
        const currentTime = video.currentTime;
        const landmarks = detections.landmarks;

        onLandmarks?.(landmarks, currentTime);

        if (
          (mode === "record" || mode === "translate") &&
          isRecordingRef.current &&
          isActive
        ) {
          const now = performance.now();

          const [slot0, slot1] = assignToTracks(
            detections.landmarks,
            tracksRef.current,
            now,
          );

          if (slot0) {
            tracksRef.current[0].lastWrist = wristOf(slot0);
            tracksRef.current[0].lastSeenAt = now;
          }
          if (slot1) {
            tracksRef.current[1].lastWrist = wristOf(slot1);
            tracksRef.current[1].lastSeenAt = now;
          }

          detections.handedness.forEach((catList, i) => {
            const hand = detections.landmarks[i];
            const top = catList[0];
            if (!top) return;
            const slotIdx = hand === slot0 ? 0 : hand === slot1 ? 1 : -1;
            if (slotIdx === -1) return;
            if (top.categoryName === "Left") {
              tracksRef.current[slotIdx].leftVotes += top.score;
            } else if (top.categoryName === "Right") {
              tracksRef.current[slotIdx].rightVotes += top.score;
            }
          });

          const currentSlots: [NormalizedLandmark[], NormalizedLandmark[]] = [
            slot0 ?? [],
            slot1 ?? [],
          ];

          const changed = frameHasSignificantChange(
            currentSlots,
            lastPushedFrameRef.current,
            FRAME_CHANGE_THRESHOLD,
          );
          const heartbeatDue =
            now - lastPushedTimestampRef.current >= HEARTBEAT_INTERVAL_MS;

          if (changed || heartbeatDue) {
            const cloned: [NormalizedLandmark[], NormalizedLandmark[]] = [
              currentSlots[0].map((p) => ({ ...p })),
              currentSlots[1].map((p) => ({ ...p })),
            ];
            rawTrackFramesRef.current.push({
              timestamp: currentTime,
              slots: cloned,
            });
            lastPushedFrameRef.current = cloned;
            lastPushedTimestampRef.current = now;
          }
        }

        if (
          mode === "practice" &&
          referenceLandmarks &&
          referenceLandmarks.length > 0
        ) {
          const refFrames = referenceLandmarks;
          const currentIdx = frameIndexRef.current;

          if (currentIdx >= refFrames.length) {
            frameIndexRef.current = 0;
            return;
          }

          const similarity = frameSimilarity(landmarks, refFrames[currentIdx]);
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
              refFrames.length - 1,
            );
          }
        }
      }

      animationRef.current = requestAnimationFrame(detectFrameRef.current);
    }, [
      handLandmarker,
      mode,
      isActive,
      onLandmarks,
      referenceLandmarks,
      feedbackThreshold,
    ]);

    useEffect(() => {
      detectFrameRef.current = detectFrame;
    }, [detectFrame]);

    useEffect(() => {
      if (stream && handLandmarker) {
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
    }, [stream, handLandmarker]);

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
        recordedFramesRef.current = [];
        rawTrackFramesRef.current = [];
        lastPushedFrameRef.current = null;
        lastPushedTimestampRef.current = 0;
        tracksRef.current = freshTracks();
      },
      stopRecording() {
        isRecordingRef.current = false;

        const [track0, track1] = tracksRef.current;
        const track0IsLeft =
          track0.leftVotes + track1.rightVotes >=
          track0.rightVotes + track1.leftVotes;

        recordedFramesRef.current = rawTrackFramesRef.current.map((f) => ({
          timestamp: f.timestamp,
          landmarks: track0IsLeft
            ? [f.slots[0] ?? [], f.slots[1] ?? []]
            : [f.slots[1] ?? [], f.slots[0] ?? []],
        }));
      },
      getRecordedFrames() {
        return recordedFramesRef.current;
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
        } catch (err) {
          console.error("تعذر الوصول للكاميرا:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    return (
      <div className={`flex flex-col gap-4 p-4 ${className}`}>
        {modelError && (
          <div className="p-3 rounded-lg text-center text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {modelError}
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
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-bold text-white transition-colors ${
            stream
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading
            ? "جاري التحميل..."
            : stream
              ? "إيقاف الكاميرا"
              : "تشغيل الكاميرا"}
        </button>
      </div>
    );
  },
);

Video.displayName = "Video";

function drawResults(
  result: HandLandmarkerResult,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!result.landmarks) return;

  const drawingUtils = new DrawingUtils(ctx);
  for (const landmarks of result.landmarks) {
    drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 5,
    });
    drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
  }
}

export default Video;
