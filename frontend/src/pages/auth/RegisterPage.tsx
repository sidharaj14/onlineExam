import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Lock,
  Mail,
  User,
  BookOpen,
  Hash,
  Building,
  X,
  AlertOctagon,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/useAuthStore";
import { extractErrorMessage } from "../../services/api";

function maskEmail(emailStr: string): string {
  if (!emailStr || !emailStr.includes("@")) return emailStr;
  const [local, domain] = emailStr.split("@");
  if (local.length <= 2) {
    return `${local[0] || "s"}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Step 1: Form fields
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [course, setCourse] = useState("B.Tech Computer Science");
  const [semester, setSemester] = useState<number>(4);
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [studentId, setStudentId] = useState("");

  // Step 2: OTP fields (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Input refs for auto-focusing next digit
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if there was an in-progress registration stored in sessionStorage
  useEffect(() => {
    const savedEmail = sessionStorage.getItem("pending_reg_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setStep(2);
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    let timer: any;
    if (step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  // Step 1 Submit: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Please provide a valid institutional email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter identical passwords.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({
        email: cleanEmail,
        password,
        full_name: fullName.trim(),
        role: "student",
        student_id_number: studentId.trim() || undefined,
        department: department.trim() || undefined,
        course: course.trim() || undefined,
        semester: Number(semester) || 1,
      });

      sessionStorage.setItem("pending_reg_email", cleanEmail);
      setSuccessMessage(
        `A 6-digit verification code has been dispatched to ${maskEmail(cleanEmail)}.`
      );
      setStep(2);
      setResendCooldown(60);
      setCanResend(false);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handling
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are entered
    if (value && index === 5) {
      const fullCode = newDigits.join("");
      if (fullCode.length === 6 && !fullCode.includes("")) {
        submitOtpCode(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
      submitOtpCode(pastedData);
    }
  };

  const submitOtpCode = async (otpCode: string) => {
    if (otpCode.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the OTP.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.verifyOtp({
        email: cleanEmail,
        otp_code: otpCode,
      });

      sessionStorage.removeItem("pending_reg_email");
      setAuth(response.access_token, response.user);
      navigate("/student/dashboard");
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Submit: Verify OTP & Register
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join("");
    submitOtpCode(otpCode);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await authService.resendOtp(email.trim().toLowerCase());
      setSuccessMessage(`A fresh verification code has been dispatched to ${maskEmail(email)}.`);
      setResendCooldown(60);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

        <h1 className="mt-3 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          ExamGuard <span className="text-indigo-600">AI</span>
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          {step === 1
            ? "Create your student account to take proctored examinations"
            : `Enter the 6-digit confirmation code dispatched to ${maskEmail(email)}`}
        </p>

        {/* Primary Sign In / Sign Up Switcher Tabs */}
        {step === 1 && (
          <div className="mt-5 flex rounded-xl bg-slate-200/80 p-1 border border-slate-200 shadow-inner">
            <Link
              to="/login"
              className="flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition-all"
            >
              Sign In
            </Link>
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-indigo-700 shadow-sm transition-all"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <Card className="py-7 px-6 sm:px-8 shadow-sm border border-slate-200 bg-white rounded-xl">
          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50/90 border border-rose-200 border-l-4 border-l-rose-500 text-rose-900 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900 text-xs mb-0.5">Registration Error</h4>
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
            </div>
          )}

          {successMessage && !errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 text-xs"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Student ID / Roll No.
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="e.g. STU-2026-042"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="pl-9 text-xs"
                    />
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institutional Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="candidate@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  A 6-digit OTP verification code will be sent to this email address to verify your candidate profile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course / Degree Program
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="e.g. B.Tech Computer Science"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="pl-9 text-xs"
                    />
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Department
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="pl-9 text-xs"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 text-xs"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Button type="submit" size="md" className="w-full font-bold shadow-xs" isLoading={isLoading}>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                    Sign In here
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* STEP 2: 6-Digit OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-950 leading-relaxed">
                <p className="font-semibold mb-1">Verification Code Dispatched</p>
                A 6-digit confirmation code was dispatched to <strong>{maskEmail(email)}</strong>.
                Please inspect your institutional inbox. The verification code remains active for <strong>30 minutes</strong>.
              </div>

              {/* 6 Digits Box Container */}
              <div>
                <label className="block text-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Enter 6-Digit Code
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border border-slate-300 text-slate-900 bg-white shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" size="md" className="w-full font-bold shadow-xs" isLoading={isLoading}>
                <span>Verify OTP & Complete Registration</span>
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>

              {/* Resend OTP / Change Details */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem("pending_reg_email");
                    setStep(1);
                  }}
                  className="text-slate-600 hover:text-slate-800 underline cursor-pointer"
                >
                  Edit Registration Details
                </button>
                <button
                  type="button"
                  disabled={!canResend || isLoading}
                  onClick={handleResendOtp}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    canResend
                      ? "text-indigo-600 hover:text-indigo-500 cursor-pointer"
                      : "text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  {canResend ? "Resend Code" : `Resend in ${resendCooldown}s`}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
