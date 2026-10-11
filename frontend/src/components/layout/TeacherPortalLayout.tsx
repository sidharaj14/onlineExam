import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  GraduationCap,
  Activity,
  AlertTriangle,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  School,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

interface TeacherPortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TeacherPortalLayout: React.FC<TeacherPortalLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Overview",
      path: "/teacher/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "My Exams",
      path: "/teacher/exams",
      icon: BookOpen,
    },
    {
      label: "Create Exam",
      path: "/teacher/create-exam",
      icon: PlusCircle,
    },
    {
      label: "Students & Results",
      path: "/teacher/results",
      icon: GraduationCap,
    },
    {
      label: "Live Monitoring",
      path: "/teacher/monitoring",
      icon: Activity,
    },
    {
      label: "Violations",
      path: "/teacher/violations",
      icon: AlertTriangle,
    },
    {
      label: "Profile",
      path: "/teacher/profile",
      icon: User,
    },
  ];

  const teacherName = user?.full_name || "Faculty Professor";
  const teacherEmail = user?.email || "teacher@example.com";
  const employeeCode = user?.admin_profile?.employee_code || "FAC-102";
  const adminLevel = user?.admin_profile?.admin_level || "Faculty & Invigilator";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              title="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/teacher/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ExamGuard <span className="text-indigo-400">AI</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  Faculty Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-white truncate max-w-[180px]">
                {teacherName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {employeeCode} • {adminLevel}
              </span>
            </div>

            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
              {teacherName.charAt(0)}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Sidebar (col-span-3) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-[#0f172a] text-white rounded-2xl p-4 shadow-sm border border-slate-800 sticky top-24">
            {/* Teacher Identity Card */}
            <div className="p-3.5 mb-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                <School className="w-5 h-5 text-indigo-200" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{teacherName}</div>
                <div className="text-[11px] text-slate-400 truncate">{teacherEmail}</div>
                <div className="text-[10px] text-indigo-400 font-mono mt-0.5">{employeeCode}</div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== "/teacher/dashboard" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                  </Link>
                );
              })}

              <div className="pt-3 mt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>

            {/* AI Proctoring Engine Badge */}
            <div className="mt-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-[11px] text-slate-400 leading-tight">
                <span className="font-semibold text-slate-200">OpenCV & YOLOv4-tiny</span>
                <div>Active continuous proctoring</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
            <div className="w-72 bg-[#0f172a] text-white p-5 flex flex-col justify-between h-full shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    <span className="font-extrabold text-white text-base">ExamGuard AI</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || (item.path !== "/teacher/dashboard" && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area (col-span-9) */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                {title && <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
                {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};
