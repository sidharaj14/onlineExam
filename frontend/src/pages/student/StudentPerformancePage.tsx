import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Layers,
  BookOpen,
} from "lucide-react";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";
import { Card } from "../../components/common/Card";
import { examService } from "../../services/examService";
import { useAuthStore } from "../../store/useAuthStore";
import type { StudentAnalytics } from "../../types/exam.types";

export const StudentPerformancePage: React.FC = () => {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [user?.email, user?.id]);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const data = await examService.getStudentAnalytics(user?.email, user?.id);
      setAnalytics(data);
    } catch (err) {
      console.error("Error loading performance analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const isZeroState = !analytics || analytics.total_tests_taken === 0;

  return (
    <StudentPortalLayout
      title="Performance & Competency Analytics"
      subtitle="Comprehensive statistical trajectory, subject mastery, and proctoring integrity indices"
    >
      {loading ? (
        <Card className="p-8 text-center animate-pulse border-slate-200">
          <p className="text-xs text-slate-400">Loading performance data...</p>
        </Card>
      ) : isZeroState ? (
        <Card className="p-12 text-center border-slate-200 bg-white">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Performance Records</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            Your performance graphs will populate here automatically once you have completed your first assessment.
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
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Average Score
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {(analytics?.average_score ?? 0).toFixed(1)}%
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Peak Score:</span>
                <span className="font-bold text-slate-800">{(analytics?.highest_score ?? 0).toFixed(1)}%</span>
              </div>
            </Card>

            <Card className="p-5 border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Clearance Rate
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {(analytics?.pass_rate ?? 0).toFixed(0)}%
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                <span className="text-emerald-700 font-semibold">{analytics?.passed_count} Passed</span>
                <span>&bull;</span>
                <span className="text-rose-600 font-semibold">{analytics?.failed_count} Failed</span>
              </div>
            </Card>

            <Card className="p-5 border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Tests Taken
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1.5">
                {analytics?.total_tests_taken ?? 0}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                Total completed submissions
              </div>
            </Card>

            <Card className="p-5 border-slate-200 bg-white shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Proctoring Trust Index
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
                <span>{(analytics?.integrity_score ?? 100).toFixed(0)}%</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-emerald-700 font-medium">
                High Proctoring Integrity
              </div>
            </Card>
          </div>

          {/* Subject Mastery and Recent Scores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Mastery */}
            <Card className="p-6 border-slate-200 bg-white shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Course Competency Breakdown
              </h3>

              {analytics?.subject_performance.length === 0 ? (
                <p className="text-xs text-slate-400">No subject statistics recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {analytics?.subject_performance.map((sub) => (
                    <div key={sub.course_code} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-extrabold text-indigo-700">{sub.course_code}</span>
                        <span className="font-bold text-slate-800">{sub.average_score.toFixed(1)}% Avg</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, sub.average_score))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{sub.attempts_count} assessment attempt{sub.attempts_count === 1 ? "" : "s"}</span>
                        <span className="text-emerald-700 font-semibold">
                          {sub.average_score >= 75 ? "Proficient" : "Satisfactory"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Score History Trajectory */}
            <Card className="p-6 border-slate-200 bg-white shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Attempt Trajectory
              </h3>

              <div className="space-y-4">
                {analytics?.recent_attempts.map((att) => (
                  <div key={att.attempt_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[220px]">
                        {att.course_code}: {att.exam_title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{att.score}/{att.total_marks}</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            att.passed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {att.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          att.passed ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, att.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </StudentPortalLayout>
  );
};
