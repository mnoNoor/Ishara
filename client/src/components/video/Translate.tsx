import { useRef, useState } from "react";
import Video, { type VideoHandle } from "./Video";
import { DIALECTS } from "../../constants/dialects";
import { apiRequest } from "../../utils/api";

const CAPTURE_DURATION_MS = 3000;

interface TranslationResult {
  word: string;
  arabicText: string;
  confidence: number;
}

export default function Translate() {
  const videoRef = useRef<VideoHandle>(null);
  const [dialect] = useState<(typeof DIALECTS)[number]>("سورية");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationResult[]>([]);

  const handleCapture = () => {
    setError(null);
    setResult(null);
    videoRef.current?.startRecording();
    setIsCapturing(true);

    setTimeout(() => {
      videoRef.current?.stopRecording();
      setIsCapturing(false);

      const frames = videoRef.current?.getRecordedFrames();
      if (!frames || frames.length === 0) {
        setError(
          "No hand movements detected. Please try again near the camera.",
        );
        return;
      }

      sendForTranslation(frames.map((f) => f.landmarks));
    }, CAPTURE_DURATION_MS);
  };

  const sendForTranslation = async (
    landmarksJson: ReturnType<
      VideoHandle["getRecordedFrames"]
    >[number]["landmarks"][],
  ) => {
    setIsTranslating(true);
    try {
      const data = await apiRequest<TranslationResult>("/translate/sign-to-text", {
        method: "POST",
        body: { dialect, landmarksJson },
      });

      setResult(data);
      setHistory((h) => [data, ...h]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "unknown error occurred during translation");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-center text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden">
        <Video ref={videoRef} mode="translate" isActive={isCapturing} />
        {isCapturing && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            جاري رصد الإشارة...
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleCapture}
          disabled={isCapturing || isTranslating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition shadow-sm"
        >
          {isCapturing
            ? "جاري الرصد..."
            : isTranslating
              ? "جاري الترجمة..."
              : "ابدأ ترجمة الإشارة"}
        </button>
      </div>

      {result && (
        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
          <p className="text-sm text-emerald-700">النص المُترجم</p>
          <p className="text-2xl font-bold text-emerald-800" dir="rtl">
            {result.arabicText}
          </p>
          <p className="text-sm text-gray-500">({result.word})</p>
          <p className="text-xs text-emerald-600">
            نسبة الثقة: {result.confidence}%
          </p>
        </div>
      )}

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
          <ul className="space-y-2 text-right">
            {history.map((h, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="font-semibold">{h.arabicText}</span>
                <span className="text-gray-500"> — ({h.word})</span>
                <span className="text-xs text-emerald-600">
                  {" "}
                  • {h.confidence}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
