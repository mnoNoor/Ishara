import { useRef, useState, useEffect, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import Video, { type VideoHandle } from "../components/video/Video";
import type { VisionFrame } from "../components/vision/types";
import { DIALECTS } from "../constants/dialects";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const FRAME_SEND_INTERVAL_MS = 66;

interface LiveResult {
  arabicText: string;
  confidence: number;
}

type LiveTranslateEvent =
  | { type: "partial"; arabicText: string; confidence: number }
  | { type: "final"; arabicText: string; confidence: number }
  | { type: "idle" };

type ConnectionStatus = "idle" | "connecting..." | "connected" | "error";

export default function LiveTranslation() {
  const videoRef = useRef<VideoHandle>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastSentAtRef = useRef(0);

  const [dialect] = useState<(typeof DIALECTS)[number]>("سورية");
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [partial, setPartial] = useState<LiveResult | null>(null);
  const [history, setHistory] = useState<LiveResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleStart = () => {
    setError(null);
    setStatus("connecting...");
    setIsSessionReady(false);
    setPartial(null);

    const socket = io(SOCKET_URL, {
      path: "/ws/translate",
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected, sending translate:start");
      setStatus("connected");
      socket.emit("translate:start", { dialect });
    });

    socket.on("translate:ready", () => {
      console.log("Server ready for translation");
      setIsSessionReady(true);
    });

    socket.on("translate:event", (event: LiveTranslateEvent) => {
      switch (event.type) {
        case "partial":
          setPartial({
            arabicText: event.arabicText,
            confidence: Math.round(event.confidence * 100),
          });
          break;
        case "final":
          setPartial(null);
          setHistory((h) => [
            {
              arabicText: event.arabicText,
              confidence: Math.round(event.confidence * 100),
            },
            ...h,
          ]);
          break;
        case "idle":
          setPartial(null);
          break;
      }
    });

    socket.on("translate:error", ({ message }: { message: string }) => {
      console.error("Translation error:", message);
      setStatus("error");
      setError(message);
      setIsSessionReady(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setStatus("error");
      setError(
        "تعذّر الاتصال بخدمة الترجمة الحية. تحقق من الاتصال وحاول مرة أخرى.",
      );
      setIsSessionReady(false);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setStatus("idle");
      setIsSessionReady(false);
    });

    setIsLive(true);
  };

  const handleStop = () => {
    socketRef.current?.emit("translate:reset");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsLive(false);
    setStatus("idle");
    setIsSessionReady(false);
    setPartial(null);
  };

  const handleFrame = useCallback(
    (frame: VisionFrame) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected || !isSessionReady) {
        return;
      }
      const now = performance.now();
      if (now - lastSentAtRef.current < FRAME_SEND_INTERVAL_MS) return;
      lastSentAtRef.current = now;
      socket.emit("translate:frame", frame);
    },
    [isSessionReady],
  );

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-center text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden">
        <Video
          ref={videoRef}
          mode="translate"
          isActive={isLive}
          onFrame={handleFrame}
        />
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            {status === "connected" && isSessionReady
              ? "ترجمة حية"
              : status === "connected"
                ? "جاري تهيئة الجلسة..."
                : "جاري الاتصال..."}
          </div>
        )}
      </div>

      {partial && (
        <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-2">
          <p className="text-sm text-blue-700">جاري رصد الإشارة</p>
          <p className="text-2xl font-bold text-blue-800" dir="rtl">
            {partial.arabicText}
          </p>
          <p className="text-xs text-blue-600">
            نسبة الثقة: {partial.confidence}%
          </p>
        </div>
      )}

      <div className="flex justify-center">
        {!isLive ? (
          <button
            onClick={handleStart}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm"
          >
            بدء الترجمة الحية
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-sm"
          >
            إيقاف الترجمة
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">
        شغّل الكاميرا من الزر أسفل المعاينة، ثم اضغط "بدء الترجمة الحية".
      </p>

      <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            سجل الكلمات المترجمة
          </h3>
          <button
            onClick={() => setHistory([])}
            disabled={history.length === 0}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            تفريغ السجل
          </button>
        </div>
        <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              سجل الكلمات المترجمة
            </h3>
            <button
              onClick={() => setHistory([])}
              disabled={history.length === 0}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              تفريغ السجل
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد كلمات مترجمة بعد.</p>
          ) : (
            <>
              <div
                className="p-3 rounded-md bg-gray-50 border border-gray-200 text-right min-h-15 max-h-50 overflow-y-auto"
                dir="rtl"
              >
                <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap wrap-break-word">
                  {history
                    .slice()
                    .reverse()
                    .map((h) => h.arabicText)
                    .join(" ")}
                </p>
              </div>

              {history.length > 0 && (
                <div className="flex justify-end text-xs text-emerald-600">
                  ثقة آخر كلمة: {history[0].confidence}%
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
