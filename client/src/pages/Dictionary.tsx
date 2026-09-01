import { useState, useEffect } from "react";
import { apiRequest } from "../utils/api";
import { AlertCircle, Loader2 } from "lucide-react";

interface DictionaryWord {
  id: number;
  arabicText: string;
}

export default function Dictionary() {
  const [dictionary, setDictionary] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDictionary = async () => {
      try {
        const response = await apiRequest("/dictionary");
        setDictionary(response as DictionaryWord[]);
      } catch (err) {
        setError("فشل في تحميل القاموس. يرجى المحاولة مرة أخرى.");
      } finally {
        setLoading(false);
      }
    };

    fetchDictionary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل القاموس...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">القاموس</h1>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {dictionary.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                لا توجد كلمات في القاموس حالياً.
              </div>
            ) : (
              dictionary.map((word) => (
                <div
                  key={word.id}
                  className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 text-center transition-all duration-200 hover:shadow-md"
                >
                  <p className="text-lg font-medium text-gray-800" dir="rtl">
                    {word.arabicText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow-md p-4 inline-block">
            <p className="text-gray-600">
              إجمالي الكلمات:{" "}
              <span className="font-bold text-blue-600">
                {dictionary.length}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
