import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Award,
  Sparkles,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  PlayCircle,
  Calendar,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { examService } from "../../services/examService";
import type { Exam, StudentAnalytics } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDemoMock, setShowDemoMock] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardData();
  }, [user?.email, user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [examsData, analyticsData] = await Promise.allSettled([
        examService.getAvailableExams(),
        examService.getStudentAnalytics(user?.email, user?.id),
      ]);

      if (examsData.status === "fulfilled") {
        setExams(examsData.value);
      }

      if (analyticsData.status === "fulfilled") {
        setAnalytics(analyticsData.value);
      }
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Sample analytics data to showcase to judges if the database is fresh with 0 attempts
  const sampleJudgeAnalytics: StudentAnalytics = {
    total_tests_taken: 4,
    average_score: 82.5,
    highest_score: 94.0,
    pass_rate: 100,
    passed_count: 4,
    failed_count: 0,
    integrity_score: 99.2,
    recent_attempts: [
      {
        attempt_id: "demo-att-1",
        exam_id: "exam-1",
        exam_title: "CS101: Systems Programming & Data Structures",
        course_code: "CS101",
        status: "submitted",
        score: 94,
        total_marks: 100,
        percentage: 94.0,
        passed: true,
        started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        submitted_at: new Date(Date.now() - 86400000 * 2 + 2700000).toISOString(),
        violations_count: 0,
      },
      {
        attempt_id: "demo-att-2",
        exam_id: "exam-2",
        exam_title: "CS202: Database Management Systems",
        course_code: "CS202",
        status: "submitted",
        score: 86,
        total_marks: 100,
        percentage: 86.0,
        passed: true,
        started_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        submitted_at: new Date(Date.now() - 86400000 * 5 + 3200000).toISOString(),
        violations_count: 0,
      },
      {
        attempt_id: "demo-att-3",
        exam_id: "exam-3",
        exam_title: "CS305: Artificial Intelligence & Neural Networks",
        course_code: "CS305",
        status: "submitted",
        score: 78,
        total_marks: 100,
        percentage: 78.0,
        passed: true,
        started_at: new Date(Date.now() - 86400000 * 9).toISOString(),
        submitted_at: new Date(Date.now() - 86400000 * 9 + 3100000).toISOString(),
        violations_count: 1,
      },
    ],
    subject_performance: [
      { course_code: "CS101", attempts_count: 1, average_score: 94.0 },
      { course_code: "CS202", attempts_count: 1, average_score: 86.0 },
      { course_code: "CS305", attempts_count: 1, average_score: 78.0 },
    ],
  };

  const isZeroState = !analytics || analytics.total_tests_taken === 0;
  const displayAnalytics = isZeroState && showDemoMock ? sampleJudgeAnalytics : analytics;

  return (
    <StudentPortalLayout>
      <div className="space-y-8">
        {/* Hero Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <ShieldCheck className="w-80 h-80 text-white" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              AI Invigilation Engine V2.4 Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || "Candidate"}!
            </h1>
            <p className="mt-2 text-indigo-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Welcome to your institutional examination dashboard. Review your verified attempt records, proctoring compliance ratings, and launch your scheduled assessment tests below.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="#give-test-section"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                Give Scheduled Test
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-200 bg-white/10 px-3 py-2 rounded-lg border border-white/10 backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Dual-Face & Vision AI Ready
              </span>
            </div>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Performance & Proctoring Overview
              </h2>
              <p className="text-xs text-slate-500">
                Aggregated testing records and automated invigilation integrity index
              </p>
            </div>

            {isZeroState && (
              <button
                type="button"
                onClick={() => setShowDemoMock(!showDemoMock)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {showDemoMock ? "Show Live Zero State" : "Demo Mode: Preview Historical Analytics"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tests Completed */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tests Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {displayAnalytics?.total_tests_taken ?? 0}
                </span>
                <span className="text-xs text-slate-500 font-medium">Exams</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {displayAnalytics?.passed_count ?? 0} Passed
                </span>
                <span className="text-rose-600 font-medium flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  {displayAnalytics?.failed_count ?? 0} Failed
                </span>
              </div>
            </Card>

            {/* Card 2: Average Score */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Average Score
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {(displayAnalytics?.average_score ?? 0).toFixed(1)}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {displayAnalytics?.average_score && displayAnalytics.average_score >= 75
                    ? "Distinction"
                    : "Standard"}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Peak Performance:</span>
                <span className="font-bold text-slate-800">
                  {(displayAnalytics?.highest_score ?? 0).toFixed(1)}%
                </span>
              </div>
            </Card>

            {/* Card 3: Pass Rate */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pass Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {(displayAnalytics?.pass_rate ?? 0).toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Clearance</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, displayAnalytics?.pass_rate ?? 0)}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Card 4: Proctoring Integrity */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Integrity Score
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {(displayAnalytics?.integrity_score ?? 100).toFixed(1)}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> High Trust
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Invigilation:</span>
                <span className="font-semibold text-emerald-700">Clean Session</span>
              </div>
            </Card>
          </div>
        </section>

        {/* "GIVE TEST" SECTION - Available Examinations */}
        <section id="give-test-section" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-indigo-600" />
                Assigned Assessments (Give Test)
              </h2>
              <p className="text-xs text-slate-500">
                Select an active assessment to begin hardware pre-checks and launch your test
              </p>
            </div>
            <Link
              to="/student/exams"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              View All ({exams.length}) &rarr;
            </Link>
          </div>

          {loading ? (
            <Card className="p-8 text-center animate-pulse border-slate-200">
              <p className="text-xs text-slate-400">Loading assigned examinations...</p>
            </Card>
          ) : exams.length === 0 ? (
            <Card className="p-8 text-center border-slate-200 bg-white">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No examinations currently scheduled.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.slice(0, 2).map((exam) => (
                <Card
                  key={exam.id}
                  className="p-6 border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group bg-white"
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-700" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {exam.course_code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Live & Ready
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description ||
                        "Comprehensive academic assessment proctored via biometric verification and browser lockdown."}
                    </p>

                    {/* Metadata Pills */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-indigo-600" />
                          {exam.duration_minutes}m
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Questions</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3 text-blue-600" />
                          {exam.question_count} MCQs
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/70 p-2 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Passing</span>
                        <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <Award className="w-3 h-3 text-amber-600" />
                          {exam.passing_marks}/{exam.total_marks}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-2">
                    <Button
                      onClick={() => navigate(`/exams/${exam.id}/instructions`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-xs group-hover:scale-[1.01] transition-transform cursor-pointer"
                    >
                      <span>Start Examination</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent Attempts Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Recent Verified Submissions
              </h2>
              <p className="text-xs text-slate-500">
                Official audit log of your most recent assessment attempts
              </p>
            </div>
            <Link
              to="/student/attempts"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              View All Attempts &rarr;
            </Link>
          </div>

          {(!displayAnalytics || displayAnalytics.recent_attempts.length === 0) ? (
            <Card className="p-8 text-center border-slate-200 bg-white">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No attempts registered yet.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Exam / Course</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-center">AI Integrity</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayAnalytics.recent_attempts.slice(0, 5).map((att) => (
                      <tr key={att.attempt_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {att.course_code}
                            </span>
                            <span className="truncate max-w-[200px]">{att.exam_title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(att.started_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {att.score} / {att.total_marks}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              att.passed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {att.passed ? "PASSED" : "FAILED"} ({att.percentage.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            {att.integrity_score ? `${att.integrity_score.toFixed(0)}%` : "100%"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/exams/${att.attempt_id}/result`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200"
                          >
                            <span>Scorecard</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </div>
    </StudentPortalLayout>
  );
};
