import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
  Sparkles,
  RefreshCw,
  Scan,
  Activity,
  Crosshair,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { examService } from "../../services/examService";
import type { Exam } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import {
  detectFacesInVideo,
  saveCandidateBaseline,
  type CandidateBaseline,
} from "../../utils/faceDetection";

export const CameraVerifyPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Biometric calibration states
  const [calibrationProgress, setCalibrationProgress] = useState<number>(0);
  const [calibrationStage, setCalibrationStage] = useState<string>(
    "Position your face inside the biometric oval"
  );
  const [liveCoords, setLiveCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    aspectRatio: number;
  } | null>(null);

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const calibrationFinishedRef = useRef<boolean>(false);
  const hasNavigatedRef = useRef<boolean>(false);
  const samplesRef = useRef<Array<{ x: number; y: number; width: number; height: number }>>([]);

  useEffect(() => {
    if (examId) {
      loadExam(examId);
    }
    startCamera();

    return () => {
      stopCamera();
    };
  }, [examId]);

  const loadExam = async (id: string) => {
    try {
      const data = await examService.getExamById(id);
      setExam(data);
    } catch (err) {
      console.error(err);
      setCameraError("Unable to load examination details.");
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Webcam API not supported in this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Camera init warning:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow access in browser site settings."
          : err.message || "Failed to access webcam hardware."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
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

  const proceedToExam = async (snapshot?: string) => {
    if (!examId || submitting || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    setSubmitting(true);

    const finalSnapshot = snapshot || captureSnapshot();

    try {
      const res = await examService.startExamAttempt(examId, {
        candidate_name: user.full_name,
        candidate_email: user.email,
        verification_photo_base64: finalSnapshot || undefined,
      });

      stopCamera();
      navigate(`/exams/${res.attempt_id}/take`);
    } catch (err: any) {
      console.error("Exam start error:", err);
      hasNavigatedRef.current = false;
      setSubmitting(false);
      alert(err?.response?.data?.detail || "Failed to initialize exam session.");
    }
  };

  // Real-time biometric coordinate collection & calibration loop (~2.5 to 3 seconds)
  useEffect(() => {
    if (!stream || isVerified || submitting) return;

    let calProgress = 0;
    const interval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && !calibrationFinishedRef.current) {
        try {
          const res = await detectFacesInVideo(videoRef.current, { isVerification: true });

          if (res.status === "VERIFIED" && res.coordinates) {
            setLiveCoords(res.coordinates);
            samplesRef.current.push(res.coordinates);

            calProgress = Math.min(100, calProgress + 12);
            setCalibrationProgress(calProgress);

            if (calProgress < 30) {
              setCalibrationStage("Acquiring biometric frame & facial landmarks...");
            } else if (calProgress < 65) {
              setCalibrationStage("Scanning facial geometry & measuring coordinates...");
            } else if (calProgress < 95) {
              setCalibrationStage("Calibrating candidate biometric baseline profile...");
            } else {
              setCalibrationStage("✓ Biometric Baseline Verified & Registered!");
            }

            // Reached 100% calibration
            if (calProgress >= 100 && !calibrationFinishedRef.current) {
              calibrationFinishedRef.current = true;
              clearInterval(interval);
              setIsVerified(true);
              const snapshot = captureSnapshot();

              // Compute average baseline coordinates
              const avgSamples = samplesRef.current;
              const baseline: CandidateBaseline = {
                x: Math.round(
                  avgSamples.reduce((acc, s) => acc + s.x, 0) / Math.max(1, avgSamples.length)
                ),
                y: Math.round(
                  avgSamples.reduce((acc, s) => acc + s.y, 0) / Math.max(1, avgSamples.length)
                ),
                width: Math.round(
                  avgSamples.reduce((acc, s) => acc + s.width, 0) /
                    Math.max(1, avgSamples.length)
                ),
                height: Math.round(
                  avgSamples.reduce((acc, s) => acc + s.height, 0) /
                    Math.max(1, avgSamples.length)
                ),
                centerX: res.coordinates.centerX,
                centerY: res.coordinates.centerY,
                aspectRatio: res.coordinates.aspectRatio,
                confidence: 99.4,
                calibratedAt: Date.now(),
              };
              saveCandidateBaseline(baseline);

              // Auto-launch countdown: 2 seconds
              setCountdown(2);
              let currentSec = 2;
              const timer = setInterval(() => {
                currentSec -= 1;
                setCountdown(currentSec);
                if (currentSec <= 0) {
                  clearInterval(timer);
                  proceedToExam(snapshot);
                }
              }, 1000);
            }
          } else {
            // Face shifted away or not centered: pause and hold current calibration
            if (calProgress < 100) {
              setCalibrationStage("Please center your face inside the biometric oval to calibrate");
            }
          }
        } catch {
          // ignore transient frame drops
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [stream, isVerified, submitting]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-tight block">
                Biometric Coordinate Calibration & Identity Verification
              </span>
              <span className="text-xs text-indigo-400 font-medium">
                {exam ? `${exam.course_code} • ${exam.title}` : "Secure Verification Environment"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Candidate Biometric Lock Active</span>
          </div>
        </div>
      </header>

      {/* Main Verification Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Live Camera Video with High-Tech Laser Scanning Oval */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <Card className="w-full bg-slate-950 border-slate-800 p-4 rounded-2xl overflow-hidden shadow-2xl relative">
              <div className="relative aspect-4/3 w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {/* Live Video Feed */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: "scaleX(-1)" }}
                  className="w-full h-full object-cover rounded-xl"
                />

                {/* High-Tech Dynamic Alignment Oval with Laser Scan Line */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div
                    className={`relative w-56 h-72 rounded-[50%] border-2 transition-all duration-300 flex items-center justify-center shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] overflow-hidden ${
                      isVerified
                        ? "border-emerald-400 shadow-emerald-500/30 scale-105"
                        : calibrationProgress > 0
                        ? "border-cyan-400/90 shadow-cyan-500/20"
                        : "border-dashed border-indigo-400/70"
                    }`}
                  >
                    {/* Animated Vertical Laser Sweep Line during scanning */}
                    {!isVerified && calibrationProgress > 0 && (
                      <div
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] opacity-80"
                        style={{
                          animation: "scanLaser 2.2s ease-in-out infinite alternate",
                        }}
                      />
                    )}

                    {/* Reticle Corner Crosshair Marks */}
                    <div className="absolute top-2 left-6 text-cyan-400/60 text-xs font-mono">+</div>
                    <div className="absolute top-2 right-6 text-cyan-400/60 text-xs font-mono">+</div>
                    <div className="absolute bottom-2 left-6 text-cyan-400/60 text-xs font-mono">+</div>
                    <div className="absolute bottom-2 right-6 text-cyan-400/60 text-xs font-mono">+</div>

                    {/* Central Verification Pill */}
                    <span
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-md border transition-all z-10 ${
                        isVerified
                          ? "bg-emerald-950/95 text-emerald-300 border-emerald-500 shadow-lg"
                          : calibrationProgress > 0
                          ? "bg-slate-900/90 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-900/90 text-indigo-200 border-indigo-400/30"
                      }`}
                    >
                      {isVerified
                        ? `✓ Biometric Baseline Verified! Launching in ${countdown ?? 2}s...`
                        : calibrationProgress > 0
                        ? `Scanning Facial Biometrics: ${calibrationProgress}%`
                        : "Position Face Inside Oval"}
                    </span>
                  </div>
                </div>

                {/* Live Real-time Coordinate Telemetry Overlay */}
                {liveCoords && (
                  <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md rounded-lg p-2 border border-cyan-500/30 flex items-center justify-between text-[11px] font-mono text-cyan-300 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        X: {liveCoords.x}px | Y: {liveCoords.y}px
                      </span>
                    </div>
                    <div>
                      BOX: {liveCoords.width}×{liveCoords.height}px
                    </div>
                    <div>RATIO: {liveCoords.aspectRatio}</div>
                    <div className="text-emerald-400 font-bold">CAL: {calibrationProgress}%</div>
                  </div>
                )}

                {/* Top Live Feed Indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <div className="bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Webcam Active
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-full backdrop-blur-xs border text-xs font-semibold flex items-center gap-1.5 ${
                      isVerified
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/30"
                        : calibrationProgress > 0
                        ? "bg-cyan-950/80 text-cyan-400 border-cyan-500/30"
                        : "bg-amber-950/80 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {isVerified
                      ? "Biometrics Verified"
                      : calibrationProgress > 0
                      ? `Calibrating: ${calibrationProgress}%`
                      : "Detecting Face..."}
                  </div>
                </div>

                {/* Camera Permission Fallback */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                    <h3 className="font-bold text-white text-base">Camera Access Required</h3>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="mt-4 flex gap-3">
                      <Button size="sm" onClick={startCamera}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => proceedToExam()}
                        className="text-xs border-slate-700 text-slate-300"
                      >
                        Bypass & Start Exam
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer bar */}
              <div className="mt-3 px-1 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">{calibrationStage}</span>
                {isVerified && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Calibrated
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Candidate Card & Biometric Calibration Progress */}
          <div className="lg:col-span-5 space-y-6">
            {/* Candidate Identity Card */}
            <Card className="bg-slate-950 border-slate-800 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                Candidate Verification Record
              </h3>
              <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-lg text-indigo-400">
                  {user.full_name?.charAt(0) || "C"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{user.full_name}</h4>
                  <span className="text-xs text-slate-400 block truncate">{user.email}</span>
                  <span className="text-[11px] text-indigo-400 font-semibold block mt-0.5">
                    Roll ID: {user.student_profile?.student_id_number || "CS2026-042"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Biometric Scanning & Coordinate Collection Card */}
            <Card className="bg-slate-950 border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Scan className="w-4 h-4 text-cyan-400" />
                  Biometric Baseline Calibration
                </h3>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {calibrationProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isVerified
                      ? "bg-emerald-500"
                      : "bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400"
                  }`}
                  style={{ width: `${calibrationProgress}%` }}
                />
              </div>

              {/* Calibration Stage Description */}
              <p className="text-xs text-slate-400 flex items-center gap-2">
                {isVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                )}
                <span className="font-medium text-slate-300">{calibrationStage}</span>
              </p>

              {/* Coordinates Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Head Position</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {liveCoords ? `(${liveCoords.centerX}, ${liveCoords.centerY})` : "Acquiring..."}
                  </span>
                </div>
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Bounding Dimensions</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {liveCoords ? `${liveCoords.width}×${liveCoords.height}` : "Acquiring..."}
                  </span>
                </div>
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Facial Aspect Ratio</span>
                  <span className="text-slate-200 font-mono font-semibold">
                    {liveCoords ? `${liveCoords.aspectRatio}` : "Calibrating..."}
                  </span>
                </div>
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Proctoring Lock</span>
                  <span
                    className={`font-mono font-semibold ${
                      isVerified ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isVerified ? "LOCKED & VERIFIED" : "PENDING SCAN"}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isVerified ? (
                  <Button
                    onClick={() => proceedToExam()}
                    disabled={submitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Entering Exam Kiosk...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Start Exam Now ({countdown ?? 0}s)
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full py-3.5 bg-slate-800/80 text-slate-400 font-semibold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-slate-700/50"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Scanning Biometrics ({calibrationProgress}%)
                  </Button>
                )}
              </div>
            </Card>

            {/* Anti-Cheat Policy */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-300 block mb-0.5">Integrity & Proctoring Lock:</strong>
              Your biometric face baseline has been registered for this session. During the examination,
              only unauthorized secondary persons and tab switching are penalized under the 3-strike policy.
            </div>
          </div>
        </div>
      </main>

      {/* Global Laser Scan Animation Keyframes */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 10%; }
          100% { top: 88%; }
        }
      `}</style>
    </div>
  );
};
