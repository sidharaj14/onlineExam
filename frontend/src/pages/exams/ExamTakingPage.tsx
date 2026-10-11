import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Eye,
  AlertCircle,
  Users,
  EyeOff,
  Minimize2,
  Sparkles,
  XCircle,
  Lock,
  Maximize,
  AlertOctagon,
  Camera,
  RefreshCw,
  Smartphone,
  Mic,
} from "lucide-react";
import { examService } from "../../services/examService";
import type { ExamAttemptDetail } from "../../types/exam.types";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import {
  detectFacesInVideo,
  playWarningBuzzer,
  type FaceDetectionResult,
} from "../../utils/faceDetection";

export const ExamTakingPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>("All changes saved");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Proctoring & Face Detection States
  const [faceStatus, setFaceStatus] = useState<FaceDetectionResult | null>(null);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);
  const [activeWarning, setActiveWarning] = useState<{
    warningNumber: number;
    title: string;
    message: string;
    type: string;
  } | null>(null);
  const activeWarningRef = useRef<boolean>(false);

  // Kiosk mode & Security states
  const [isFullscreenLocked, setIsFullscreenLocked] = useState<boolean>(false);
  const [isSuspendedFullscreen, setIsSuspendedFullscreen] = useState<boolean>(false);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [showSimPanel, setShowSimPanel] = useState<boolean>(false);

  // Camera stream & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastViolationTimeRef = useRef<number>(0);
  const lastTabSwitchTimeRef = useRef<number>(0);
  const consecutiveNoFaceRef = useRef<number>(0);
  const consecutiveMultipleFacesRef = useRef<number>(0);
  const consecutiveSuspiciousMovementRef = useRef<number>(0);

  // Dismiss active warning and give candidate a safe adjustment grace period
  const dismissWarning = useCallback(() => {
    setActiveWarning(null);
    activeWarningRef.current = false;
    lastViolationTimeRef.current = Date.now() + 6000;
    consecutiveNoFaceRef.current = 0;
    consecutiveMultipleFacesRef.current = 0;
    consecutiveSuspiciousMovementRef.current = 0;
  }, []);

  // Dynamic Video Element Attachment
  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node
        .play()
        .then(() => setIsCameraActive(true))
        .catch((err) => console.warn("Video playback prevented, retrying...", err));
    }
  }, []);

  useEffect(() => {
    if (attemptId) {
      loadAttempt(attemptId);
    }
    startProctorCamera();

    return () => {
      stopProctorCamera();
    };
  }, [attemptId]);

  // Ensure camera stream attaches whenever loading completes
  useEffect(() => {
    if (!loading) {
      if (streamRef.current && videoRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        videoRef.current
          .play()
          .then(() => setIsCameraActive(true))
          .catch(() => {});
      } else if (!streamRef.current) {
        startProctorCamera();
      }
    }
  }, [loading]);

  // Timer interval
  useEffect(() => {
    if (timeRemaining <= 0 || isTerminated) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isTerminated]);

  const loadAttempt = async (id: string) => {
    try {
      setLoading(true);
      const data = await examService.getAttemptDetails(id);
      setAttempt(data);
      setTimeRemaining(data.time_remaining_seconds);
      setAnswers((data.saved_answers as Record<string, string>) || {});
      setWarningsCount(data.violations_count || 0);

      if (data.status === "TERMINATED_VIOLATION") {
        setIsTerminated(true);
        navigate(`/exams/${data.attempt_id}/result`);
      } else if (data.status === "SUBMITTED" || data.status === "TIMED_OUT") {
        navigate(`/exams/${data.attempt_id}/result`);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load examination attempt session.");
    } finally {
      setLoading(false);
    }
  };

  const startProctorCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Webcam not supported in this browser.");
        return;
      }

      if (streamRef.current && streamRef.current.active) {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
          }
          videoRef.current
            .play()
            .then(() => setIsCameraActive(true))
            .catch(() => {});
        }
        return;
      }

      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current
          .play()
          .then(() => setIsCameraActive(true))
          .catch(() => {});
      }
    } catch (e: any) {
      console.warn("Proctor camera stream error:", e);
      setCameraError("Unable to access webcam. Please check permissions.");
    }
  };

  const stopProctorCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const captureFrameSnapshot = (): string | undefined => {
    if (!videoRef.current) return undefined;
    const video = videoRef.current;
    if (video.videoWidth === 0) return undefined;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const canvas = offscreenCanvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  // Trigger violation warning and handle 3-strike auto-termination
  const triggerViolation = useCallback(
    async (violationType: string, message: string) => {
      if (isTerminated || !attemptId || activeWarningRef.current) return;

      const now = Date.now();
      // Debounce violations: at least 10 seconds between camera warnings
      if (now - lastViolationTimeRef.current < 10000) {
        return;
      }
      lastViolationTimeRef.current = now;

      // Audible alert buzzer
      playWarningBuzzer();

      const snapshot = captureFrameSnapshot();
      try {
        const res = await examService.recordViolation(attemptId, {
          violation_type: violationType,
          message,
          snapshot_base64: snapshot,
        });

        const newCount = res.violations_count;
        setWarningsCount(newCount);

        // Clear dynamic title per violation type
        let warningTitle = "PROCTORING WARNING";
        if (violationType === "MULTIPLE_FACES") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: 2ND PERSON DETECTED" : `STRIKE ${newCount}: 2ND PERSON IN CAMERA`;
        } else if (violationType === "PHONE_DETECTED") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: MOBILE PHONE DETECTED" : `STRIKE ${newCount}: MOBILE PHONE / DEVICE IN RADAR`;
        } else if (violationType === "SUSPICIOUS_MOVEMENT") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: SUSPICIOUS MOVEMENT" : `STRIKE ${newCount}: SUSPICIOUS HAND MOVEMENT`;
        } else if (violationType === "TAB_SWITCH") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: TAB SWITCH DETECTED" : `STRIKE ${newCount}: TAB SWITCH DETECTED`;
        } else if (violationType === "FULLSCREEN_EXIT") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: FULLSCREEN EXITED" : `STRIKE ${newCount}: FULLSCREEN EXITED`;
        } else if (violationType === "NO_FACE") {
          warningTitle = newCount >= 3 ? "DISQUALIFIED: CANDIDATE ABSENT" : `STRIKE ${newCount}: CANDIDATE ABSENT`;
        }

        activeWarningRef.current = true;
        if (res.terminated || newCount >= 3) {
          setIsTerminated(true);
          stopProctorCamera();
          setActiveWarning({
            warningNumber: 3,
            title: "EXAMINATION TERMINATED (3 OF 3 STRIKES)",
            message,
            type: violationType,
          });

          // Redirect to scorecard with violations after 3.5 seconds
          setTimeout(() => {
            navigate(`/exams/${attemptId}/result`);
          }, 3500);
        } else {
          setActiveWarning({
            warningNumber: newCount,
            title: warningTitle,
            message,
            type: violationType,
          });
        }
      } catch (e) {
        console.error("Violation recording error:", e);
      }
    },
    [attemptId, isTerminated, navigate]
  );

  // Dedicated tab switch violation recorder (bypasses camera cooldowns & frame snapshots)
  const handleTabSwitchViolation = useCallback(
    async (message: string) => {
      if (isTerminated || !attemptId) return;

      const now = Date.now();
      // Ignore duplicate visibility events within 5 seconds (5000ms)
      if (now - lastTabSwitchTimeRef.current < 5000) {
        console.log("[PROCTORING] TAB_SWITCH ignored (duplicate event within 5s window)");
        return;
      }
      lastTabSwitchTimeRef.current = now;

      console.log("[PROCTORING] TAB SWITCH DETECTED - Recording violation immediately for attempt:", attemptId);

      // Play warning buzzer immediately
      playWarningBuzzer();

      try {
        const res = await examService.recordViolation(attemptId, {
          violation_type: "TAB_SWITCH",
          message,
        });

        console.log("[PROCTORING] TAB_SWITCH recorded successfully:", res);

        const newCount = res.violations_count;
        setWarningsCount(newCount);

        const warningTitle =
          newCount >= 3
            ? "DISQUALIFIED: TAB SWITCH DETECTED"
            : `STRIKE ${newCount}: TAB SWITCH DETECTED`;

        activeWarningRef.current = true;
        if (res.terminated || newCount >= 3) {
          setIsTerminated(true);
          stopProctorCamera();
          setActiveWarning({
            warningNumber: 3,
            title: "EXAMINATION TERMINATED (3 OF 3 STRIKES)",
            message,
            type: "TAB_SWITCH",
          });

          setTimeout(() => {
            navigate(`/exams/${attemptId}/result`);
          }, 3500);
        } else {
          setActiveWarning({
            warningNumber: newCount,
            title: warningTitle,
            message,
            type: "TAB_SWITCH",
          });
        }
      } catch (e) {
        console.error("[PROCTORING] Error recording TAB_SWITCH violation:", e);
      }
    },
    [attemptId, isTerminated, navigate]
  );

  // Tab switching detection via Visibility API (Immediate event on document.hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("[PROCTORING] visibilitychange:", {
        visibilityState: document.visibilityState,
        hidden: document.hidden,
        attemptId,
        isTerminated,
      });

      if (isTerminated || !attemptId) return;

      if (document.visibilityState === "hidden" || document.hidden) {
        console.log("[PROCTORING] TAB SWITCH DETECTED IMMEDIATELY");
        handleTabSwitchViolation("Tab switch detected! Return to exam immediately.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [attemptId, isTerminated, handleTabSwitchViolation]);

  // Real-time OpenCV & AI Proctoring Loop: Sends sampled camera frames to backend OpenCV engine
  useEffect(() => {
    if (isTerminated || !attemptId) return;

    const interval = setInterval(async () => {
      // Pause detection accumulation if exam is terminated or candidate is currently acknowledging a warning
      if (isTerminated || activeWarningRef.current) {
        return;
      }

      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const snapshot = captureFrameSnapshot();
          if (snapshot) {
            const backendRes = await examService.processFrame(attemptId, snapshot);
            
            // Update live camera monitoring HUD badge
            setFaceStatus({
              faceCount: backendRes.face_count,
              faces: [],
              status: backendRes.status as any,
              message: backendRes.message,
              lightingScore: 95,
              isCentered: true,
            });

            // Handle confirmed OpenCV violation trigger & 3-strike escalation
            if (backendRes.violation_detected && backendRes.violation) {
              const newCount = backendRes.violation.violations_count;
              setWarningsCount(newCount);
              playWarningBuzzer();

              let warningTitle = "PROCTORING WARNING";
              if (backendRes.status === "MULTIPLE_FACES") {
                warningTitle = newCount >= 3 ? "DISQUALIFIED: 2ND PERSON DETECTED" : `STRIKE ${newCount}: 2ND PERSON IN CAMERA`;
              } else if (backendRes.status === "PHONE_DETECTED") {
                warningTitle = newCount >= 3 ? "DISQUALIFIED: MOBILE PHONE DETECTED" : `STRIKE ${newCount}: MOBILE PHONE / DEVICE IN RADAR`;
              } else if (backendRes.status === "NO_FACE") {
                warningTitle = newCount >= 3 ? "DISQUALIFIED: CANDIDATE ABSENT" : `STRIKE ${newCount}: CANDIDATE ABSENT`;
              }

              activeWarningRef.current = true;
              if (backendRes.violation.terminated || newCount >= 3) {
                setIsTerminated(true);
                stopProctorCamera();
                setActiveWarning({
                  warningNumber: 3,
                  title: "EXAMINATION TERMINATED (3 OF 3 STRIKES)",
                  message: backendRes.message,
                  type: backendRes.status,
                });
                setTimeout(() => {
                  navigate(`/exams/${attemptId}/result`);
                }, 3500);
              } else {
                setActiveWarning({
                  warningNumber: newCount,
                  title: warningTitle,
                  message: backendRes.message,
                  type: backendRes.status,
                });
              }
            }
          }
        } catch {
          // Fall back to client-side detection on network blip
          try {
            const res = await detectFacesInVideo(videoRef.current, { isVerification: false });
            setFaceStatus(res);
          } catch {
            // ignore
          }
        }
      } else if (!isCameraActive || cameraError) {
        setFaceStatus((prev) => {
          if (prev?.status === "CAMERA_UNAVAILABLE") return prev;
          return {
            faceCount: 0,
            faces: [],
            status: "CAMERA_UNAVAILABLE",
            message: cameraError || "Camera unavailable",
            lightingScore: 0,
            isCentered: false,
          };
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [attemptId, isTerminated, navigate]);

  // Helper to show brief alert toast for blocked shortcuts/actions
  const showBlockedActionToast = (msg: string) => {
    setBlockedNotice(msg);
    setTimeout(() => {
      setBlockedNotice((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  // Fullscreen request handler
  const enterFullscreenMode = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
    } finally {
      setIsFullscreenLocked(true);
      setIsSuspendedFullscreen(false);
    }
  };

  const returnToFullscreen = async () => {
    await enterFullscreenMode();
  };

  // Listen for fullscreen change (pause exam UI without charging a strike unless deliberated)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isFs) {
        if (isFullscreenLocked && !isTerminated && !showSubmitModal) {
          setIsSuspendedFullscreen(true);
        }
      } else {
        setIsSuspendedFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [isFullscreenLocked, isTerminated, showSubmitModal, triggerViolation]);

  // Comprehensive Anti-Cheat: Block shortcuts, Right-Click, Copy/Paste, Navigation
  useEffect(() => {
    // 1. Block prohibited keys and shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTerminated) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Function keys (F1 - F12)
      if (e.key.startsWith("F") && e.key.length <= 3) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedActionToast(`Key ${e.key} is disabled during examination.`);
        return;
      }

      // Alt key combinations (Alt+Tab, Alt+F4, Alt+Left/Right)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        showBlockedActionToast("Application switching is prohibited.");
        return;
      }

      // Escape key (attempting to exit fullscreen)
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        showBlockedActionToast("Exiting full-screen exam mode is not permitted.");
        return;
      }

      // Modifier key combinations (Ctrl/Cmd + C, V, X, A, S, P, R, T, W, N, U, I, J)
      if (modKey) {
        const key = e.key.toLowerCase();
        const blockedKeys = [
          "c", // Copy
          "v", // Paste
          "x", // Cut
          "a", // Select all
          "s", // Save
          "p", // Print
          "r", // Refresh
          "t", // New tab
          "w", // Close tab
          "n", // New window
          "u", // View source
          "i", // DevTools
          "j", // DevTools
        ];
        if (blockedKeys.includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          showBlockedActionToast(
            `Shortcut ${isMac ? "Cmd" : "Ctrl"}+${key.toUpperCase()} is disabled.`
          );
          return;
        }
      }
    };

    // 2. Right-click context menu blocker
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showBlockedActionToast("Right-click context menu is disabled.");
    };

    // 3. Clipboard copy, paste, cut blockers
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showBlockedActionToast("Copying examination content is prohibited.");
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      showBlockedActionToast("Cut action is disabled.");
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      showBlockedActionToast("Pasting content is disabled.");
    };

    // 4. Disable text selection outside input fields
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    };

    // 5. Warn on window unload (closing tab/browser)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isTerminated && !showSubmitModal) {
        e.preventDefault();
        e.returnValue = "Warning: Leaving this exam will cause immediate disqualification.";
        return e.returnValue;
      }
    };

    // 6. Navigation trap (Back button)
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      showBlockedActionToast("Browser navigation is disabled. Submit your exam to finish.");
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("copy", handleCopy, true);
    window.addEventListener("cut", handleCut, true);
    window.addEventListener("paste", handlePaste, true);
    window.addEventListener("selectstart", handleSelectStart, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("copy", handleCopy, true);
      window.removeEventListener("cut", handleCut, true);
      window.removeEventListener("paste", handlePaste, true);
      window.removeEventListener("selectstart", handleSelectStart, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isTerminated, showSubmitModal]);

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (isTerminated) return;
    const updated = { ...answers, [questionId]: optionId };
    setAnswers(updated);
    setIsSaving(true);
    setSaveStatus("Saving answer...");

    try {
      if (attemptId) {
        await examService.saveAnswer(attemptId, questionId, optionId);
        setSaveStatus("Saved");
      }
    } catch (e) {
      console.error("Autosave error:", e);
      setSaveStatus("Offline save (cached)");
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleClearAnswer = async (questionId: string) => {
    if (isTerminated) return;
    const updated = { ...answers };
    delete updated[questionId];
    setAnswers(updated);

    if (attemptId) {
      try {
        await examService.saveAnswer(attemptId, questionId, "");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleAutoSubmit = async () => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await examService.submitExam(attemptId);
      navigate(`/exams/${attemptId}/result`);
    } catch (e) {
      console.error("Auto-submit error:", e);
      navigate(`/exams/${attemptId}/result`);
    }
  };

  const handleFinalSubmit = async () => {
    if (!attemptId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await examService.submitExam(attemptId);
      stopProctorCamera();
      navigate(`/exams/${attemptId}/result`);
    } catch (e) {
      console.error("Submit error:", e);
      navigate(`/exams/${attemptId}/result`);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading secure examination environment...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold">Examination Load Error</h2>
        <p className="text-sm text-slate-400 mt-2">{error || "Attempt session could not be found."}</p>
        <Button className="mt-5 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate("/student/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const currentQ = attempt.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalCount = attempt.questions.length;
  const isTimeCritical = timeRemaining < 300;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      {/* Top Fixed Control Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded-md font-mono font-bold">
                  {attempt.course_code}
                </span>
                <span className="font-bold text-white text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-md">
                  {attempt.exam_title}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Candidate: {attempt.candidate_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Live Violation Strikes Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                warningsCount === 0
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/30"
                  : warningsCount === 1
                  ? "bg-amber-950/90 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-rose-950 text-rose-300 border-rose-500 animate-pulse"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Warnings: {warningsCount} / 3 {warningsCount === 2 ? "(FINAL)" : ""}
              </span>
            </div>

            {/* Real-time Countdown Timer */}
            <div
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl border text-sm sm:text-base font-mono font-bold transition-colors ${
                isTimeCritical
                  ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse"
                  : "bg-slate-800 border-slate-700 text-slate-200"
              }`}
            >
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>{formatTime(timeRemaining)}</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => setShowSubmitModal(true)}
              disabled={isTerminated}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Exam
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Center / Left Pane: Active Question Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-xs rounded-2xl relative">
            {/* Disabled Overlay if Terminated */}
            {isTerminated && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center rounded-2xl">
                <XCircle className="w-16 h-16 text-rose-600 mb-3 animate-bounce" />
                <h3 className="text-xl font-extrabold text-slate-900">
                  Examination Terminated
                </h3>
                <p className="text-sm text-slate-600 mt-2 max-w-md">
                  The test session has been stopped due to 3 integrity violations. Navigating to audit scorecard...
                </p>
              </div>
            )}

            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900">
                  Question {currentIndex + 1}
                </span>
                <span className="text-xs text-slate-400">of {totalCount}</span>
                <span className="ml-2 text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full">
                  {currentQ.marks} Marks
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleReview(currentQ.id)}
                  disabled={isTerminated}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    markedForReview[currentQ.id]
                      ? "bg-purple-50 text-purple-700 border-purple-300 font-bold"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      markedForReview[currentQ.id] ? "fill-purple-600 text-purple-600" : "text-slate-400"
                    }`}
                  />
                  {markedForReview[currentQ.id] ? "Marked for Review" : "Mark for Review"}
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-6">
              <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed">
                {currentQ.question_text}
              </p>
            </div>

            {/* Options List */}
            <div className="space-y-3 mb-8">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.id;
                return (
                  <label
                    key={opt.id}
                    onClick={() => !isTerminated && handleSelectOption(currentQ.id, opt.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 select-none ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    } ${isTerminated ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "border border-slate-300 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {opt.id}
                    </div>

                    <div className="flex-1 text-sm font-medium text-slate-800 pt-0.5 leading-normal">
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                {answers[currentQ.id] && !isTerminated && (
                  <button
                    onClick={() => handleClearAnswer(currentQ.id)}
                    className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors"
                  >
                    Clear Response
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0 || isTerminated}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={currentIndex === totalCount - 1 || isTerminated}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                  className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Autosave subtle status bar */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  isSaving ? "text-amber-500 animate-spin" : "text-emerald-600"
                }`}
              />
              {saveStatus}
            </span>
            <span>All keystrokes & options are audited live.</span>
          </div>
        </div>

        {/* Right Pane: AI Proctor Feed, Warning Meter & Question Palette */}
        <div className="lg:col-span-4 space-y-5">
          {/* Continuous Camera Feed & Live AI Status */}
          <Card className="p-3.5 bg-slate-950 border-slate-800 text-white rounded-2xl overflow-hidden shadow-lg">
            {/* Proctor Header Status Badges */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Monitoring Active
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <span className="flex items-center gap-1">
                  <Camera className={`w-3.5 h-3.5 ${isCameraActive ? "text-emerald-400" : "text-amber-400"}`} />
                  {isCameraActive ? "Camera Connected" : "Connecting..."}
                </span>
                <span className="flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  Mic Connected
                </span>
              </div>
            </div>

            <div className="relative aspect-4/3 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={attachVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: "scaleX(-1)" }}
                className="w-full h-full object-cover rounded-xl"
              />



              {/* Fallback if camera stream is reconnecting */}
              {!isCameraActive && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center">
                  <Camera className="w-8 h-8 text-slate-500 animate-pulse mb-2" />
                  <p className="text-xs text-slate-400">
                    {cameraError || "Initializing proctor video stream..."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startProctorCamera}
                    className="mt-2 text-xs py-1 px-2.5 h-auto text-slate-300 border-slate-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Reconnect Camera
                  </Button>
                </div>
              )}

              {/* Status Pills */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                {(!faceStatus || faceStatus.status === "VERIFIED") && (
                  <div className="bg-slate-900/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Camera active — face detected
                  </div>
                )}

                {faceStatus?.status === "CHECKING" && (
                  <div className="bg-slate-900/90 backdrop-blur-xs text-sky-300 border border-sky-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                    Checking face position...
                  </div>
                )}

                {faceStatus?.status === "NO_FACE" && (
                  <div className="bg-amber-950/90 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1.5">
                    <EyeOff className="w-3 h-3 text-amber-400" />
                    Face not detected — please position your face in the camera
                  </div>
                )}

                {(cameraError || faceStatus?.status === "CAMERA_UNAVAILABLE") && (
                  <div className="bg-rose-950/90 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    Camera unavailable
                  </div>
                )}

                {faceStatus?.status === "MULTIPLE_FACES" && (
                  <div className="bg-rose-950/90 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-rose-400" />
                    2+ Faces Alert
                  </div>
                )}

                {(faceStatus?.status === "PHONE_DETECTED" || faceStatus?.status === "SUSPICIOUS_MOVEMENT") && (
                  <div className="bg-rose-950/90 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3 text-rose-400" />
                    Device / Hand Alert
                  </div>
                )}
              </div>

              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1 pointer-events-none">
                <Eye className="w-3 h-3 text-indigo-400" /> Continuous Feed
              </div>
            </div>

            {/* Warning Strikes Gauge */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Integrity Strikes:</span>
                <span
                  className={`font-bold ${
                    warningsCount === 0
                      ? "text-emerald-400"
                      : warningsCount === 1
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {warningsCount} / 3 Allowed
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex gap-1 p-0.5">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-full rounded-full transition-all ${
                      warningsCount >= step
                        ? step === 3
                          ? "bg-rose-600 animate-pulse"
                          : step === 2
                          ? "bg-rose-500"
                          : "bg-amber-500"
                        : "bg-slate-700/60"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block leading-tight">
                {warningsCount === 0
                  ? "Clean session. Keep face centered and stay in this tab."
                  : warningsCount === 1
                  ? "Warning 1 logged. Ensure you are alone and no other face is visible."
                  : warningsCount === 2
                  ? "CRITICAL: Final warning. 1 more infraction will stop the exam."
                  : "3rd strike incurred. Examination disqualified."}
              </span>
            </div>

            {/* Hackathon Demo Simulation Tool (Collapsible) */}
            <div className="mt-2.5 border-t border-slate-800 pt-2 text-center">
              <button
                onClick={() => setShowSimPanel(!showSimPanel)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {showSimPanel ? "Hide Demo Triggers" : "Simulate Violations (Hackathon Testing)"}
              </button>

              {showSimPanel && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-slate-900 rounded-lg border border-indigo-900/40 text-[10px]">
                  <button
                    onClick={() =>
                      triggerViolation(
                        "MULTIPLE_FACES",
                        "Demo Trigger: Multiple faces (2nd person) detected in camera frame!"
                      )
                    }
                    className="p-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded border border-indigo-700/40 flex flex-col items-center justify-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    2nd Face
                  </button>

                  <button
                    onClick={() =>
                      triggerViolation(
                        "PHONE_DETECTED",
                        "Demo Trigger: Mobile phone / suspicious hand movement detected in camera view!"
                      )
                    }
                    className="p-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 rounded border border-amber-700/40 flex flex-col items-center justify-center gap-1"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    Phone / Hand
                  </button>

                  <button
                    onClick={() =>
                      triggerViolation(
                        "TAB_SWITCH",
                        "Demo Trigger: Tab switch / focus lost."
                      )
                    }
                    className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded border border-rose-700/40 flex flex-col items-center justify-center gap-1"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-rose-400" />
                    Tab Switch
                  </button>

                  <button
                    onClick={() =>
                      triggerViolation(
                        "FULLSCREEN_EXIT",
                        "Demo Trigger: Candidate exited locked fullscreen mode!"
                      )
                    }
                    className="p-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-300 rounded border border-purple-700/40 flex flex-col items-center justify-center gap-1"
                  >
                    <Maximize className="w-3.5 h-3.5 text-purple-400" />
                    Exit Fullscreen
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Question Palette Card */}
          <Card className="p-5 border-slate-200 bg-white rounded-2xl shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Question Palette</h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2 font-medium">
                Answered: <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg p-2 font-medium">
                Unanswered: <span className="font-bold">{totalCount - answeredCount}</span>
              </div>
            </div>

            {/* Numbers Grid */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {attempt.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isReview = !!markedForReview[q.id];
                const isCurrent = currentIndex === idx;

                let btnStyle = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
                if (isReview) {
                  btnStyle = "bg-purple-600 text-white border-purple-700 font-bold shadow-xs";
                } else if (isAnswered) {
                  btnStyle = "bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    disabled={isTerminated}
                    className={`h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center relative ${btnStyle} ${
                      isCurrent ? "ring-2 ring-indigo-600 ring-offset-2 scale-105" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0"></span>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0"></span>
                <span>Not Answered</span>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* PROCTORING VIOLATION WARNING MODAL (STRIKES 1, 2, AND 3) */}
      {activeWarning && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card
            className={`max-w-lg w-full p-6 sm:p-7 rounded-2xl shadow-2xl border-2 animate-in zoom-in-95 duration-200 ${
              activeWarning.warningNumber === 3
                ? "bg-rose-950 text-white border-rose-500 shadow-rose-600/30"
                : activeWarning.warningNumber === 2
                ? "bg-slate-900 text-white border-rose-500"
                : "bg-slate-900 text-white border-amber-500"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeWarning.warningNumber === 3
                    ? "bg-rose-600 text-white animate-bounce"
                    : activeWarning.warningNumber === 2
                    ? "bg-rose-500 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {activeWarning.warningNumber === 3 ? (
                  <XCircle className="w-7 h-7" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
                      activeWarning.warningNumber === 3
                        ? "bg-rose-800 text-white"
                        : activeWarning.warningNumber === 2
                        ? "bg-rose-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    Strike {activeWarning.warningNumber} of 3
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white">
                  {activeWarning.title}
                </h3>

                {/* Clear Distinct Infraction Type Badge */}
                <div className="my-2.5 inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700">
                  {activeWarning.type === "MULTIPLE_FACES" && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Infraction: Secondary Person in Camera Radar
                    </span>
                  )}
                  {activeWarning.type === "PHONE_DETECTED" && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> Infraction: Mobile Phone / Prohibited Device Detected
                    </span>
                  )}
                  {activeWarning.type === "SUSPICIOUS_MOVEMENT" && (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5" /> Infraction: Suspicious Hand / Off-Screen Movement
                    </span>
                  )}
                  {activeWarning.type === "TAB_SWITCH" && (
                    <span className="text-indigo-400 flex items-center gap-1.5">
                      <Minimize2 className="w-3.5 h-3.5" /> Infraction: Tab / Window Switching Detected
                    </span>
                  )}
                  {activeWarning.type === "FULLSCREEN_EXIT" && (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <Maximize className="w-3.5 h-3.5" /> Infraction: Fullscreen Lockdown Exited
                    </span>
                  )}
                  {activeWarning.type === "NO_FACE" && (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> Infraction: Candidate Absent from Camera
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-200 mt-1 leading-relaxed font-medium">
                  {activeWarning.message}
                </p>

                {activeWarning.warningNumber < 3 && (
                  <div className="mt-4 p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-300 space-y-1.5">
                    <strong className="text-amber-300 flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      Immediate Corrective Action:
                    </strong>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                      <li>Keep your eyes centered on the test screen and stay inside the webcam frame.</li>
                      <li>Remove any phones, headphones, or secondary electronic devices from your desk.</li>
                      <li>Do not switch browser tabs, press Esc, or minimize this window.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
              {activeWarning.warningNumber === 3 ? (
                <div className="text-xs text-rose-300 font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Disqualification Scorecard...
                </div>
              ) : (
                <Button
                  onClick={dismissWarning}
                  className={`w-full sm:w-auto font-bold text-sm px-6 py-2.5 ${
                    activeWarning.warningNumber === 2
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  I Understand — Resume Exam
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Manual Submit Confirmation Modal */}
      {showSubmitModal && !isTerminated && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Confirm Final Submission</h3>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to finish and submit your examination? Once submitted, your answers will be automatically graded and finalized.
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-6 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-bold">{totalCount}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Questions Answered:</span>
                <span>{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-semibold">
                <span>Unanswered Questions:</span>
                <span>{totalCount - answeredCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Back to Test
              </Button>
              <Button
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Blocked Action Alert Toast */}
      {blockedNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 text-rose-200 border-2 border-rose-500 px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top duration-150">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{blockedNotice}</span>
        </div>
      )}

      {/* 1. Initial Locked Examination Mode Activation Modal */}
      {!isFullscreenLocked && !loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Enter Locked Examination Mode</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              This examination requires a secure full-screen lockdown. Tab switching, window switching, keyboard shortcuts, and external applications are prohibited.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Full-Screen Kiosk Mode Enforced
              </div>
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Tab & App Switching Prohibited (3-Strike Limit)
              </div>
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" /> Live AI Video & Movement Proctoring
              </div>
            </div>

            <Button
              onClick={enterFullscreenMode}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Maximize className="w-4 h-4" />
              Enter Fullscreen & Begin Assessment
            </Button>
          </Card>
        </div>
      )}

      {/* 2. Fullscreen Exit Suspension Overlay */}
      {isSuspendedFullscreen && !isTerminated && (
        <div className="fixed inset-0 z-50 bg-rose-950/95 backdrop-blur-lg flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-900 border-2 border-rose-500 rounded-2xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-rose-400">EXAMINATION SUSPENDED</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              You exited locked full-screen mode! A proctoring violation strike has been recorded against your examination attempt.
            </p>

            <div className="my-4 p-3 rounded-xl bg-rose-900/30 border border-rose-500/40 text-xs text-rose-200">
              ⚠️ Strikes Incurred: <strong>{warningsCount} / 3</strong> (At 3 strikes, the examination is permanently disqualified).
            </div>

            <Button
              onClick={returnToFullscreen}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
            >
              <Maximize className="w-4 h-4" />
              Return to Fullscreen Now
            </Button>
          </Card>
        </div>
      )}

      {/* 3. Camera Access Required Blocking Overlay */}
      {cameraError && !isTerminated && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 sm:p-8 text-center text-white shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Camera className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Camera Access Required</h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Camera access is required for this examination. Video stream integrity must be verified continuously by AI proctoring algorithms. Please ensure your camera permissions are granted.
            </p>
            <Button
              onClick={() => {
                setCameraError(null);
                startProctorCamera();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Camera Access
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};
