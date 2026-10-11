import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  BookOpen,
  History,
  Award,
  BarChart3,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login/student");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: "/student/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Examinations",
      path: "/student/exams",
      icon: BookOpen,
    },
    {
      label: "My Attempts",
      path: "/student/attempts",
      icon: History,
    },
    {
      label: "Results",
      path: "/student/results",
      icon: Award,
    },
    {
      label: "Performance",
      path: "/student/performance",
      icon: BarChart3,
    },
    {
      label: "My Profile",
      path: "/student/profile",
      icon: User,
    },
  ];

  const studentName = user?.full_name || "Enrolled Student";
  const studentEmail = user?.email || "";
  const studentId = user?.student_profile?.student_id_number || "STU-2026";
  const courseName = user?.student_profile?.course || "Computer Science";
  const semesterNum = user?.student_profile?.semester || 4;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/student/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ExamGuard <span className="text-indigo-400">AI</span>
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Student Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header: Candidate Snapshot & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white tracking-tight">{studentName}</span>
              <span className="text-[11px] text-slate-400">
                {courseName} &bull; Sem {semesterNum}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-xs font-bold uppercase">
              {studentName.charAt(0) || "S"}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Sign out of student account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Persistent Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 gap-6">
          {/* Candidate Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base">
                {studentName.charAt(0) || "S"}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 truncate">{studentName}</div>
                <div className="text-[11px] text-slate-500 truncate">{studentEmail}</div>
                <div className="text-[10px] font-mono text-indigo-600 font-semibold">{studentId}</div>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Status</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Verified Candidate
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Student Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
                </Link>
              );
            })}
          </nav>

          {/* Institutional Compliance Notice */}
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800">
            <div className="flex items-center gap-2 font-bold text-indigo-400 text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Proctoring Security</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All examinations require camera and microphone access. Violations are logged directly into your academic audit trail.
            </p>
            <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-800 flex items-center justify-between">
              <span>ExamGuard AI Engine</span>
              <span className="text-emerald-400 font-mono">ACTIVE</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    <span className="font-extrabold text-sm text-slate-900">Student Portal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4">
                  <div className="text-xs font-bold text-slate-900">{studentName}</div>
                  <div className="text-[11px] text-slate-500">{studentEmail}</div>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
