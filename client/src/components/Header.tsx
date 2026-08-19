import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="shrink-0">
            <Link to="/" className="text-4xl font-bold text-blue-600">
              إشارة
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <ul className="flex space-x-8">
              <li>
                <NavLink to="/" className="nav-link">
                  الرئيسية
                </NavLink>
              </li>
              {token && (
                <li>
                  <NavLink to="/sign-recorder" className="nav-link">
                    تسجيل إشارة
                  </NavLink>
                </li>
              )}
              <li>
                <NavLink to="/translate" className="nav-link">
                  ترجمة إشارة
                </NavLink>
              </li>
              <li>
                <NavLink to="/about" className="nav-link">
                  عن الموقع
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className="nav-link">
                  اتصل بنا
                </NavLink>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-4">
            {!token ? (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  إنشاء حساب
                </Link>
              </>
            ) : (
              <>
                <span className="text-gray-700 text-sm">
                  {JSON.parse(localStorage.getItem("user") || "{}").name ||
                    "مستخدم"}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  تسجيل الخروج
                </button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600 focus:outline-none">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
