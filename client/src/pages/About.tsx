import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <section className="text-center">
        <p className="text-4xl font-semibold text-blue-600 uppercase tracking-[0.2em]">
          عن المشروع
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-gray-900">
          إشارة — نظام ترجمة لغة الإشارة العربية
        </h1>
        <p className="mt-5 text-gray-600 text-lg md:text-xl max-w-3xl mx-auto leading-8">
          منصة عربية تهدف إلى تحويل إشارات اليد العربية إلى نص عبر الكاميرا، مع
          دعم اللهجات المحلية وتخزين عينات جديدة تساهم في تحسين الدقة باستمرار.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-3">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-semibold text-gray-900">رؤية</h2>
          <p className="mt-4 text-gray-600 leading-7">
            بناء تجربة عربية متكاملة لتوصيل لغة الإشارة إلى المجتمع، ودعم ذوي
            الاحتياجات الخاصة والمحترفين في التعليم والترجمة.
          </p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-semibold text-gray-900">الهدف</h2>
          <p className="mt-4 text-gray-600 leading-7">
            تمكين المستخدمين من تسجيل إشارات جديدة، وتجربة الترجمة الفورية،
            والمساهمة في توسيع قاعدة بيانات الإشارات العربية.
          </p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            الأساس التقني
          </h2>
          <p className="mt-4 text-gray-600 leading-7">
            يعمل التطبيق على تتبع معالم اليد باستخدام MediaPipe، ويقارن السلاسل
            الزمنية بالإشارات المخزنة باستخدام DTW وKNN لاستخراج أفضل تطابق.
          </p>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">كيف يعمل</h2>
          <p className="text-gray-600 leading-8">
            يتم تسجيل إشارة اليد عبر الكاميرا بحركة متغيرة، ثم يحفظ النظام
            إحداثيات نقاط اليد ويحولها إلى تمثيل رقمي ثابت. عند طلب الترجمة،
            يقارن التطبيق هذه السلسلة مع العينات المخزنة ليحدد أفضل إشارة
            مطابقه.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="text-3xl">1</div>
              <div>
                <h3 className="font-semibold text-gray-900">تسجيل البيانات</h3>
                <p className="text-gray-600 mt-1">
                  المستخدم يسجل الإشارة ويحدد النص العربي واللهجة للحفظ كعينة
                  جديدة.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="text-3xl">2</div>
              <div>
                <h3 className="font-semibold text-gray-900">تحويل المعالم</h3>
                <p className="text-gray-600 mt-1">
                  يعالج الخادم بيانات النقاط ليتشكل متجه ثابت، مع الحفاظ على
                  نسبة حجم اليد واتجاهها.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start bg-slate-50 p-5 rounded-3xl border border-slate-200">
              <div className="text-3xl">3</div>
              <div>
                <h3 className="font-semibold text-gray-900">مقارنة وتحليل</h3>
                <p className="text-gray-600 mt-1">
                  يتم استخدام DTW لمقارنة السلاسل الزمنية، ويُستخرج أفضل تطابق
                  باستخدام صوت الجيران الأقرب.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-600 text-white rounded-3xl p-10 shadow-lg">
          <h2 className="text-3xl font-bold">ميزات التطبيق</h2>
          <ul className="mt-8 space-y-4 text-gray-100 text-base leading-8">
            <li>🎯 دعم لهجات عربية متعددة.</li>
            <li>📷 تسجيل مباشر باستخدام الكاميرا.</li>
            <li>🧠 مقارنة ذكية بالإشارات المخزنة.</li>
            <li>📈 إمكانية تحسين قاعدة البيانات بالمساهمات.</li>
            <li>🔒 بنية آمنة وسهلة التطوير.</li>
          </ul>
        </div>
      </section>

      <section className="bg-slate-50 rounded-3xl p-10 grid gap-8 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="text-sm uppercase text-slate-500 tracking-[0.2em]">
            اللهجات المدعومة
          </p>
          <h3 className="text-2xl font-semibold text-gray-900">تنوع لهجات</h3>
          <p className="text-gray-600 leading-7">
            يدعم المشروع تسجيل وترجمة الإشارات عبر عدد من اللهجات المحلية لتعزيز
            الدقة وفهم السياق.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm uppercase text-slate-500 tracking-[0.2em]">
            المستخدمون
          </p>
          <h3 className="text-2xl font-semibold text-gray-900">لمن التطبيق؟</h3>
          <p className="text-gray-600 leading-7">
            للمطورين، الباحثين، المعلمين، وأي شخص يرغب في توثيق وتوسيع قاعدة
            بيانات لغة الإشارة العربية.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm uppercase text-slate-500 tracking-[0.2em]">
            المساهمة
          </p>
          <h3 className="text-2xl font-semibold text-gray-900">كيف تساعد؟</h3>
          <p className="text-gray-600 leading-7">
            سجّل إشارات جديدة، أرسل اقتراحات، أو اخترع طريقة لتحسين الترجمة
            والدقة.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">ابدأ الآن</h2>
            <p className="mt-4 text-gray-600 leading-8">
              جرّب تسجيل إشارة أو ترجمتها فورًا، وشاركنا في تحسين المشروع عبر
              إضافة عينات جديدة أو التواصل معنا مباشرة.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Link
              to="/record"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-4 text-white font-semibold shadow-md hover:bg-blue-700 transition"
            >
              سجّل إشارة جديدة
            </Link>
            <Link
              to="/translate"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-4 text-slate-900 font-semibold hover:bg-slate-100 transition"
            >
              جرّب الترجمة الآن
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-4 text-white font-semibold hover:bg-slate-800 transition"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
