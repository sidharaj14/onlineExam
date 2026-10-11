import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Award,
  TrendingUp,
  BarChart3,
  CheckCircle,
  PlayCircle,
  Calendar,
  ChevronRight,
  Zap,
  AlertTriangle,
  LogIn,
  Eye,
  Save,
  Activity,
  RotateCcw,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { examService } from "../../services/examService";
import type {
  Exam,
  StudentFullDashboardResponse,
} from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [dashboardData, setDashboardData] = useState<StudentFullDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user?.email, user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [examsRes, fullDashboardRes] = await Promise.allSettled([
        examService.getAvailableExams(),
        examService.getStudentFullDashboard(),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      }

      if (fullDashboardRes.status === "fulfilled") {
        setDashboardData(fullDashboardRes.value);
      } else {
        // Fallback to student analytics if full dashboard fails
        console.warn("Full dashboard fetch failed, falling back to basic analytics:", fullDashboardRes.reason);
        const basicAnalytics = await examService.getStudentAnalytics(user?.email, user?.id);
        setDashboardData({
          student_id: user?.id || "student-01",
          student_name: user?.full_name || "Candidate",
          student_email: user?.email || "",
          summary: {
            total_exams_attempted: basicAnalytics.total_tests_taken,
            exams_completed: basicAnalytics.total_tests_taken,
            exams_in_progress: 0,
            average_score: basicAnalytics.average_score,
            highest_score: basicAnalytics.highest_score,
            lowest_score: 0,
            passed_exams: basicAnalytics.passed_count,
            failed_exams: basicAnalytics.failed_count,
            pending_evaluations: 0,
            average_integrity_score: basicAnalytics.integrity_score || 100,
            pass_rate: basicAnalytics.pass_rate,
          },
          recent_history: basicAnalytics.recent_attempts.map((att, idx) => ({
            attempt_id: att.attempt_id,
            exam_id: att.exam_id,
            exam_title: att.exam_title,
            course_code: att.course_code,
            attempt_number: idx + 1,
            status: att.status,
            grading_status: "COMPLETED",
            marks_obtained: att.score,
            score: att.score,
            total_marks: att.total_marks,
            percentage: att.percentage,
            passed: att.passed,
            started_at: att.started_at,
            submitted_at: att.submitted_at,
            violations_count: att.violations_count,
            integrity_score: att.integrity_score || 100,
            can_resume: false,
          })),
          analytics: {
            score_trend: basicAnalytics.recent_attempts.map((att) => ({
              attempt_id: att.attempt_id,
              exam_title: att.exam_title,
              course_code: att.course_code,
              percentage: att.percentage,
              date: att.started_at,
              passed: att.passed,
            })),
            subject_performance: basicAnalytics.subject_performance.map((s) => ({
              course_code: s.course_code,
              subject_name: s.course_code,
              attempts_count: s.attempts_count,
              average_score: s.average_score,
              pass_rate: 100,
            })),
            pass_rate: basicAnalytics.pass_rate,
            has_sufficient_data: basicAnalytics.subject_performance.length >= 2,
          },
          recent_activities: [],
        });
      }
    } catch (e: any) {
      console.error("Error loading student dashboard:", e);
      setError("Failed to load dashboard records. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const summary = dashboardData?.summary || {
    total_exams_attempted: 0,
    exams_completed: 0,
    exams_in_progress: 0,
    average_score: 0,
    highest_score: 0,
    lowest_score: 0,
    passed_exams: 0,
    failed_exams: 0,
    pending_evaluations: 0,
    average_integrity_score: 100,
    pass_rate: 0,
  };

  const recentAttempts = dashboardData?.recent_history || [];
  const analytics = dashboardData?.analytics;
  const recentActivity = dashboardData?.recent_activities || [];

  // Check if student has an active / resumable attempt
  const activeAttempt = recentAttempts.find((att) => att.status === "IN_PROGRESS");

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LOGIN":
        return <LogIn className="w-3.5 h-3.5 text-blue-600" />;
      case "EXAM_VIEWED":
        return <Eye className="w-3.5 h-3.5 text-slate-600" />;
      case "ATTEMPT_STARTED":
        return <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />;
      case "ATTEMPT_RESUMED":
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      case "ANSWER_SAVED":
        return <Save className="w-3.5 h-3.5 text-emerald-600" />;
      case "EXAM_SUBMITTED":
      case "EXAM_GRADED":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case "VIOLATION_RECORDED":
      case "AUTO_TERMINATED":
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const formatActivityTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <StudentPortalLayout>
      <div className="space-y-8">
        {/* Error notification banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboardData}
              className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Attempt Resumption Banner */}
        {activeAttempt && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-400/40 animate-pulse">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-amber-100">
                  Unfinished Examination Session
                </span>
                <h3 className="text-base font-bold mt-1">
                  You have an in-progress session for: {activeAttempt.exam_title}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Started at {formatActivityTime(activeAttempt.started_at)} • Attempt #{activeAttempt.attempt_number}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/exams/${activeAttempt.attempt_id}/take`)}
              className="bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs px-5 py-2.5 shrink-0 shadow-md flex items-center gap-2"
            >
              <span>Resume Examination</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <ShieldCheck className="w-80 h-80 text-white" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              AI Invigilation Engine Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || "Candidate"}!
            </h1>
            <p className="mt-2 text-indigo-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl">
              Access your institutional examination dashboard. View real database-verified scorecards, monitor your continuous activity timeline, and take your scheduled assessments below.
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
                OpenCV Dual-Face & Phone Detection Active
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
                Authoritative examination metrics calculated from your verified database records
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tests Attempted */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tests Attempted
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {summary.total_exams_attempted}
                </span>
                <span className="text-xs text-slate-500 font-medium">Total</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {summary.exams_completed} Completed
                </span>
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {summary.exams_in_progress} In Progress
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
                  {summary.average_score.toFixed(1)}%
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {summary.average_score >= 75
                    ? "Distinction"
                    : summary.average_score >= 50
                    ? "Passing"
                    : "Needs Review"}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Highest Score:</span>
                <span className="font-bold text-slate-800">
                  {summary.highest_score.toFixed(1)}%
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
                  {(summary.pass_rate ?? 0).toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500 font-medium">Clearance</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="text-emerald-700 font-medium">
                  {summary.passed_exams} Passed
                </span>
                <span className="text-rose-600 font-medium">
                  {summary.failed_exams} Failed
                </span>
              </div>
            </Card>

            {/* Card 4: Proctoring Integrity */}
            <Card className="p-5 border-slate-200 bg-white hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Proctoring Trust
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {(summary.average_integrity_score ?? 100).toFixed(1)}%
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> High Trust
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Evaluation Status:</span>
                <span className="font-semibold text-emerald-700">
                  {summary.pending_evaluations > 0
                    ? `${summary.pending_evaluations} Pending`
                    : "All Evaluated"}
                </span>
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
                Select an active assessment to begin hardware pre-checks and launch your examination
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
              {exams.slice(0, 2).map((exam) => {
                const examActiveAttempt = recentAttempts.find(
                  (a) => a.exam_id === exam.id && a.can_resume
                );

                return (
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
                        {examActiveAttempt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                            <RotateCcw className="w-3 h-3" /> In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Live & Ready
                          </span>
                        )}
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
                      {examActiveAttempt ? (
                        <Button
                          onClick={() => navigate(`/exams/${examActiveAttempt.attempt_id}/take`)}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-xs group-hover:scale-[1.01] transition-transform cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Resume Ongoing Attempt</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/exams/${exam.id}/instructions`)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-xs group-hover:scale-[1.01] transition-transform cursor-pointer"
                        >
                          <span>Start Examination</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Submissions Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Recent Verified Submissions & History
              </h2>
              <p className="text-xs text-slate-500">
                Official audit log of your most recent assessment attempts stored in the database
              </p>
            </div>
            <Link
              to="/student/attempts"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              View All Attempts &rarr;
            </Link>
          </div>

          {recentAttempts.length === 0 ? (
            <Card className="p-8 text-center border-slate-200 bg-white">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Attempts Recorded Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Once you start or complete examinations, your full scorecards, timestamps, and proctoring integrity records will appear here.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Exam / Course</th>
                      <th className="py-3 px-4 text-center">Attempt #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Result</th>
                      <th className="py-3 px-4 text-center">AI Integrity</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentAttempts.slice(0, 5).map((att) => (
                      <tr key={att.attempt_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {att.course_code}
                            </span>
                            <span className="truncate max-w-[200px]">{att.exam_title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600">
                          #{att.attempt_number}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatActivityTime(att.started_at)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {att.status === "IN_PROGRESS" ? (
                            <span className="text-amber-600 italic">In Progress</span>
                          ) : (
                            `${att.marks_obtained ?? (att as any).score} / ${att.total_marks}`
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {att.status === "IN_PROGRESS" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> ACTIVE
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                att.passed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {att.passed ? "PASSED" : "FAILED"} ({att.percentage.toFixed(0)}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            {att.integrity_score ? `${att.integrity_score.toFixed(0)}%` : "100%"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {att.status === "IN_PROGRESS" ? (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/exams/${att.attempt_id}/take`)}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] py-1 px-2.5 h-auto"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Resume
                            </Button>
                          ) : (
                            <Link
                              to={`/exams/${att.attempt_id}/result`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200"
                            >
                              <span>Scorecard</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>

        {/* 2-Column Section: Performance Analytics & Activity Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Performance Analytics & Subject Mastery (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Performance Trajectory & Subject Mastery
                  </h3>
                </div>
                <Link
                  to="/student/performance"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Full Report &rarr;
                </Link>
              </div>

              {/* Subject Performance Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Subject Proficiency Breakdown
                </h4>

                {(!analytics?.subject_performance || analytics.subject_performance.length === 0) ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                      No graded subject data yet. Complete tests to view subject mastery.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.subject_performance.map((sub) => (
                      <div key={sub.course_code} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {sub.course_code}
                            </span>
                            {sub.subject_name}
                          </span>
                          <span className="font-bold text-slate-900">
                            {sub.average_score.toFixed(1)}% ({sub.attempts_count} {sub.attempts_count === 1 ? "test" : "tests"})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              sub.average_score >= 75
                                ? "bg-emerald-500"
                                : sub.average_score >= 50
                                ? "bg-indigo-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, sub.average_score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strongest / Weakest Subject Callout */}
                {analytics?.strongest_subject ? (
                  <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        Strongest Subject
                      </span>
                      <span className="font-extrabold text-emerald-950 mt-0.5 block">
                        {analytics.strongest_subject}
                      </span>
                    </div>
                    {analytics?.weakest_subject && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">
                          Area for Review
                        </span>
                        <span className="font-extrabold text-amber-950 mt-0.5 block">
                          {analytics.weakest_subject}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                    ℹ️ Complete assessments in at least 2 distinct subjects to activate comparative mastery highlights.
                  </div>
                )}
              </div>

              {/* Score Trend History */}
              {analytics?.score_trend && analytics.score_trend.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chronological Score Progression
                  </h4>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                    {analytics.score_trend.map((pt, idx) => (
                      <div
                        key={pt.attempt_id}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 min-w-[120px] text-center shrink-0"
                      >
                        <span className="text-[10px] font-extrabold text-slate-400 block">
                          Test #{idx + 1}
                        </span>
                        <span
                          className={`text-sm font-extrabold block my-0.5 ${
                            pt.passed ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {pt.percentage.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[100px] mx-auto">
                          {pt.course_code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Student Activity Audit Trail Timeline (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Student Activity Timeline
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Audit Log
                </span>
              </div>

              {recentActivity.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    No recent activity logged. Actions such as logging in, starting exams, saving answers, and submissions are automatically logged here.
                  </p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {recentActivity.slice(0, 8).map((act, actIdx) => (
                      <li key={act.id}>
                        <div className="relative pb-6">
                          {actIdx !== Math.min(recentActivity.length, 8) - 1 ? (
                            <span
                              className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                {getActivityIcon(act.activity_type)}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-900">
                                  {act.title}
                                </p>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {formatActivityTime(act.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                {act.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </StudentPortalLayout>
  );
};
