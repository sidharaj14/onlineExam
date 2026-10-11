import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Search,
  Eye,
  AlertTriangle,
  X,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type {
  TeacherStudentResultItem,
  TeacherResultsAnalytics,
  StudentAttemptDetailResponse,
  TeacherExamItem,
} from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";

export const TeacherResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlExamId = searchParams.get("exam_id") || "all";

  const [exams, setExams] = useState<TeacherExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(urlExamId);
  const [passFilter, setPassFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [attempts, setAttempts] = useState<TeacherStudentResultItem[]>([]);
  const [analytics, setAnalytics] = useState<TeacherResultsAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal for Detailed Individual Attempt
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<StudentAttemptDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  useEffect(() => {
    loadExamsList();
  }, []);

  useEffect(() => {
    loadResults();
  }, [selectedExamId, passFilter]);

  const loadExamsList = async () => {
    try {
      const data = await teacherService.getExams();
      setExams(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const passedParam =
        passFilter === "passed" ? true : passFilter === "failed" ? false : undefined;

      const res = await teacherService.getResults({
        exam_id: selectedExamId !== "all" ? selectedExamId : undefined,
        passed: passedParam,
        search: searchTerm || undefined,
      });

      setAttempts(res.attempts);
      setAnalytics(res.analytics);
    } catch (e: any) {
      console.error("Results load error:", e);
      setError("Unable to load candidate examination results.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadResults();
  };

  const handleOpenAttemptDetail = async (attemptId: string) => {
    try {
      setSelectedAttemptId(attemptId);
      setLoadingDetail(true);
      const detail = await teacherService.getAttemptDetail(attemptId);
      setAttemptDetail(detail);
    } catch (err: any) {
      alert("Failed to load student attempt breakdown.");
      setSelectedAttemptId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExportCSV = () => {
    if (!attempts || attempts.length === 0) {
      alert("No results to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Email",
      "Course Code",
      "Exam Title",
      "Score",
      "Total Marks",
      "Percentage",
      "Status",
      "Result",
      "Violations Count",
      "Integrity Score",
      "Started At",
      "Submitted At",
    ];

    const rows = attempts.map((a) => [
      `"${a.student_name}"`,
      `"${a.student_email}"`,
      `"${a.course_code}"`,
      `"${a.exam_title}"`,
      a.score,
      a.total_marks,
      `${a.percentage}%`,
      a.status,
      a.passed === true ? "PASSED" : a.passed === false ? "FAILED" : "N/A",
      a.violations_count,
      `${a.integrity_score}%`,
      a.started_at,
      a.submitted_at || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Exam_Results_${selectedExamId !== "all" ? selectedExamId : "All"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttempts = attempts.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.student_name.toLowerCase().includes(term) ||
      a.student_email.toLowerCase().includes(term) ||
      a.exam_title.toLowerCase().includes(term)
    );
  });

  return (
    <TeacherPortalLayout
      title="Students & Results"
      subtitle="Complete student gradebook with itemized answer breakdowns and proctoring logs"
      actions={
        <Button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 shadow-sm"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </Button>
      }
    >
      {/* Analytics Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Attempts
            </span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {analytics.total_attempts}
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Submitted
            </span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">
              {analytics.submitted_count}
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Average Score
            </span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">
              {analytics.average_score}%
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Highest Score
            </span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {analytics.highest_score}%
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Lowest Score
            </span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {analytics.lowest_score}%
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200 rounded-xl shadow-xs">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pass Rate
            </span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">
              {analytics.pass_percentage}%
            </span>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-slate-200 rounded-xl shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Input
              type="text"
              placeholder="Search candidate name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Exam selector */}
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setSearchParams({ exam_id: e.target.value });
              }}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Examinations</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.course_code}: {ex.title}
                </option>
              ))}
            </select>

            {/* Pass/Fail selector */}
            <select
              value={passFilter}
              onChange={(e) => setPassFilter(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Results</option>
              <option value="passed">Passed Only</option>
              <option value="failed">Failed Only</option>
            </select>

            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2">
              Apply Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Results Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs">Fetching candidate submissions...</span>
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50 text-rose-800 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      ) : filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 bg-white rounded-2xl">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Candidate Submissions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedExamId !== "all" || passFilter !== "all"
              ? "No attempts match the selected filter criteria."
              : "No students have attempted this examination yet."}
          </p>
        </Card>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate Student</th>
                  <th className="py-3 px-3">Examination</th>
                  <th className="py-3 px-3 text-center">Score / Marks</th>
                  <th className="py-3 px-3 text-center">Percentage</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Integrity & Flags</th>
                  <th className="py-3 px-3">Submitted At</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttempts.map((att) => {
                  const isDisqualified = att.status === "TERMINATED_VIOLATION";
                  return (
                    <tr key={att.attempt_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Student info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{att.student_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{att.student_email}</div>
                      </td>

                      {/* Exam Title */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1">
                          {att.course_code}
                        </span>
                        <span className="font-semibold text-slate-800">{att.exam_title}</span>
                      </td>

                      {/* Marks Obtained */}
                      <td className="py-3 px-3 text-center font-bold">
                        <span className="text-slate-900 text-sm">{att.score}</span>
                        <span className="text-slate-400 text-[11px]"> / {att.total_marks}</span>
                      </td>

                      {/* Percentage & Pass/Fail */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-slate-900">{att.percentage}%</div>
                        {att.passed !== null && (
                          <span
                            className={`text-[10px] font-bold inline-block px-1.5 py-0.2 rounded ${
                              att.passed ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                            }`}
                          >
                            {att.passed ? "PASSED" : "FAILED"}
                          </span>
                        )}
                      </td>

                      {/* Attempt Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDisqualified
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : att.status === "SUBMITTED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isDisqualified ? "DISQUALIFIED" : att.status}
                        </span>
                      </td>

                      {/* Integrity & Violations */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {att.violations_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                              <AlertTriangle className="w-3 h-3" />
                              {att.violations_count} strikes
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              Clean (100%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {att.submitted_at
                          ? new Date(att.submitted_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "In Progress"}
                      </td>

                      {/* Inspect details button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAttemptDetail(att.attempt_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Student Attempt Breakdown Modal */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Student Examination Audit</h3>
                  <p className="text-[11px] text-slate-400">Detailed answers and proctoring evidence review</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAttemptId(null);
                  setAttemptDetail(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingDetail || !attemptDetail ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <span className="text-xs">Loading itemized attempt responses...</span>
                </div>
              ) : (
                <>
                  {/* Candidate and Exam Summary Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Candidate:</span>
                      <span className="font-bold text-slate-900 text-sm">{attemptDetail.student_name}</span>
                      <span className="text-[11px] text-slate-500 block font-mono">{attemptDetail.student_email}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Examination:</span>
                      <span className="font-bold text-slate-900">{attemptDetail.exam_title}</span>
                      <span className="text-[11px] font-mono text-indigo-700 block font-bold">
                        {attemptDetail.course_code}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Final Score:</span>
                      <span className="font-black text-slate-900 text-base">
                        {attemptDetail.score} / {attemptDetail.total_marks}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 block">
                        {attemptDetail.percentage}% ({attemptDetail.passed ? "PASSED" : "FAILED"})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Integrity Score:</span>
                      <span className="font-black text-slate-900 text-base">{attemptDetail.integrity_score}%</span>
                      <span className="text-[11px] text-rose-600 font-bold block">
                        {attemptDetail.violations_count} infraction strikes
                      </span>
                    </div>
                  </div>

                  {/* Proctoring Violations Section if any */}
                  {attemptDetail.violations && attemptDetail.violations.length > 0 && (
                    <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                          Recorded Proctoring Violations ({attemptDetail.violations.length})
                        </h4>
                      </div>

                      <div className="space-y-2">
                        {attemptDetail.violations.map((v, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white rounded-lg border border-rose-200 flex items-start justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">
                                  Strike #{v.warning_number}
                                </span>
                                <span className="font-mono font-bold text-slate-800">{v.violation_type}</span>
                              </div>
                              <p className="text-slate-600 text-xs mt-1">{v.message}</p>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                {new Date(v.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            {v.snapshot_url && (
                              <img
                                src={v.snapshot_url}
                                alt="Violation evidence"
                                className="w-16 h-12 rounded object-cover border border-slate-300"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question-by-Question Submission Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Question-Wise Candidate Responses
                    </h4>

                    <div className="space-y-4">
                      {attemptDetail.questions_breakdown.map((q, idx) => (
                        <div
                          key={q.question_id}
                          className={`p-4 rounded-xl border text-xs space-y-3 ${
                            q.is_correct
                              ? "bg-emerald-50/40 border-emerald-200"
                              : q.student_answer === null
                              ? "bg-slate-50 border-slate-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              Question #{idx + 1} ({q.marks} Mark{q.marks > 1 ? "s" : ""})
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                q.is_correct
                                  ? "bg-emerald-100 text-emerald-800"
                                  : q.student_answer === null
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {q.is_correct
                                ? `+${q.marks_awarded} Marks (Correct)`
                                : q.student_answer === null
                                ? "0 Marks (Unanswered)"
                                : `0 Marks (Incorrect)`}
                            </span>
                          </div>

                          <p className="font-semibold text-slate-900 text-sm">{q.question_text}</p>

                          {/* Options display */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt) => {
                              const isStudentSelected =
                                String(q.student_answer).trim().toUpperCase() === opt.id.toUpperCase();
                              const isCorrectKey =
                                String(q.correct_answer).trim().toUpperCase() === opt.id.toUpperCase();

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                                    isCorrectKey
                                      ? "bg-emerald-100 border-emerald-300 font-bold text-emerald-900"
                                      : isStudentSelected
                                      ? "bg-rose-100 border-rose-300 font-bold text-rose-900"
                                      : "bg-white border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded bg-white border border-slate-300 text-center font-bold text-[11px] flex items-center justify-center shrink-0">
                                      {opt.id}
                                    </span>
                                    <span>{opt.text}</span>
                                  </div>

                                  {isStudentSelected && isCorrectKey && (
                                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                      Chosen & Correct
                                    </span>
                                  )}
                                  {isStudentSelected && !isCorrectKey && (
                                    <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded">
                                      Chosen Answer
                                    </span>
                                  )}
                                  {!isStudentSelected && isCorrectKey && (
                                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                      Correct Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-800">Explanation: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                onClick={() => {
                  setSelectedAttemptId(null);
                  setAttemptDetail(null);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2"
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </TeacherPortalLayout>
  );
};
