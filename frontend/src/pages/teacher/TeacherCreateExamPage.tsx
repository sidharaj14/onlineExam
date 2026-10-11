import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Save,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
} from "lucide-react";
import { TeacherPortalLayout } from "../../components/layout/TeacherPortalLayout";
import { teacherService } from "../../services/teacherService";
import type { QuestionCreateInput } from "../../types/teacher.types";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";

export const TeacherCreateExamPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editExamId = searchParams.get("edit");

  // Form States
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [questions, setQuestions] = useState<QuestionCreateInput[]>([
    {
      question_text: "",
      question_type: "MCQ",
      marks: 10,
      order_index: 1,
      options: [
        { id: "A", text: "" },
        { id: "B", text: "" },
        { id: "C", text: "" },
        { id: "D", text: "" },
      ],
      correct_answer: "A",
      explanation: "",
    },
  ]);

  const [hasActiveAttempts, setHasActiveAttempts] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (editExamId) {
      loadExamForEditing(editExamId);
    }
  }, [editExamId]);

  const loadExamForEditing = async (id: string) => {
    try {
      setLoading(true);
      const data = await teacherService.getExamById(id);
      setTitle(data.title);
      setCourseCode(data.course_code);
      setDescription(data.description || "");
      setDurationMinutes(data.duration_minutes);
      setTotalMarks(data.total_marks);
      setPassingMarks(data.passing_marks);
      if (data.start_time) setStartTime(data.start_time.slice(0, 16));
      if (data.end_time) setEndTime(data.end_time.slice(0, 16));
      setHasActiveAttempts(data.has_active_attempts);

      if (data.questions && data.questions.length > 0) {
        setQuestions(
          data.questions.map((q, idx) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            marks: q.marks,
            order_index: q.order_index || idx + 1,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
          }))
        );
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to load existing exam details for editing.");
    } finally {
      setLoading(false);
    }
  };

  const calculatedQuestionMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  const marksMismatch = calculatedQuestionMarks !== Number(totalMarks);

  // Question manipulations
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        question_type: "MCQ",
        marks: 10,
        order_index: questions.length + 1,
        options: [
          { id: "A", text: "" },
          { id: "B", text: "" },
          { id: "C", text: "" },
          { id: "D", text: "" },
        ],
        correct_answer: "A",
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("An exam must have at least one question.");
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index);
    setQuestions(updated);
  };

  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question_text = text;
    setQuestions(updated);
  };

  const updateQuestionMarks = (index: number, marks: number) => {
    const updated = [...questions];
    updated[index].marks = Math.max(1, marks);
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optId: string, text: string) => {
    const updated = [...questions];
    const optList = updated[qIndex].options.map((opt) =>
      opt.id === optId ? { ...opt, text } : opt
    );
    updated[qIndex].options = optList;
    setQuestions(updated);
  };

  const setCorrectOption = (qIndex: number, optId: string) => {
    const updated = [...questions];
    updated[qIndex].correct_answer = optId;
    setQuestions(updated);
  };

  const updateExplanation = (qIndex: number, explanation: string) => {
    const updated = [...questions];
    updated[qIndex].explanation = explanation;
    setQuestions(updated);
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    )
      return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  // Submit Handler
  const handleSaveExam = async (publish: boolean) => {
    setError(null);
    setSuccess(null);

    // Validation
    if (!title.trim()) {
      setError("Please provide an examination title.");
      return;
    }
    if (!courseCode.trim()) {
      setError("Please specify the course or subject code (e.g. CS301).");
      return;
    }
    if (durationMinutes <= 0) {
      setError("Exam duration must be at least 5 minutes.");
      return;
    }
    if (totalMarks <= 0) {
      setError("Total marks must be greater than zero.");
      return;
    }

    if (!hasActiveAttempts) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_text.trim()) {
          setError(`Question #${i + 1} is missing its question statement.`);
          return;
        }
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            setError(`Question #${i + 1} has an empty option (${opt.id}). Please fill in all options.`);
            return;
          }
        }
      }

      if (publish && marksMismatch) {
        setError(
          `Cannot publish: The sum of question marks (${calculatedQuestionMarks}) must equal the configured total marks (${totalMarks}).`
        );
        return;
      }
    }

    try {
      setSaving(true);
      if (editExamId) {
        await teacherService.updateExam(editExamId, {
          title,
          course_code: courseCode,
          description,
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          passing_marks: passingMarks,
          is_published: publish,
          start_time: startTime ? new Date(startTime).toISOString() : undefined,
          end_time: endTime ? new Date(endTime).toISOString() : undefined,
          questions: hasActiveAttempts ? undefined : questions,
        });
        setSuccess(`Examination ${publish ? "published" : "updated as draft"} successfully.`);
      } else {
        await teacherService.createExam({
          title,
          course_code: courseCode,
          description,
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          passing_marks: passingMarks,
          is_published: publish,
          start_time: startTime ? new Date(startTime).toISOString() : undefined,
          end_time: endTime ? new Date(endTime).toISOString() : undefined,
          questions,
        });
        setSuccess(`Examination ${publish ? "published" : "saved as draft"} successfully.`);
      }

      setTimeout(() => {
        navigate("/teacher/exams");
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while saving the examination.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TeacherPortalLayout title="Loading Examination Form...">
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <span className="text-xs">Fetching examination structure...</span>
        </div>
      </TeacherPortalLayout>
    );
  }

  return (
    <TeacherPortalLayout
      title={editExamId ? "Edit Examination" : "Create New Examination"}
      subtitle="Design objective questions, specify marks, assign answer keys, and configure proctoring limits"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{previewMode ? "Edit Form" : "Candidate Preview"}</span>
          </button>

          <Button
            onClick={() => handleSaveExam(false)}
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </Button>

          <Button
            onClick={() => handleSaveExam(true)}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Publish Exam</span>
          </Button>
        </div>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{success}</span>
        </div>
      )}

      {hasActiveAttempts && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Student Submissions Detected:</span> Questions and answer keys are locked to preserve existing grading integrity. You may still update title, description, and status.
          </div>
        </div>
      )}

      {previewMode ? (
        /* Candidate Preview Screen */
        <Card className="p-6 sm:p-8 bg-white border-slate-200 rounded-2xl shadow-xs">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
              {courseCode || "CS101"}
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">{title || "Untitled Examination"}</h2>
            <p className="text-xs text-slate-500 mt-1">{description || "No instructions provided."}</p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mt-3 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {durationMinutes} minutes
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                {totalMarks} Total Marks (Pass: {passingMarks})
              </span>
              <span>•</span>
              <span>{questions.length} Questions</span>
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-xs text-slate-800">
                    Question {idx + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {q.marks} Mark{q.marks > 1 ? "s" : ""}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900 mb-4">{q.question_text || "(Empty Question Statement)"}</p>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isKey = q.correct_answer === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isKey
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                              isKey ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span>{opt.text || `(Empty Option ${opt.id})`}</span>
                        </div>
                        {isKey && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Configured Answer Key
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-3 text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        /* Edit Form */
        <div className="space-y-6">
          {/* Section 1: Basic Details Card */}
          <Card className="p-6 bg-white border-slate-200 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              1. General Examination Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Examination Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. CS301: Advanced Data Structures Final"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Subject Code <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. CS301"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Candidate Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain examination scope, prohibited materials, and proctoring expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Minutes) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Marks <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Passing Marks <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule Start (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Schedule End (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Questions Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  2. Examination Questions ({questions.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Multiple-choice questions evaluated by the automated grading engine.
                </p>
              </div>

              {/* Live Marks Counter Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                  marksMismatch
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                }`}
              >
                <span>Question Marks: {calculatedQuestionMarks} / {totalMarks}</span>
                {marksMismatch && (
                  <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded font-sans">
                    Mismatch
                  </span>
                )}
              </div>
            </div>

            {questions.map((q, idx) => (
              <Card key={idx} className="p-5 bg-white border-slate-200 rounded-2xl shadow-xs space-y-4">
                {/* Question Header Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">Question Item #{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Marks config */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold">Marks:</span>
                      <input
                        type="number"
                        min={1}
                        disabled={hasActiveAttempts}
                        value={q.marks}
                        onChange={(e) => updateQuestionMarks(idx, Number(e.target.value))}
                        className="w-12 text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>

                    {/* Reorder buttons */}
                    {!hasActiveAttempts && (
                      <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(idx, "down")}
                          disabled={idx === questions.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Delete Question */}
                    {!hasActiveAttempts && questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Statement <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    disabled={hasActiveAttempts}
                    placeholder="Enter the problem statement or question..."
                    value={q.question_text}
                    onChange={(e) => updateQuestionText(idx, e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                {/* Options and Answer Key Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Options & Answer Key (Click radio to mark correct answer)
                    </label>
                    <span className="text-[11px] text-slate-400">Current Key: Option {q.correct_answer}</span>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isCorrect = q.correct_answer === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect ? "bg-emerald-50/70 border-emerald-300" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {/* Radio select for correct answer */}
                          <button
                            type="button"
                            disabled={hasActiveAttempts}
                            onClick={() => setCorrectOption(idx, opt.id)}
                            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              isCorrect
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                            }`}
                            title={`Set ${opt.id} as the correct answer key`}
                          >
                            {opt.id}
                          </button>

                          {/* Option text input */}
                          <input
                            type="text"
                            disabled={hasActiveAttempts}
                            placeholder={`Option ${opt.id} text...`}
                            value={opt.text}
                            onChange={(e) => updateOptionText(idx, opt.id, e.target.value)}
                            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                          />

                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 px-2 shrink-0">
                              CORRECT KEY
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Explanation / Solution Details (Optional, shown after exam completion)
                  </label>
                  <input
                    type="text"
                    disabled={hasActiveAttempts}
                    placeholder="Provide justification for why this answer is correct..."
                    value={q.explanation || ""}
                    onChange={(e) => updateExplanation(idx, e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>
              </Card>
            ))}

            {/* Add Question Button */}
            {!hasActiveAttempts && (
              <button
                type="button"
                onClick={addQuestion}
                className="w-full py-4 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Question</span>
              </button>
            )}
          </div>
        </div>
      )}
    </TeacherPortalLayout>
  );
};
