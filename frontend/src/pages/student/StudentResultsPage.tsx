import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Award,
  AlertTriangle,
  ShieldCheck,
  FileText,
  BookOpen,
} from "lucide-react";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";
import { Card } from "../../components/common/Card";
import { examService } from "../../services/examService";
import { useAuthStore } from "../../store/useAuthStore";
import type { StudentAnalytics, ExamResult } from "../../types/exam.types";

export const StudentResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    searchParams.get("attemptId") || null
  );
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    loadAttempts();
  }, [user?.email, user?.id]);

  useEffect(() => {
    if (selectedAttemptId) {
      loadResult(selectedAttemptId);
    }
  }, [selectedAttemptId]);

  const loadAttempts = async () => {
    try {
      setLoadingList(true);
      const data = await examService.getStudentAnalytics(user?.email, user?.id);
      setAnalytics(data);

      // If no attempt selected, pick the first one
      if (!selectedAttemptId && data.recent_attempts && data.recent_attempts.length > 0) {
        setSelectedAttemptId(data.recent_attempts[0].attempt_id);
      }
    } catch (err) {
      console.error("Error loading student attempts:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadResult = async (attemptId: string) => {
    try {
      setLoadingResult(true);
      const data = await examService.getExamResult(attemptId);
      setResult(data);
    } catch (err) {
      console.error("Error loading exam result:", err);
    } finally {
      setLoadingResult(false);
    }
  };

  const attempts = analytics?.recent_attempts || [];

  return (
    <StudentPortalLayout
      title="Examination Results & Scorecards"
      subtitle="Detailed question-by-question scoring and verified proctoring audit reports"
    >
      {loadingList ? (
        <Card className="p-8 text-center animate-pulse border-slate-200">
          <p className="text-xs text-slate-400">Loading student results...</p>
        </Card>
      ) : attempts.length === 0 ? (
        <Card className="p-12 text-center border-slate-200 bg-white">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Scorecards Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            You have not submitted any examinations yet. Complete an examination to generate your verified scorecard.
          </p>
          <Link
            to="/student/exams"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Go to Examinations</span>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Selector Dropdown / Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Select Completed Assessment
              </span>
              <span className="text-xs text-slate-400">
                Choose an attempt to inspect detailed scorecard
              </span>
            </div>

            <select
              value={selectedAttemptId || ""}
              onChange={(e) => {
                setSelectedAttemptId(e.target.value);
                setSearchParams({ attemptId: e.target.value });
              }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {attempts.map((att) => (
                <option key={att.attempt_id} value={att.attempt_id}>
                  {att.course_code}: {att.exam_title} — {att.percentage.toFixed(0)}% (
                  {new Date(att.started_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Result Content */}
          {loadingResult ? (
            <Card className="p-12 text-center animate-pulse border-slate-200">
              <p className="text-xs text-slate-400">Fetching scorecard details...</p>
            </Card>
          ) : result ? (
            <div className="space-y-6">
              {/* Scorecard Hero Banner */}
              <div
                className={`p-6 rounded-2xl border text-white shadow-lg relative overflow-hidden ${
                  result.passed
                    ? "bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 border-emerald-700/50"
                    : "bg-gradient-to-r from-rose-900 via-slate-900 to-slate-900 border-rose-700/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold bg-white/10 border border-white/20 mb-2">
                      {result.course_code}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{result.exam_title}</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Submitted on{" "}
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleString()
                        : "N/A"}{" "}
                      &bull; Candidate: {result.candidate_name}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-xs self-start sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-300 uppercase font-bold block">
                        Final Score
                      </span>
                      <span className="text-3xl font-black">
                        {result.score} / {result.total_marks}
                      </span>
                    </div>
                    <div className="border-l border-white/20 pl-4 text-center">
                      <span className="text-[10px] text-slate-300 uppercase font-bold block">
                        Result
                      </span>
                      <span
                        className={`text-sm font-extrabold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
                          result.passed
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                        }`}
                      >
                        {result.passed ? "PASSED" : "FAILED"} ({result.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Questions Attempted
                  </span>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {result.answered_count} / {result.total_questions}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {Math.round((result.answered_count / (result.total_questions || 1)) * 100)}% completion
                  </span>
                </Card>

                <Card className="p-4 border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Passing Criteria
                  </span>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {result.passing_marks} Marks
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Required to clear assessment
                  </span>
                </Card>

                <Card className="p-4 border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Time Spent
                  </span>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {Math.floor(result.time_spent_seconds / 60)}m {result.time_spent_seconds % 60}s
                  </div>
                  <span className="text-[11px] text-slate-500">Total duration elapsed</span>
                </Card>

                <Card className="p-4 border-slate-200 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    AI Integrity Rating
                  </span>
                  <div className="text-xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5" />
                    <span>{(result.integrity_score ?? 100).toFixed(0)}%</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {result.violations_count} warning{result.violations_count === 1 ? "" : "s"} logged
                  </span>
                </Card>
              </div>

              {/* Proctoring Violations Log (if any) */}
              {result.violations && result.violations.length > 0 && (
                <Card className="p-5 border-amber-200 bg-amber-50/50">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Proctoring Warnings Recorded During Session
                  </h3>
                  <div className="space-y-2 mt-3">
                    {result.violations.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                            {v.warning_number}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800">{v.violation_type}</span>
                            <p className="text-[11px] text-slate-500">{v.message}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(v.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Question Breakdown */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Question-by-Question Audit Breakdown
                </h3>

                {result.question_breakdown.map((item, idx) => (
                  <Card
                    key={item.question_id}
                    className={`p-5 border bg-white ${
                      item.is_correct ? "border-emerald-200" : "border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.question_text}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                          item.is_correct
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {item.points_awarded ?? (item.is_correct ? item.marks : 0)} / {item.max_marks ?? item.marks} Pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Your Selected Answer
                        </span>
                        <span
                          className={`font-semibold ${
                            item.is_correct ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {Array.isArray(item.user_answer)
                            ? item.user_answer.join(", ")
                            : item.user_answer || "Not Answered"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                          Correct Answer
                        </span>
                        <span className="font-semibold text-emerald-800">
                          {Array.isArray(item.correct_answer)
                            ? item.correct_answer.join(", ")
                            : item.correct_answer}
                        </span>
                      </div>
                    </div>

                    {item.explanation && (
                      <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950">
                        <span className="font-bold text-[11px] text-indigo-900 block mb-0.5">
                          Academic Explanation:
                        </span>
                        {item.explanation}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </StudentPortalLayout>
  );
};
