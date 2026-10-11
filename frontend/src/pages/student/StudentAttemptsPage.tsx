import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  History,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShieldCheck,
  PlayCircle,
} from "lucide-react";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { examService } from "../../services/examService";
import { useAuthStore } from "../../store/useAuthStore";
import type { StudentAnalytics } from "../../types/exam.types";

export const StudentAttemptsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "passed" | "failed">("all");

  useEffect(() => {
    loadAttempts();
  }, [user?.email, user?.id]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const data = await examService.getStudentAnalytics(user?.email, user?.id);
      setAnalytics(data);
    } catch (err) {
      console.error("Error loading attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  const attempts = analytics?.recent_attempts || [];
  const filteredAttempts = attempts.filter((att) => {
    if (filter === "passed") return att.passed;
    if (filter === "failed") return !att.passed;
    return true;
  });

  return (
    <StudentPortalLayout
      title="My Examination Attempts"
      subtitle="Complete chronological audit trail of all test submissions and proctoring assessments"
    >
      {/* Top Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex rounded-lg bg-slate-200/80 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Attempts ({attempts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("passed")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "passed" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Passed ({attempts.filter((a) => a.passed).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("failed")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "failed" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Failed ({attempts.filter((a) => !a.passed).length})
          </button>
        </div>

        <Link
          to="/student/exams"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Browse Available Tests &rarr;</span>
        </Link>
      </div>

      {loading ? (
        <Card className="p-8 text-center animate-pulse border-slate-200">
          <p className="text-xs text-slate-400">Loading attempt records...</p>
        </Card>
      ) : filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center border-slate-200 bg-white">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Attempts Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            {filter === "all"
              ? "You have not undertaken any proctored examinations yet. Complete your first test to view your scorecard."
              : `No examination attempts matched the "${filter}" filter criteria.`}
          </p>
          <Button
            size="sm"
            onClick={() => navigate("/student/exams")}
            className="bg-indigo-600 hover:bg-indigo-700 font-bold"
          >
            Take An Examination
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Examination</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-center">AI Integrity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((att) => (
                  <tr key={att.attempt_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {att.course_code}
                        </span>
                        <span className="truncate max-w-[240px]">{att.exam_title}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(att.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(att.started_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span>{att.score}</span>
                      <span className="text-slate-400 font-normal"> / {att.total_marks}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          att.passed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {att.passed ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Passed ({att.percentage.toFixed(0)}%)
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Failed ({att.percentage.toFixed(0)}%)
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          (att.violations_count || 0) === 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {att.integrity_score ? `${att.integrity_score.toFixed(0)}%` : "100%"}
                        {(att.violations_count || 0) > 0 && (
                          <span className="text-[10px] text-amber-600">({att.violations_count} warn)</span>
                        )}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          att.status === "SUBMITTED"
                            ? "bg-slate-100 text-slate-700"
                            : att.status === "TERMINATED_VIOLATION"
                            ? "bg-rose-100 text-rose-800 font-extrabold"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {att.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/exams/${att.attempt_id}/result`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors"
                      >
                        <span>View Result</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </StudentPortalLayout>
  );
};
