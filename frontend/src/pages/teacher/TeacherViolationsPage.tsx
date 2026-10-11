import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Search,
  Camera,
  X,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type { TeacherViolationItem, TeacherExamItem } from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";

export const TeacherViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<TeacherViolationItem[]>([]);
  const [exams, setExams] = useState<TeacherExamItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Evidence snapshot modal
  const [activeEvidenceUrl, setActiveEvidenceUrl] = useState<string | null>(null);

  useEffect(() => {
    loadExamsList();
  }, []);

  useEffect(() => {
    loadViolations();
  }, [selectedExamId, selectedType]);

  const loadExamsList = async () => {
    try {
      const data = await teacherService.getExams();
      setExams(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadViolations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherService.getViolations({
        exam_id: selectedExamId !== "all" ? selectedExamId : undefined,
        event_type: selectedType !== "all" ? selectedType : undefined,
        search: searchTerm || undefined,
      });
      setViolations(data);
    } catch (e: any) {
      console.error(e);
      setError("Unable to load proctoring violations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadViolations();
  };

  const filteredViolations = violations.filter((v) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.student_name.toLowerCase().includes(term) ||
      v.student_email.toLowerCase().includes(term) ||
      v.exam_title.toLowerCase().includes(term) ||
      v.event_type.toLowerCase().includes(term)
    );
  });

  return (
    <TeacherPortalLayout
      title="Proctoring Violations & Evidence Audit"
      subtitle="Inspect recorded computer vision infractions, timestamped strikes, and snapshot evidence"
    >
      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Faculty Review Guideline:</span> Computer-vision detections (such as mobile phone detection, tab switches, and candidate absence) serve as automated integrity flags. Review the high-resolution evidence snapshots before finalizing institutional penalties.
        </div>
      </div>

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
            {/* Exam Filter */}
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Examinations</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.course_code}: {ex.title}
                </option>
              ))}
            </select>

            {/* Violation Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Infraction Types</option>
              <option value="PHONE_DETECTED">PHONE_DETECTED (YOLOv4-tiny)</option>
              <option value="TAB_SWITCH">TAB_SWITCH (Visibility API)</option>
              <option value="MULTIPLE_FACES">MULTIPLE_FACES (2nd Person)</option>
              <option value="NO_FACE">NO_FACE (Candidate Absent)</option>
            </select>

            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Violations List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs">Loading proctoring records...</span>
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50 text-rose-800 rounded-xl">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <p className="text-xs font-semibold">{error}</p>
        </Card>
      ) : filteredViolations.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 bg-white rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Zero Violations Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedExamId !== "all" || selectedType !== "all"
              ? "No violations match the specified filter parameters."
              : "No proctoring infractions have been recorded across your examinations."}
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
                  <th className="py-3 px-3">Infraction Type</th>
                  <th className="py-3 px-3 text-center">Strike #</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredViolations.map((v) => {
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{v.student_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{v.student_email}</div>
                      </td>

                      {/* Exam */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1">
                          {v.course_code}
                        </span>
                        <span className="font-semibold text-slate-800">{v.exam_title}</span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-md ${
                            v.event_type === "PHONE_DETECTED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : v.event_type === "TAB_SWITCH"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-purple-100 text-purple-800 border border-purple-200"
                          }`}
                        >
                          {v.event_type}
                        </span>
                      </td>

                      {/* Strike */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          Strike {v.strike_number} of 3
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-3 max-w-xs truncate text-slate-600">
                        {v.message || "Integrity violation recorded by proctoring engine"}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(v.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      {/* Evidence snapshot preview */}
                      <td className="py-3.5 px-4 text-right">
                        {v.evidence_path ? (
                          <button
                            type="button"
                            onClick={() => setActiveEvidenceUrl(v.evidence_path)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>View Snapshot</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">No image</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Snapshot Preview Modal */}
      {activeEvidenceUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold">Computer Vision Evidence Snapshot</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveEvidenceUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={activeEvidenceUrl}
                alt="Proctoring violation frame"
                className="max-h-[60vh] max-w-full rounded-xl object-contain border border-slate-800 shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-100 text-right">
              <Button
                onClick={() => setActiveEvidenceUrl(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-1.5"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </TeacherPortalLayout>
  );
};
