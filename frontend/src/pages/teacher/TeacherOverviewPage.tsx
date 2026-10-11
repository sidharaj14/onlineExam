import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  Clock,
  PlusCircle,
  Activity,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type { TeacherOverviewResponse } from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";

export const TeacherOverviewPage: React.FC = () => {
  const [data, setData] = useState<TeacherOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await teacherService.getOverview();
      setData(res);
    } catch (e: any) {
      console.error("Overview error:", e);
      setError("Unable to load dashboard statistics. Please ensure you are authenticated.");
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats;
  const isZeroState = !stats || stats.total_exams === 0;

  return (
    <TeacherPortalLayout
      title="Faculty Overview"
      subtitle="Real-time examination statistics, student participation, and AI proctoring health"
      actions={
        <Link to="/teacher/create-exam">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 shadow-sm">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Exam</span>
          </Button>
        </Link>
      }
    >
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs font-medium">Loading institutional data...</span>
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50 text-rose-800 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-semibold">{error}</p>
          <Button onClick={loadOverview} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white text-xs">
            Retry Loading
          </Button>
        </Card>
      ) : isZeroState ? (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 bg-white rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Examinations Created Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Get started by creating your first course examination. You can add multiple-choice questions, set timers, and configure AI proctoring rules.
          </p>
          <Link to="/teacher/create-exam">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Exam</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Exams</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.total_exams}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-600 font-bold">{stats.published_exams} published</span>
                <span>•</span>
                <span>{stats.draft_exams} drafts</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Unique Students</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.total_students_attempted}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-slate-700 font-bold">{stats.total_completed_attempts}</span>
                <span>completed submissions</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.average_score}%</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span className="text-emerald-600 font-bold">{stats.pass_percentage}%</span>
                <span>pass rate</span>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Proctoring Flags</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.total_violations}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <span>AI Computer Vision infractions</span>
              </div>
            </Card>
          </div>

          {/* Academic Performance Insights & Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 2 Cols: Performance Insights */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Academic Score Distribution & Metrics</h3>
                  </div>
                  <Link to="/teacher/results" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <span>Full Gradebook</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Highest Score</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">{stats.highest_score}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Lowest Score</span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">{stats.lowest_score}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Pass Rate</span>
                    <span className="text-lg font-black text-emerald-600 mt-0.5 block">{stats.pass_percentage}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Completion Rate</span>
                    <span className="text-lg font-black text-indigo-600 mt-0.5 block">{stats.completion_rate}%</span>
                  </div>
                </div>

                {/* Top Exams with Flagged Violations */}
                {data?.top_violation_exams && data.top_violation_exams.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700">Examinations with Recorded Violations</span>
                      <Link to="/teacher/violations" className="text-[11px] font-bold text-rose-600 hover:text-rose-800">
                        View Incident Logs &rarr;
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {data.top_violation_exams.map((ex) => (
                        <div
                          key={ex.exam_id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                              {ex.course_code}
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-xs">{ex.title}</span>
                          </div>
                          <span className="font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md text-[11px]">
                            {ex.violations_count} strikes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  to="/teacher/create-exam"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Create New Exam</span>
                    <span className="text-[11px] text-slate-500">Draft, configure & publish</span>
                  </div>
                </Link>

                <Link
                  to="/teacher/monitoring"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Live Monitoring</span>
                    <span className="text-[11px] text-slate-500">Inspect active candidates</span>
                  </div>
                </Link>

                <Link
                  to="/teacher/results"
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Student Gradebook</span>
                    <span className="text-[11px] text-slate-500">Export scores & answers</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* 1 Col: Recent Institutional Activity Feed */}
            <div className="lg:col-span-1">
              <Card className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                  </div>

                  {data?.recent_activity && data.recent_activity.length > 0 ? (
                    <div className="space-y-3">
                      {data.recent_activity.slice(0, 6).map((item) => (
                        <div key={item.id} className="flex items-start gap-2.5 text-xs">
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              item.severity === "CRITICAL"
                                ? "bg-rose-500 ring-4 ring-rose-100"
                                : item.severity === "SUCCESS"
                                ? "bg-emerald-500 ring-4 ring-emerald-100"
                                : "bg-indigo-500 ring-4 ring-indigo-100"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 leading-snug font-medium line-clamp-2">{item.description}</p>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-xs font-medium">No recorded candidate activity yet.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    to="/teacher/monitoring"
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Live Stream &rarr;</span>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </TeacherPortalLayout>
  );
};
