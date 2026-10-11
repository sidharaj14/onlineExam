import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Upload,
  AlertCircle,
  Clock,
  Loader2,
  Archive,
  BarChart2,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type { TeacherExamItem } from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";

export const TeacherMyExamsPage: React.FC = () => {
  const [exams, setExams] = useState<TeacherExamItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadExams();
  }, [statusFilter]);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherService.getExams({
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setExams(data);
    } catch (e: any) {
      console.error("Load exams error:", e);
      setError("Failed to load examinations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadExams();
  };

  const handleTogglePublish = async (exam: TeacherExamItem) => {
    try {
      setActionLoadingId(exam.id);
      const newPublishState = !exam.is_published;
      await teacherService.togglePublish(exam.id, newPublishState);
      await loadExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update publication status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      setActionLoadingId(examId);
      await teacherService.deleteExam(examId);
      setDeleteConfirmId(null);
      await loadExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete or archive examination.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredExams = exams.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.course_code.toLowerCase().includes(term) ||
      (e.description && e.description.toLowerCase().includes(term))
    );
  });

  return (
    <TeacherPortalLayout
      title="My Examinations"
      subtitle="Manage your course tests, questions, answer keys, and student publishing status"
      actions={
        <Link to="/teacher/create-exam">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 shadow-sm">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Exam</span>
          </Button>
        </Link>
      }
    >
      {/* Search and Filters Bar */}
      <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Input
              type="text"
              placeholder="Search by title, course code (e.g. CS205)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Main Table or Card List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs font-medium">Fetching examinations...</span>
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50 text-rose-800 rounded-xl">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      ) : filteredExams.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 bg-white rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Examinations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            {searchTerm || statusFilter !== "all"
              ? "No exams match your current search or status filter criteria."
              : "You have not created any course examinations yet."}
          </p>
          <Link to="/teacher/create-exam">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2">
              Create New Exam
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Examination</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Questions & Marks</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Candidates</th>
                  <th className="py-3 px-3 text-center">Avg. Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((exam) => {
                  const isPublishingThis = actionLoadingId === exam.id;
                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Title & Desc */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{exam.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {exam.description || "No description provided"}
                        </div>
                      </td>

                      {/* Course Code */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                          {exam.course_code}
                        </span>
                      </td>

                      {/* Questions & Marks */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{exam.question_count} Questions</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {exam.total_marks} Marks (Pass: {exam.passing_marks})
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{exam.duration_minutes} mins</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            !exam.is_active
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : exam.is_published
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {!exam.is_active ? "Archived" : exam.is_published ? "Published" : "Draft"}
                        </span>
                      </td>

                      {/* Candidates */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-bold text-slate-900">{exam.participants_count}</div>
                        <div className="text-[10px] text-slate-400">{exam.submitted_count} submitted</div>
                      </td>

                      {/* Avg Score */}
                      <td className="py-3.5 px-3 text-center">
                        {exam.average_score !== null ? (
                          <span className="font-black text-slate-900">{exam.average_score}%</span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">—</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Publish */}
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(exam)}
                            disabled={isPublishingThis}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              exam.is_published
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                            title={exam.is_published ? "Unpublish to Draft" : "Publish for Students"}
                          >
                            {isPublishingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : exam.is_published ? (
                              <Archive className="w-3.5 h-3.5" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit Exam */}
                          <Link
                            to={`/teacher/create-exam?edit=${exam.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Edit Exam"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>

                          {/* Results Link */}
                          <Link
                            to={`/teacher/results?exam_id=${exam.id}`}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                            title="View Student Results"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete / Archive */}
                          {deleteConfirmId === exam.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                              <button
                                type="button"
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-[10px] font-bold text-white bg-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-[10px] text-slate-500 hover:text-slate-700 px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(exam.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete or Archive Exam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeacherPortalLayout>
  );
};
