import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Clock,
  Award,
  CheckCircle2,
  Camera,
  AlertCircle,
  FileText,
  UserCheck,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { examService } from "../../services/examService";
import type { Exam } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";

export const ExamCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getAvailableExams();
      setExams(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to examination server. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">
                ExamGuard AI
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Autonomous Secure Examination Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/dashboard")}
                className="text-xs"
              >
                Admin Console
              </Button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                {user.full_name?.charAt(0) || "C"}
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                  {user.role === "admin" ? "Invigilator" : user.student_profile?.student_id_number || "Student"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Candidate Banner */}
        <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
            <ShieldCheck className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Direct Access Mode Active (No Login Required)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user.full_name}
            </h1>
            <p className="text-indigo-100/90 text-sm mt-2 leading-relaxed">
              Select an examination below to start the identity verification procedure. Your webcam and microphone will be tested to initialize the secure proctoring environment.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-indigo-200">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                ID: {user.student_profile?.student_id_number || "CS2026-042"}
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <Layers className="w-4 h-4 text-indigo-300" />
                Dept: {user.student_profile?.department || "Computer Science"}
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <Camera className="w-4 h-4 text-amber-300" />
                Camera Verification Required
              </span>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Scheduled Examinations</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Available test sessions for your enrolled course modules.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadExams} className="text-xs">
            Refresh List
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div className="flex-1">{error}</div>
            <Button size="sm" variant="outline" onClick={loadExams}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="p-6 animate-pulse border-slate-200">
                <div className="h-6 bg-slate-200 rounded-md w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-100 rounded-md w-full mb-2"></div>
                <div className="h-4 bg-slate-100 rounded-md w-2/3 mb-6"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-slate-300">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No active examinations</h3>
            <p className="text-sm text-slate-500 mt-1">
              There are currently no published exams scheduled for your cohort.
            </p>
          </Card>
        ) : (
          /* Exams Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="p-6 flex flex-col justify-between border-slate-200 hover:shadow-md transition-all duration-200 hover:border-indigo-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
                      {exam.course_code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" /> Active Session
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {exam.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {exam.description || "Computer-based examination with real-time AI invigilation."}
                  </p>

                  <div className="grid grid-cols-3 gap-2 my-5 py-3 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Duration
                      </span>
                      <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        {exam.duration_minutes}m
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Questions
                      </span>
                      <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        {exam.question_count}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Marks
                      </span>
                      <span className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        {exam.total_marks}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => navigate(`/exams/${exam.id}/instructions`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-xs flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Start Examination
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
