import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiRequest } from "../utils/api";

export default function Home() {
  const [stats, setStats] = useState({
    signs: 0,
    variants: 0,
    accuracy: 0,
  });

  useEffect(() => {
    apiRequest<{ signs: number; variants: number; accuracy: number }>(
      "/dictionary/stats",
    )
      .then((data) => setStats(data))
      .catch(() => {
        setStats({
          signs: 28,
          variants: 162,
          accuracy: 92.8,
        });
      });
  }, []);

  return (
    <div className="flex flex-col items-center">
      <section className="w-full bg-linear-to-br from-blue-50 to-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 leading-tight">
            <span className="text-blue-600">إشارة</span>
            <span className="block text-2xl md:text-3xl font-medium text-gray-600 mt-2">
              مشروع ترجمة لغة الإشارة العربية
            </span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            نظام 3D لتتبع اليد يترجم لغة الإشارة العربية إلى نصوص، مع دعم
            اللهجات ومساهمات المجتمع.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {stats.signs}
              </div>
              <div className="text-sm text-gray-500">إشارة أساسية</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {stats.variants}
              </div>
              <div className="text-sm text-gray-500">عينة مسجلة</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {stats.accuracy}%
              </div>
              <div className="text-sm text-gray-500">دقة الترجمة</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/sign-recorder"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              🖐️ سجّل إشارة جديدة
            </Link>
            <Link
              to="/translate"
              className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition"
            >
              🌐 جرّب الترجمة
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-12 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
              🚧 مرحلة التطوير النشط
            </h3>
            <p className="text-yellow-700 mt-2">
              المشروع في بداياته. حالياً يدعم
              <strong> 28 حرفاً عربياً </strong>
              بدقة <strong>92.8%</strong>
            </p>
            <Link
              to="/about"
              className="inline-block mt-3 text-blue-600 font-semibold hover:underline"
            >
              اعرف كيف تساهم →
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            الميزات الحالية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                تتبع 3D دقيق
              </h3>
              <p className="text-gray-600 mt-2 text-sm">
                63 نقطة مرجعية لكل يد، مع دعم الإشارات بيد واحدة.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🗣️
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                دعم اللهجات
              </h3>
              <p className="text-gray-600 mt-2 text-sm">
                يتيح النظام ترجمة الإشارات العربية مع مراعاة اختلاف اللهجات.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🤝
              </div>
              <h3 className="text-xl font-semibold text-gray-800">
                مساهمات المجتمع
              </h3>
              <p className="text-gray-600 mt-2 text-sm">
                نظام تطوع يتيح للمستخدمين إضافة إشارات جديدة وتحسين الدقة.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
