import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Camera,
  Mic,
  Maximize2,
  FileText,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { examService } from "../../services/examService";
import type { Exam } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { saveCandidateBaseline } from "../../utils/faceDetection";

export const ExamInstructionsPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hardware permission states
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingHardware, setIsInitializingHardware] = useState<boolean>(false);
  const [agreedToRules, setAgreedToRules] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (examId) {
      loadExam(examId);
    }
    initializeMediaDevices();

    return () => {
      stopMediaStream();
    };
  }, [examId]);

  const loadExam = async (id: string) => {
    try {
      setLoading(true);
      const data = await examService.getExamById(id);
      setExam(data);
    } catch (err: any) {
      console.error(err);
      setError("Unable to load examination details. Please return to dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const initializeMediaDevices = async () => {
    setCameraError(null);
    setIsInitializingHardware(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support media hardware access.");
      }

      // Request both Camera and Microphone access per proctoring requirements
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true,
      });

      streamRef.current = stream;
      setCameraGranted(true);
      setMicGranted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Hardware initialization error:", err);
      // Fallback: try video only if audio permission was declined
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        streamRef.current = videoOnly;
        setCameraGranted(true);
        setMicGranted(false);
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnly;
          videoRef.current.play().catch(() => {});
        }
      } catch (videoErr: any) {
        setCameraGranted(false);
        setMicGranted(false);
        setCameraError(
          "Camera access is required for this examination. Please permit webcam access in your browser to continue."
        );
      }
    } finally {
      setIsInitializingHardware(false);
    }
  };

  const captureSnapshot = (): string => {
    if (!videoRef.current) return "";
    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const handleStartExam = async () => {
    if (!examId || !cameraGranted || !agreedToRules || isStarting) return;

    try {
      setIsStarting(true);
      const snapshot = captureSnapshot();

      const res = await examService.startExamAttempt(examId, {
        candidate_name: user?.full_name || "Alex Student",
        candidate_email: user?.email || "student@example.com",
        verification_photo_base64: snapshot || undefined,
      });

      // Establish and persist candidate baseline coordinates for proctoring engine
      if (videoRef.current) {
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 480;
        saveCandidateBaseline({
          x: Math.round(vw * 0.22),
          y: Math.round(vh * 0.12),
          width: Math.round(vw * 0.56),
          height: Math.round(vh * 0.68),
          centerX: Math.round(vw * 0.5),
          centerY: Math.round(vh * 0.46),
          aspectRatio: 0.82,
          confidence: 0.98,
          calibratedAt: Date.now(),
        });
      }

      stopMediaStream();
      navigate(`/exams/${res.attempt_id}/take`);
    } catch (err: any) {
      console.error("Failed to start exam session:", err);
      setIsStarting(false);
      alert(err?.response?.data?.detail || "Failed to initialize exam session. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-sm font-medium text-slate-600">Loading examination instructions...</span>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Examination Error</h2>
          <p className="text-sm text-slate-600">{error || "Exam could not be found."}</p>
          <Button onClick={() => navigate("/student/dashboard")} className="w-full">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Academic Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/student/dashboard"
              className="text-slate-500 hover:text-slate-700 transition-colors p-1 -ml-1 rounded-md"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-tight block">
                Secure Examination System
              </span>
              <span className="text-xs text-slate-500 block">Pre-Flight Instructions & Verification</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:block text-right">
              <span className="font-semibold text-slate-800 block">{user.full_name}</span>
              <span className="text-slate-500 block">{user.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner with Exam Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <FileText className="w-3.5 h-3.5" />
              {exam.course_code}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{exam.title}</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              {exam.description || "Official proctored examination. Please review the instructions and ensure hardware readiness."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 text-center">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Duration</span>
              <span className="text-lg font-bold text-slate-900">{exam.duration_minutes}m</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Marks</span>
              <span className="text-lg font-bold text-slate-900">{exam.total_marks}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Passing Score</span>
              <span className="text-lg font-bold text-emerald-700">{exam.passing_marks}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Left Instructions / Right Hardware Check */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Proctoring Guidelines (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">AI Proctoring Rules & Guidelines</h2>
              </div>

              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Continuous Camera Presence</strong>
                    Your face must remain clearly visible, centered, and well-lit inside the camera viewport at all times.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Single Candidate Policy</strong>
                    No secondary person or bystander may enter the camera frame or converse during the examination.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Prohibited Electronic Devices</strong>
                    Mobile phones, smartwatches, auxiliary displays, and external audio gear are strictly prohibited.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <Maximize2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block font-semibold">Browser Lockdown & Tab Switching</strong>
                    Switching browser tabs, minimizing the test window, or exiting fullscreen is logged as a strike infraction.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-950 block font-semibold">3-Strike Disqualification Policy</strong>
                    Infractions trigger automated warnings and acoustic alarms. Accumulating 3 strikes terminates the exam session immediately.
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I confirm that I am the registered candidate <strong>{user.full_name}</strong> ({user.email}). 
                  I have read the examination instructions and agree to be monitored via live video during this test.
                </span>
              </label>
            </Card>
          </div>

          {/* Right Column: Hardware & System Readiness (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Device & Camera Check</h2>
                </div>
                {cameraGranted && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Preview
                  </span>
                )}
              </div>

              {/* Video Preview Viewport */}
              <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    cameraGranted ? "block" : "hidden"
                  }`}
                />

                {!cameraGranted && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300 max-w-xs">
                      {cameraError || "Camera access is required for proctoring verification."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={initializeMediaDevices}
                      isLoading={isInitializingHardware}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Grant Camera Permission
                    </Button>
                  </div>
                )}
              </div>

              {/* Hardware Status Indicators */}
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Webcam Video</span>
                  </div>
                  {cameraGranted ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Required
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mic className="w-4 h-4 text-slate-500" />
                    <span>Audio Sensor</span>
                  </div>
                  {micGranted ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Optional
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleStartExam}
                  disabled={!cameraGranted || !agreedToRules || isStarting}
                  isLoading={isStarting}
                  size="lg"
                  className="w-full font-bold shadow-md"
                >
                  <span>Begin Examination Now</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {!cameraGranted && (
                  <p className="text-[11px] text-center text-rose-600 mt-2 font-medium">
                    Webcam access must be allowed before entering the examination.
                  </p>
                )}
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
};
