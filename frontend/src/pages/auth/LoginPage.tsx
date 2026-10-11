import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  GraduationCap,
  Briefcase,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  X,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { authService } from "../../services/authService";
import { teacherService } from "../../services/teacherService";
import { useAuthStore } from "../../store/useAuthStore";
import { extractErrorMessage } from "../../services/api";

type UserRoleOption = "student" | "teacher";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, loginAsDemo } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<UserRoleOption>("student");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPendingOtpPrompt, setShowPendingOtpPrompt] = useState(false);

  const handleRoleChange = (role: UserRoleOption) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowPendingOtpPrompt(false);
  };

  const handlePreFill = (role: UserRoleOption) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAuthMode("password");
    if (role === "student") {
      setEmail("student@example.com");
      setPassword("student123");
    } else {
      setEmail("teacher@example.com");
      setPassword("admin123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Please enter your institutional email address.");
      return;
    }

    if (authMode === "password") {
      if (!password) {
        setErrorMessage("Please enter your password or verification OTP.");
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        if (selectedRole === "teacher") {
          // Dedicated teacher authentication
          const response = await teacherService.loginTeacherWithPassword(cleanEmail, password.trim());
          setAuth(response.access_token, response.user);
          if (response.user.role === "admin" || response.user.role === "super_admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/teacher/dashboard");
          }
        } else {
          // Standard student authentication
          const response = await authService.login({
            email: cleanEmail,
            password: password.trim(),
          });

          if (response.user.role !== "student") {
            setErrorMessage(
              `This account has faculty/administrator permissions (${response.user.role}). Please select 'Login as Teacher' to enter.`
            );
            setIsLoading(false);
            return;
          }

          setAuth(response.access_token, response.user);
          navigate("/student/dashboard");
        }
      } catch (err: any) {
        const msg = extractErrorMessage(err);
        if (selectedRole === "teacher" && (msg.toLowerCase().includes("not authorized") || msg.toLowerCase().includes("denied"))) {
          setErrorMessage("Unauthorized account role. Please use student login.");
        } else {
          setErrorMessage(msg);
        }
        if (msg.toLowerCase().includes("pending") || msg.toLowerCase().includes("otp")) {
          setShowPendingOtpPrompt(true);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // OTP Mode
      if (!otpCode || otpCode.trim().length !== 6) {
        setErrorMessage("Please enter the complete 6-digit verification OTP.");
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);

      try {
        if (selectedRole === "teacher") {
          const response = await teacherService.loginTeacherWithOtp(cleanEmail, otpCode.trim());
          setAuth(response.access_token, response.user);
          if (response.user.role === "admin" || response.user.role === "super_admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/teacher/dashboard");
          }
        } else {
          const response = await authService.loginWithOtp(cleanEmail, otpCode.trim());

          if (response.user.role !== "student") {
            setErrorMessage(
              `This account has faculty/administrator permissions (${response.user.role}). Please select 'Login as Teacher' to enter.`
            );
            setIsLoading(false);
            return;
          }

          setAuth(response.access_token, response.user);
          navigate("/student/dashboard");
        }
      } catch (err: any) {
        const msg = extractErrorMessage(err);
        if (selectedRole === "teacher" && (msg.toLowerCase().includes("not authorized") || msg.toLowerCase().includes("denied"))) {
          setErrorMessage("Unauthorized account role. Please use student login.");
        } else {
          setErrorMessage(msg);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your institutional email first to receive an OTP.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSendingOtp(true);

    try {
      if (selectedRole === "teacher") {
        const res = await teacherService.requestTeacherOtp(cleanEmail);
        setSuccessMessage(
          res.message || "A 6-digit faculty verification code has been dispatched to your email."
        );
      } else {
        const res = await authService.requestLoginOtp(cleanEmail);
        setSuccessMessage(
          res.message || "A 6-digit verification code has been dispatched to your email."
        );
      }
      setAuthMode("otp");
    } catch (err: any) {
      const msg = extractErrorMessage(err);
      if (selectedRole === "teacher" && (msg.toLowerCase().includes("not authorized") || msg.toLowerCase().includes("not registered"))) {
        setErrorMessage("Unauthorized account role. Please use student login.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleDemoSignIn = async (role: "student" | "teacher" | "admin") => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (role === "teacher") {
        const res = await teacherService.loginTeacherWithPassword("teacher@example.com", "admin123");
        setAuth(res.access_token, res.user);
        navigate("/teacher/dashboard");
        return;
      } else if (role === "admin") {
        const res = await authService.login({ email: "admin@example.com", password: "admin123" });
        setAuth(res.access_token, res.user);
        navigate("/admin/dashboard");
        return;
      } else {
        const res = await authService.login({ email: "student@example.com", password: "student123" });
        setAuth(res.access_token, res.user);
        navigate("/student/dashboard");
        return;
      }
    } catch {
      loginAsDemo(role);
      if (role === "teacher") {
        navigate("/teacher/dashboard");
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Branding Header */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

        <h1 className="mt-3 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          ExamGuard <span className="text-indigo-600">AI</span>
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          AI-Powered Secure Online Examination & Proctoring System
        </p>

        {/* Primary Sign In / Sign Up Switcher Tabs */}
        <div className="mt-5 flex rounded-xl bg-slate-200/80 p-1 border border-slate-200 shadow-inner">
          <button
            type="button"
            className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all"
          >
            Sign In
          </button>
          <Link
            to="/register"
            className="flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition-all"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="py-7 px-6 sm:px-8 shadow-sm border border-slate-200 bg-white rounded-xl">
          {/* Role Selection: Login as Student vs Login as Teacher */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Portal Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRoleChange("student")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === "student"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      selectedRole === "student"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">Login as Student</span>
                </div>
                <span className="text-[10px] text-slate-500 line-clamp-1">
                  Candidate & test evaluations
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("teacher")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === "teacher"
                    ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      selectedRole === "teacher"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold">Login as Teacher</span>
                </div>
                <span className="text-[10px] text-slate-500 line-clamp-1">
                  Faculty author & proctor
                </span>
              </button>
            </div>
          </div>

          {/* Sign-In Mode Switcher (Password vs OTP) */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                authMode === "password"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                authMode === "otp"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Email OTP Login
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50/90 border border-rose-200 border-l-4 border-l-rose-500 text-rose-900 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs mb-0.5">Authentication Error</h4>
                    <p className="text-rose-700 text-xs leading-relaxed font-medium">{errorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100 transition-colors"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {showPendingOtpPrompt && authMode === "password" && (
                <div className="mt-3 pt-2.5 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-rose-700 font-medium">Verification OTP required:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("otp");
                      setErrorMessage(null);
                      setShowPendingOtpPrompt(false);
                    }}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-md border border-rose-200 shadow-2xs hover:bg-indigo-50 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Enter 6-Digit OTP &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {selectedRole === "teacher" ? "Faculty Email" : "Institutional Student Email"}
                </label>
                <button
                  type="button"
                  onClick={() => handlePreFill(selectedRole)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-750 font-medium inline-flex items-center gap-1 cursor-pointer"
                  title="Pre-fill standard credentials for this role"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Fill {selectedRole === "teacher" ? "Teacher" : "Student"} Creds</span>
                </button>
              </div>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    selectedRole === "teacher" ? "teacher@example.com" : "student@example.com"
                  }
                  required
                  className="pl-9 text-xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {authMode === "password" ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password / OTP Code
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password or 6-digit OTP"
                    required
                    className="pl-9 pr-9 text-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    6-Digit Verification OTP
                  </label>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSendingOtp}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingOtp ? "animate-spin" : ""}`} />
                    {isSendingOtp ? "Sending..." : "Send / Resend OTP"}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="e.g. 752212"
                    required
                    className="pl-9 font-mono tracking-widest text-sm"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the 6-digit code received in your email inbox to verify and sign in immediately.
                </p>
              </div>
            )}

            <Button
              type="submit"
              size="md"
              className="w-full font-bold shadow-xs mt-2"
              isLoading={isLoading}
            >
              <span>
                {authMode === "password"
                  ? `Sign In as ${selectedRole === "teacher" ? "Teacher" : "Student"}`
                  : `Verify & Enter ${selectedRole === "teacher" ? "Teacher Portal" : "Student Portal"}`}
              </span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Academic Demo Evaluation Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              1-Click Demo Evaluation Quick Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn("student")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Student Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn("teacher")}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-slate-700" />
                <span>Teacher Demo</span>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign Up as Student
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
