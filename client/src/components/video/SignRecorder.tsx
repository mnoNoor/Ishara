import { useRef, useState } from "react";
import Video, { type VideoHandle } from "./Video";
import { transliterate } from "transliteration";

const DIALECTS = [
  "سورية",
  "سعودي",
  "مصري",
  "لبناني",
  "عراقي",
  "خليجي",
] as const;

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function SignRecorder() {
  const videoRef = useRef<VideoHandle>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [arabicText, setArabicText] = useState("");
  const [dialect] = useState<(typeof DIALECTS)[number]>("سورية");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleStartRecording = () => {
    videoRef.current?.startRecording();
    setIsRecording(true);
    setFrameCount(0);
    setMessage(null);
  };

  const handleStopRecording = () => {
    videoRef.current?.stopRecording();
    setIsRecording(false);
    const frames = videoRef.current?.getRecordedFrames();
    setFrameCount(frames?.length ?? 0);
  };

  const handleSave = async () => {
    if (!arabicText.trim()) {
      setMessage({
        text: "الرجاء إدخال النص العربي للإشارة",
        type: "error",
      });
      return;
    }

    const frames = videoRef.current?.getRecordedFrames();
    if (!frames || frames.length === 0) {
      setMessage({
        text: "لم يتم تسجيل أي إطارات. سجل الإشارة أولاً.",
        type: "error",
      });
      return;
    }

    const word = transliterate(arabicText.trim(), {}).toLowerCase();

    const landmarksJson = frames.map((f) => f.landmarks);
    console.log(
      "Landmarks structure:",
      JSON.stringify(landmarksJson[0]?.slice(0, 2)),
    );
    console.log("Total frames:", landmarksJson.length);
    const payload = {
      word,
      arabicText: arabicText.trim(),
      dialect,
      landmarksJson,
      videoUrl: "",
      category: "general",
      difficulty: "beginner",
    };

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/admin/signs/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "فشل في الحفظ");
      }

      setMessage({ text: "تم حفظ الإشارة بنجاح ✅", type: "success" });
      setFrameCount(0);
    } catch (error: any) {
      console.error(error);
      setMessage({
        text: error.message || "حدث خطأ أثناء الحفظ",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-center text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden">
        <div className=" w-full">
          <Video
            ref={videoRef}
            mode="record"
            isActive={isRecording}
            onLandmarks={() => {
              if (isRecording) {
                const frames = videoRef.current?.getRecordedFrames();
                setFrameCount(frames?.length ?? 0);
              }
            }}
          />
        </div>
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            جاري التسجيل
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            النص العربي للإشارة
          </label>
          <input
            type="text"
            value={arabicText}
            onChange={(e) => setArabicText(e.target.value)}
            placeholder="مثال: مرحباً"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
            dir="rtl"
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">
            سيتم تحويل النص تلقائياً إلى الاسم الإنجليزي للإشارة (مثلاً: "مرحبا"
            ← "marhaba")
          </p>
        </div>

        {/* اللهجة مخفية افتراضياً (سورية) */}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium transition shadow-sm"
          >
            بدء التسجيل
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-sm"
          >
            إيقاف التسجيل
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isRecording || frameCount === 0 || saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition shadow-sm"
        >
          {saving ? "جاري الحفظ..." : "حفظ الإشارة"}
        </button>
      </div>

      <div className="text-center text-sm text-gray-500">
        {isRecording
          ? `جاري التسجيل... تم تسجيل ${frameCount} إطار`
          : frameCount > 0
            ? `تم تسجيل ${frameCount} إطار. اضغط حفظ لتخزين الإشارة.`
            : "ابدأ التسجيل"}
      </div>
    </div>
  );
}
