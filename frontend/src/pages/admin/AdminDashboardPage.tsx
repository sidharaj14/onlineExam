import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  FileCheck,
  LogOut,
  CheckCircle2,
  Activity,
  ArrowRight,
  Search,
  Eye,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { adminService, type AdminExamAttempt } from "../../services/adminService";
import { examService } from "../../services/examService";
import type { Exam } from "../../types/exam.types";

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<AdminExamAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDemoMock, setShowDemoMock] = useState<boolean>(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [examsRes, attemptsRes] = await Promise.allSettled([
        examService.getAvailableExams(),
        adminService.getExamAttempts(),
      ]);

      if (examsRes.status === "fulfilled") {
        setExams(examsRes.value);
      }
      if (attemptsRes.status === "fulfilled") {
        setAttempts(attemptsRes.value.attempts);
      }
    } catch (e) {
      console.error("Admin dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Sample data to preview for judges if the database has zero live attempts yet
  const sampleJudgeAttempts: AdminExamAttempt[] = [
    {
      id: "sample-att-01",
      exam_id: "exam-01",
      exam_title: "CS301: Advanced Data Structures & Algorithms",
      course_code: "CS301",
      candidate_name: "Jane Cooper",
      candidate_email: "jane.cooper@university.edu",
      status: "TERMINATED_VIOLATION",
      score: 18,
      total_marks: 50,
      percentage: 36.0,
      passed: false,
      started_at: new Date(Date.now() - 3600000).toISOString(),
      submitted_at: new Date(Date.now() - 2400000).toISOString(),
      verification_photo_url: null,
      violations_count: 3,
    },
    {
      id: "sample-att-02",
      exam_id: "exam-01",
      exam_title: "CS301: Advanced Data Structures & Algorithms",
      course_code: "CS301",
      candidate_name: "Alex Johnson",
      candidate_email: "alex.j@university.edu",
      status: "SUBMITTED",
      score: 46,
      total_marks: 50,
      percentage: 92.0,
      passed: true,
      started_at: new Date(Date.now() - 7200000).toISOString(),
      submitted_at: new Date(Date.now() - 4500000).toISOString(),
      verification_photo_url: null,
      violations_count: 0,
    },
    {
      id: "sample-att-03",
      exam_id: "exam-01",
      exam_title: "CS301: Advanced Data Structures & Algorithms",
      course_code: "CS301",
      candidate_name: "Marcus Vance",
      candidate_email: "marcus.v@university.edu",
      status: "IN_PROGRESS",
      score: 0,
      total_marks: 50,
      percentage: 0.0,
      passed: null,
      started_at: new Date(Date.now() - 900000).toISOString(),
      submitted_at: null,
      verification_photo_url: null,
      violations_count: 1,
    },
  ];

  const isZeroState = attempts.length === 0;
  const activeAttemptsList = isZeroState && showDemoMock ? sampleJudgeAttempts : attempts;

  // Filtered candidate attempts
  const filteredAttempts = activeAttemptsList.filter((a) => {
    const matchesSearch =
      a.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.candidate_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate live statistics
  const activeCount = activeAttemptsList.filter((a) => a.status === "IN_PROGRESS").length;
  const completedCount = activeAttemptsList.filter((a) => a.status === "SUBMITTED").length;
  const terminatedCount = activeAttemptsList.filter((a) => a.status === "TERMINATED_VIOLATION").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-white text-lg leading-tight block">
                ExamGuard AI
              </span>
              <span className="text-xs text-indigo-300 font-semibold tracking-wide">
                Chief Invigilator Command Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/users")}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white text-xs font-semibold"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Users Roster
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-rose-400 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Title & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Invigilation Operations Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live monitoring hub, proctoring infraction reviews, and candidate forensic audit reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isZeroState && (
              <button
                type="button"
                onClick={() => setShowDemoMock(!showDemoMock)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {showDemoMock ? "Show Live Zero State" : "Demo Mode: Preview Sample Cohort"}
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={loadAdminData}
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Roster
            </Button>
          </div>
        </div>

        {/* 4 Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Scheduled Exams
              </span>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{exams.length}</div>
            <span className="text-xs text-slate-500 mt-1 block">
              {exams[0]?.course_code ? `${exams[0].course_code}: Active` : "Standard Catalog"}
            </span>
          </Card>

          <Card className="p-5 border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Live Sessions
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{activeCount}</div>
            <span className="text-xs text-blue-600 font-semibold mt-1 block">Currently Monitored</span>
          </Card>

          <Card className="p-5 border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Completed Tests
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{completedCount}</div>
            <span className="text-xs text-emerald-700 font-semibold mt-1 block">Graded & Archived</span>
          </Card>

          <Card className="p-5 border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Disqualified (3-Strikes)
              </span>
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">{terminatedCount}</div>
            <span className="text-xs text-rose-600 font-semibold mt-1 block">Proctoring Terminations</span>
          </Card>
        </div>

        {/* Live Examination Cohort Control & Candidate Roster */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Live Candidate Monitoring & Forensic Review Roster
              </h2>
              <p className="text-xs text-slate-500">
                Inspect real-time student sessions, review violation strikes, and open complete forensic reports
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidate name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 py-1.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="IN_PROGRESS">Live / In Progress</option>
                <option value="SUBMITTED">Submitted / Graded</option>
                <option value="TERMINATED_VIOLATION">Disqualified (3-Strikes)</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-xs">
            {filteredAttempts.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No Candidate Attempts Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  There are no candidate examination sessions matching the selected filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Candidate</th>
                      <th className="py-3.5 px-4">Examination</th>
                      <th className="py-3.5 px-4">Started / Submitted</th>
                      <th className="py-3.5 px-4">Session Status</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">AI Violation Strikes</th>
                      <th className="py-3.5 px-4 text-right">Forensic Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-slate-900">{attempt.candidate_name}</div>
                          <div className="text-[11px] text-slate-500">{attempt.candidate_email}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{attempt.exam_title}</span>
                          <span className="text-[11px] text-indigo-600 font-bold block">{attempt.course_code}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          <div>
                            {attempt.started_at
                              ? new Date(attempt.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {attempt.started_at ? new Date(attempt.started_at).toLocaleDateString() : ""}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {attempt.status === "TERMINATED_VIOLATION" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> DISQUALIFIED
                            </span>
                          ) : attempt.status === "SUBMITTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> SUBMITTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 animate-pulse">
                              <Activity className="w-3 h-3 text-blue-600" /> LIVE IN PROGRESS
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {attempt.status === "IN_PROGRESS" ? (
                            <span className="text-slate-400 italic">Testing...</span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-900">{attempt.score}/{attempt.total_marks}</span>
                              <span className="text-slate-500 text-[11px]"> ({attempt.percentage.toFixed(0)}%)</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {attempt.violations_count === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> 0 Warnings (Clean)
                            </span>
                          ) : attempt.violations_count >= 3 ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-black bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> 3 Strikes (Terminated)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                              <AlertTriangle className="w-3 h-3" /> {attempt.violations_count} Strike{attempt.violations_count === 1 ? "" : "s"}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/exams/${attempt.id}/result`)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 inline-flex items-center gap-1.5 py-1 px-3"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review Forensic Report
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

      </main>
    </div>
  );
};
