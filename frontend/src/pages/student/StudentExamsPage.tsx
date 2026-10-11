import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Award,
  FileText,
  Search,
  CheckCircle2,
  Camera,
  ArrowRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { StudentPortalLayout } from "../../components/layout/StudentPortalLayout";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { examService } from "../../services/examService";
import type { Exam } from "../../types/exam.types";

export const StudentExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getAvailableExams();
      setExams(data);
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.course_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <StudentPortalLayout
      title="Assigned Examinations"
      subtitle="Institutional examination catalog and proctored assessment tests"
    >
      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course code or exam title..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{filteredExams.length}</span> examinations available
        </div>
      </div>

      {/* Hardware Readiness Banner */}
      <div className="mb-6 p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950">
          <p className="font-bold text-slate-900 mb-0.5">Automated Proctoring Protocol</p>
          Each assessment includes a mandatory 2-step hardware verification pre-check (webcam, face framing, audio test) before timers commence. Ensure your workspace is well-lit and quiet.
        </div>
      </div>

      {/* Exams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-12 bg-slate-200 rounded" />
              <div className="h-10 bg-slate-200 rounded" />
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Examinations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No assessments match your current search query. Try searching for a different course code."
              : "No examinations are currently published for your department."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <Card
              key={exam.id}
              className="p-6 border-slate-200/90 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group bg-white"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-700" />

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {exam.course_code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Live & Ready
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {exam.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
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

                {/* Proctoring Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" /> Dual-Face Blocking
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    <Activity className="w-3 h-3 text-emerald-500" /> AI Motion Detection
                  </span>
                </div>
              </div>

              {/* Start Test Button */}
              <div className="mt-6 pt-2">
                <Button
                  onClick={() => navigate(`/exams/${exam.id}/instructions`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 shadow-xs group-hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Examination</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </StudentPortalLayout>
  );
};
