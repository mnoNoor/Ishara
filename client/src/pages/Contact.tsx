import { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "suggestion",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted:", form);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", email: "", subject: "suggestion", message: "" });
    }, 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <p className="text-4xl font-semibold text-blue-600 uppercase tracking-[0.2em]">
          تواصل معنا
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-gray-900">
          شاركنا رأيك أو ساعد المشروع في النمو
        </h1>
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto leading-8">
          هذا المشروع مفتوح للتطوير والمساهمة. اكتب لنا عن اقتراح أو خطأ واجهته،
          أو راسلنا إذا كنت ترغب في التطوع بتسجيل إشارات جديدة.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {submitted ? (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
              <div className="text-5xl">✅</div>
              <h2 className="mt-5 text-2xl font-semibold text-green-900">
                تم استلام رسالتك
              </h2>
              <p className="mt-3 text-gray-700 leading-7">
                شكرًا لتواصلك معنا! سنطلع على طلبك وسنرد عليك في أقرب فرصة.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    الاسم *
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="أدخل اسمك"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    البريد الإلكتروني *
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="example@domain.com"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  نوع الرسالة
                </span>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="suggestion">💡 اقتراح تطوير</option>
                  <option value="bug">🐛 الإبلاغ عن خطأ</option>
                  <option value="volunteer">🤝 التطوع بتسجيل إشارات</option>
                  <option value="other">📝 أخرى</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  الرسالة *
                </span>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={6}
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  placeholder="اكتب رسالتك هنا..."
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-3xl bg-blue-600 px-6 py-3 text-white font-semibold shadow-md transition hover:bg-blue-700"
              >
                إرسال الرسالة
              </button>

              <p className="text-xs text-gray-500 text-center">
                سيتم استخدام هذه المعلومات فقط للرد على استفسارك.
              </p>
            </form>
          )}
        </div>

        <div className="space-y-8 rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              طرق الاتصال
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">
              كن على تواصل
            </h2>
            <p className="text-gray-600 leading-7">
              يمكنك أيضًا التواصل مباشرة عبر GitHub أو البريد الإلكتروني لتبادل
              الأفكار أو إرسال ملاحظات تقنية.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="https://github.com/mnoNoor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-gray-900 transition hover:border-blue-300 hover:shadow-sm"
            >
              <span className="text-2xl">🐙</span>
              <div>
                <p className="font-semibold">GitHub</p>
                <p className="text-sm text-slate-500">
                  تابع المشروع أو افتح issue
                </p>
              </div>
            </a>
            <a
              href="mailto:mnonoor@example.com"
              className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-gray-900 transition hover:border-blue-300 hover:shadow-sm"
            >
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold">البريد الإلكتروني</p>
                <p className="text-sm text-slate-500">
                  أرسل رسالة مباشرة إلى المطور
                </p>
              </div>
            </a>
          </div>

          <div className="rounded-3xl bg-blue-600 p-6 text-white">
            <h3 className="text-xl font-semibold">نصيحة</h3>
            <p className="mt-3 leading-7 text-slate-100">
              إذا أردت أن يضم المشروع إشارات جديدة بدقة أعلى، شاركنا تصويرك وأنت
              تؤدي الإشارة بوضوح مع شرح النقاط الرئيسية للحركة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
