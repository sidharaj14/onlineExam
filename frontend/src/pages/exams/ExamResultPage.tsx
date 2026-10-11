import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ArrowLeft,
  Camera,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Users,
  EyeOff,
  Minimize2,
  Maximize,
} from "lucide-react";
import { examService } from "../../services/examService";
import type { ExamResult } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

export const ExamResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attemptId) {
      loadResult(attemptId);
    }
  }, [attemptId]);

  const loadResult = async (id: string) => {
    try {
      setLoading(true);
      const data = await examService.getExamResult(id);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load examination results.");
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Calculating grades and integrity audit trail...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Result Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">{error || "Could not retrieve submission."}</p>
        <Button className="mt-5" onClick={() => navigate("/student/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const isTerminated = result.status === "TERMINATED_VIOLATION";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-tight block">
                Official Examination Scorecard & Forensic Audit
              </span>
              <span className="text-xs text-indigo-600 font-medium">
                {result.course_code} • {result.exam_title}
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate("/student/dashboard")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            Exam Lobby
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Scorecard Hero Banner */}
        <div
          className={`p-6 sm:p-8 rounded-2xl text-white shadow-lg border relative overflow-hidden ${
            isTerminated
              ? "bg-linear-to-r from-red-950 via-rose-900 to-slate-950 border-rose-600/40"
              : result.passed
              ? "bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-900 border-emerald-600/30"
              : "bg-linear-to-r from-rose-900 via-rose-800 to-slate-900 border-rose-600/30"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">
                {isTerminated ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                    TERMINATED ON 3RD WARNING STRIKE
                  </>
                ) : result.passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Examination Passed
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Needs Improvement
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {result.candidate_name}
              </h1>
              <p className="text-white/80 text-xs sm:text-sm mt-1">
                {isTerminated
                  ? `Terminated early on ${new Date(result.submitted_at || result.started_at).toLocaleString()}`
                  : `Completed on ${new Date(result.submitted_at || result.started_at).toLocaleString()}`}
              </p>
            </div>

            {/* Score Display */}
            <div className="flex items-center gap-4 bg-black/30 backdrop-blur-xs p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-white/70 block tracking-wider">
                  Score Achieved
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white">
                  {result.score}{" "}
                  <span className="text-lg font-medium text-white/70">/ {result.total_marks}</span>
                </span>
              </div>
              <div
                className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-base ${
                  isTerminated
                    ? "border-rose-400/50 text-rose-200"
                    : "border-white/30 text-white"
                }`}
              >
                {result.percentage}%
              </div>
            </div>
          </div>
        </div>

        {/* 3-Strike Proctoring Violations Log (When Violations Incurred) */}
        {result.violations && result.violations.length > 0 && (
          <Card className="p-6 border-rose-200 bg-rose-50/40 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3>Proctoring Infractions & Warning Audit Log ({result.violations.length} / 3 Strikes)</h3>
              </div>
              {isTerminated && (
                <span className="px-3 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider">
                  Auto-Terminated
                </span>
              )}
            </div>

            <div className="space-y-3">
              {result.violations.map((v, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{v.warning_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-900 uppercase tracking-wide">
                          {v.violation_type === "MULTIPLE_FACES" && (
                            <span className="inline-flex items-center gap-1 text-rose-700">
                              <Users className="w-3.5 h-3.5" /> 2nd Person Detected
                            </span>
                          )}
                          {v.violation_type === "NO_FACE" && (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <EyeOff className="w-3.5 h-3.5" /> Candidate Absent / No Face
                            </span>
                          )}
                          {v.violation_type === "TAB_SWITCH" && (
                            <span className="inline-flex items-center gap-1 text-indigo-700">
                              <Minimize2 className="w-3.5 h-3.5" /> Tab Switching Violation
                            </span>
                          )}
                          {v.violation_type === "FULLSCREEN_EXIT" && (
                            <span className="inline-flex items-center gap-1 text-rose-700">
                              <Maximize className="w-3.5 h-3.5" /> Fullscreen Lockdown Exit
                            </span>
                          )}
                          {!["MULTIPLE_FACES", "NO_FACE", "TAB_SWITCH", "FULLSCREEN_EXIT"].includes(v.violation_type) && v.violation_type}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">{v.message}</p>
                    </div>
                  </div>

                  {v.snapshot_url && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img
                        src={v.snapshot_url}
                        alt="Violation Evidence"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Verification Snapshot & Exam Audit Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Camera Verification Snapshot */}
          <Card className="p-5 border-slate-200 bg-white rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pre-Exam Biometrics
                </span>
                <Camera className="w-4 h-4 text-indigo-600" />
              </div>

              {result.verification_photo_url ? (
                <div className="aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-3 relative">
                  <img
                    src={result.verification_photo_url}
                    alt="Candidate Verification"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-emerald-900/90 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                    Baseline Authenticated
                  </div>
                </div>
              ) : (
                <div className="aspect-4/3 rounded-xl border-dashed border-2 border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 mb-3">
                  No Snapshot Recorded
                </div>
              )}
            </div>

            <span className="text-[11px] text-slate-500 block leading-tight">
              Biometric reference image verified before examination entry.
            </span>
          </Card>

          {/* Performance & Time Metrics */}
          <Card className="p-5 border-slate-200 bg-white rounded-2xl md:col-span-2 flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Session Telemetry & Audit Integrity
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Time Active</span>
                <span className="text-base font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {formatSeconds(result.time_spent_seconds)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Questions Answered</span>
                <span className="text-base font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  {result.answered_count} / {result.total_questions}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Passing Threshold</span>
                <span className="text-base font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  {result.passing_marks} Marks
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
              <span>
                Integrity Status:{" "}
                {isTerminated ? (
                  <strong className="text-rose-700">Disqualified (3 Strikes)</strong>
                ) : (
                  <strong className="text-emerald-700">Audit Trail Clean</strong>
                )}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Session: {result.status}</span>
            </div>
          </Card>
        </div>

        {/* Question-by-Question Detailed Review */}
        <Card className="p-6 border-slate-200 bg-white rounded-2xl shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Detailed Question Breakdown
          </h3>

          <div className="space-y-4">
            {result.question_breakdown.map((item, idx) => (
              <div
                key={item.question_id}
                className={`p-4 rounded-xl border transition-colors ${
                  item.is_correct
                    ? "bg-emerald-50/40 border-emerald-200"
                    : "bg-rose-50/30 border-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Q{idx + 1}.</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {item.question_text}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      item.is_correct
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {item.is_correct ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> +{item.marks} Marks
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> 0 Marks
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-3">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Your Response:</span>
                    <span
                      className={`font-semibold ${
                        item.is_correct ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {item.user_answer ? `Option ${item.user_answer}` : "Unanswered"}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Correct Answer:</span>
                    <span className="font-semibold text-slate-800">
                      Option {Array.isArray(item.correct_answer) ? item.correct_answer.join(", ") : item.correct_answer}
                    </span>
                  </div>
                </div>

                {item.explanation && (
                  <div className="mt-2.5 text-xs text-slate-600 bg-white/60 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                    <strong className="text-indigo-900">Explanation:</strong> {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};
