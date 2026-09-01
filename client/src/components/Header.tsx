import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = (
    <>
      <li>
        <NavLink
          to="/"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          الرئيسية
        </NavLink>
      </li>
      {user && (user.role === "admin" || user.role === "sign recorder") && (
        <li>
          <NavLink
            to="/sign-recorder"
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            تسجيل إشارة
          </NavLink>
        </li>
      )}
      {/*
      <li>
        <NavLink
          to="/translate"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          ترجمة إشارة
        </NavLink>
      </li>
      */}
      <li>
        <NavLink
          to="/live-translation"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          ترجمة مباشرة
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/dictionary"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          القاموس
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/about"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          عن الموقع
        </NavLink>
      </li>
      <li>
        <NavLink
          to="/contact"
          className="nav-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          اتصل بنا
        </NavLink>
      </li>
    </>
  );

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
            <ul className="flex space-x-8">{navLinks}</ul>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {!user ? (
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
                <span className="text-gray-700 text-sm">{user.name}</span>
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
            <button
              type="button"
              aria-label="فتح القائمة"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 pb-4">
            <ul className="flex flex-col gap-2 pt-4">{navLinks}</ul>
            <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors text-center"
                  >
                    إنشاء حساب
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-gray-700 text-sm px-3 py-2">
                    {user.name}
                  </span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    تسجيل الخروج
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
