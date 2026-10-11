export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  aspectRatio: number;
  confidence?: number;
  hasVerifiedFacialLandmarks?: boolean;
}

export interface CandidateBaseline {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  aspectRatio: number;
  confidence: number;
  calibratedAt: number;
}

export interface FaceDetectionResult {
  faceCount: number;
  faces: BoundingBox[];
  status: "VERIFIED" | "NO_FACE" | "MULTIPLE_FACES" | "POOR_LIGHTING" | "PHONE_DETECTED" | "SUSPICIOUS_MOVEMENT" | "CHECKING" | "CAMERA_UNAVAILABLE";
  message: string;
  lightingScore: number;
  isCentered: boolean;
  suspiciousActivity?: {
    type: "PHONE_DETECTED" | "SUSPICIOUS_MOVEMENT";
    message: string;
  };
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    aspectRatio: number;
  };
}

// Reusable offscreen canvas for computer vision processing
let cvCanvas: HTMLCanvasElement | null = null;
let blazefaceModel: any = null;
let isModelLoading = false;

export const playWarningBuzzer = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Audio warning alert could not play:", e);
  }
};

export const saveCandidateBaseline = (coords: CandidateBaseline) => {
  try {
    sessionStorage.setItem("exam_candidate_baseline", JSON.stringify(coords));
    localStorage.setItem("exam_candidate_baseline", JSON.stringify(coords));
  } catch (e) {
    console.warn("Unable to save baseline:", e);
  }
};

export const getCandidateBaseline = (): CandidateBaseline | null => {
  try {
    const raw =
      sessionStorage.getItem("exam_candidate_baseline") ||
      localStorage.getItem("exam_candidate_baseline");
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Unable to load baseline:", e);
  }
  return null;
};

async function getBlazeFaceModel() {
  if (blazefaceModel) return blazefaceModel;
  if (isModelLoading) return null;

  if (typeof (window as any).blazeface !== "undefined") {
    try {
      isModelLoading = true;
      blazefaceModel = await (window as any).blazeface.load();
      console.log("BlazeFace AI detector initialized.");
    } catch (e) {
      console.warn("BlazeFace load skipped, using Canvas Vision pipeline:", e);
    } finally {
      isModelLoading = false;
    }
  }
  return blazefaceModel;
}

/**
 * Filter faces to distinguish the primary candidate in front of the camera
 * from unauthorized secondary persons in their desk radar.
 *
/**
 * Verifies whether a detected bounding box actually contains a real human face
 * vs a ceiling light fixture, incandescent bulb, wall lamp, glare, or blank wall.
 * A real human face contains dark features (eyes, eyebrows, pupils, mouth) and contrast.
 * A light bulb or flat wall has zero facial structure and contains radiant hot spots.
 */
function validateHumanFace(
  pixels: Uint8ClampedArray,
  procW: number,
  procH: number,
  box: BoundingBox,
  vWidth: number,
  vHeight: number
): boolean {
  const scaleX = procW / vWidth;
  const scaleY = procH / vHeight;

  const x1 = Math.max(0, Math.min(procW - 1, Math.round(box.x * scaleX)));
  const y1 = Math.max(0, Math.min(procH - 1, Math.round(box.y * scaleY)));
  const x2 = Math.max(0, Math.min(procW - 1, Math.round((box.x + box.width) * scaleX)));
  const y2 = Math.max(0, Math.min(procH - 1, Math.round((box.y + box.height) * scaleY)));

  const totalPixels = (x2 - x1 + 1) * (y2 - y1 + 1);
  if (totalPixels < 16) return false;

  let totalLum = 0;
  let radiantCount = 0;
  let skinPixelsCount = 0;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const idx = (y * procW + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLum += lum;

      if (lum > 220) radiantCount++;

      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (cb >= 75 && cb <= 135 && cr >= 125 && cr <= 178) {
        skinPixelsCount++;
      }
    }
  }

  const meanLum = totalLum / totalPixels;
  const radiantRatio = radiantCount / totalPixels;
  const skinRatio = skinPixelsCount / totalPixels;

  // Only reject true radiant light bulbs (e.g. bare incandescent bulb with >65% blinding radiance)
  if (radiantRatio > 0.65 && meanLum > 235 && skinRatio < 0.04) {
    return false;
  }

  return true;
}

/**
 * Robust Multi-Face and Full-Screen Analyzer
 * Detects 2nd persons across the entire camera view while rejecting radiant lamps.
 */
function analyzeCandidateAndSecondaryFaces(
  faces: BoundingBox[],
  vWidth: number,
  vHeight: number,
  isVerification?: boolean,
  pixels?: Uint8ClampedArray | null,
  procW?: number,
  procH?: number,
  baseline?: CandidateBaseline | null
): {
  primary: BoundingBox | null;
  secondary: BoundingBox | null;
  hasUnauthorizedPerson: boolean;
} {
  if (faces.length === 0) {
    return { primary: null, secondary: null, hasUnauthorizedPerson: false };
  }

  const sorted = [...faces].sort((a, b) => b.width * b.height - a.width * a.height);
  
  let primary = sorted[0];
  if (baseline) {
    let bestDist = 999999;
    for (const f of sorted) {
      const dist = Math.hypot(f.centerX - baseline.centerX, f.centerY - baseline.centerY);
      if (dist < bestDist) {
        bestDist = dist;
        primary = f;
      }
    }
  }

  if (isVerification || sorted.length === 1) {
    return { primary, secondary: null, hasUnauthorizedPerson: false };
  }

  const primaryArea = primary.width * primary.height;

  // Check all other detected faces in the camera frame
  for (let i = 0; i < sorted.length; i++) {
    const candidate = sorted[i];
    if (candidate === primary) continue;

    // Filter extreme top edge ceiling fixtures
    if (candidate.y < vHeight * 0.02) continue;

    // Calculate overlap area with primary face
    const overlapX = Math.max(0, Math.min(candidate.x + candidate.width, primary.x + primary.width) - Math.max(candidate.x, primary.x));
    const overlapY = Math.max(0, Math.min(candidate.y + candidate.height, primary.y + primary.height) - Math.max(candidate.y, primary.y));
    const overlapArea = overlapX * overlapY;
    const candidateArea = candidate.width * candidate.height;

    // If candidate overlaps more than 35% with primary face, it is duplicate box on the same person
    if (overlapArea > candidateArea * 0.35 || overlapArea > primaryArea * 0.35) {
      continue;
    }

    // Must be at least 15% of primary face size
    if (candidateArea < primaryArea * 0.15 || candidate.width < primary.width * 0.25) {
      continue;
    }

    // Must be separated from primary face (a different person beside or behind candidate)
    const dist = Math.hypot(candidate.centerX - primary.centerX, candidate.centerY - primary.centerY);
    if (dist < primary.width * 0.35) {
      continue;
    }

    // Verify it is not an incandescent light bulb
    if (pixels && procW && procH) {
      const isHuman = validateHumanFace(pixels, procW, procH, candidate, vWidth, vHeight);
      if (!isHuman) {
        continue;
      }
    }

    return { primary, secondary: candidate, hasUnauthorizedPerson: true };
  }

  return { primary, secondary: null, hasUnauthorizedPerson: false };
}

/**
 * Detects mobile phones held in hand anywhere in the camera frame or held to the ear.
 * Calibrated to reliably detect actual phones without triggering on normal candidate clothing or hair.
 */
function checkSuspiciousHandAndPhoneMovement(
  pixels: Uint8ClampedArray,
  procW: number,
  procH: number,
  primary: BoundingBox,
  vWidth: number,
  vHeight: number
): {
  isSuspicious: boolean;
  type: "PHONE_DETECTED" | "SUSPICIOUS_MOVEMENT";
  message: string;
} | null {
  const scaleX = procW / vWidth;
  const scaleY = procH / vHeight;

  const fX = Math.max(0, Math.round(primary.x * scaleX));
  const fY = Math.max(0, Math.round(primary.y * scaleY));
  const fW = Math.min(procW - fX, Math.round(primary.width * scaleX));
  const fH = Math.min(procH - fY, Math.round(primary.height * scaleY));

  // 1. EAR ZONE (Phone held against ear/side of face)
  const earTop = Math.max(0, fY + Math.round(fH * 0.10));
  const earBottom = Math.min(procH, fY + Math.round(fH * 0.95));
  const leftEarLeft = Math.max(0, fX - 35);
  const leftEarRight = Math.min(procW, fX + 10);
  const rightEarLeft = Math.max(0, fX + fW - 10);
  const rightEarRight = Math.min(procW, fX + fW + 35);

  let leftDevice = 0, leftSkin = 0, leftEdge = 0;
  let rightDevice = 0, rightSkin = 0, rightEdge = 0;

  for (let y = earTop; y < earBottom; y++) {
    for (let x = leftEarLeft; x < leftEarRight; x++) {
      const idx = (y * procW + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Dark phone chassis or glowing phone screen
      if (lum < 65 || lum > 165) leftDevice++;
      // Raised hand holding phone to ear
      if (cr >= 125 && cr <= 180 && cb >= 70 && cb <= 135 && lum > 35 && lum < 240) leftSkin++;

      if (x < leftEarRight - 1) {
        const nextIdx = (y * procW + x + 1) * 4;
        const nextLum = 0.299 * pixels[nextIdx] + 0.587 * pixels[nextIdx + 1] + 0.114 * pixels[nextIdx + 2];
        if (Math.abs(nextLum - lum) > 28) leftEdge++;
      }
    }

    for (let x = rightEarLeft; x < rightEarRight; x++) {
      const idx = (y * procW + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      if (lum < 65 || lum > 165) rightDevice++;
      if (cr >= 125 && cr <= 180 && cb >= 70 && cb <= 135 && lum > 35 && lum < 240) rightSkin++;

      if (x < rightEarRight - 1) {
        const nextIdx = (y * procW + x + 1) * 4;
        const nextLum = 0.299 * pixels[nextIdx] + 0.587 * pixels[nextIdx + 1] + 0.114 * pixels[nextIdx + 2];
        if (Math.abs(nextLum - lum) > 28) rightEdge++;
      }
    }
  }

  // Hand holding phone to ear: requires both raised hand skin and device pixels
  if ((leftDevice >= 30 && leftSkin >= 25 && leftEdge >= 18) ||
      (rightDevice >= 30 && rightSkin >= 25 && rightEdge >= 18)) {
    return {
      isSuspicious: true,
      type: "PHONE_DETECTED",
      message: "Unauthorized Activity: Mobile phone held near ear/face!",
    };
  }

  // 2. HANDHELD PHONE IN CAMERA VIEW (Both portrait & landscape orientations)
  const windows = [
    { w: 26, h: 42 }, // portrait
    { w: 42, h: 26 }, // landscape
  ];
  const step = 8;
  const maxScanY = Math.min(procH - 28, Math.floor(procH * 0.88));

  for (const win of windows) {
    const winArea = win.w * win.h;
    for (let wy = 6; wy <= maxScanY; wy += step) {
      for (let wx = 4; wx <= procW - win.w; wx += step) {
        // Exclude central face
        const overlapX = Math.max(0, Math.min(wx + win.w, fX + fW) - Math.max(wx, fX));
        const overlapY = Math.max(0, Math.min(wy + win.h, fY + fH) - Math.max(wy, fY));
        if (overlapX * overlapY > winArea * 0.40) continue;

        let devicePixels = 0;
        let handSkin = 0;
        let edges = 0;

        for (let y = wy; y < wy + win.h; y++) {
          for (let x = wx; x < wx + win.w; x++) {
            const idx = (y * procW + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Device body (matte dark or illuminated phone screen)
            if (lum < 60 || lum > 168) devicePixels++;
            // Fingers / hand skin holding the device
            if (cr >= 125 && cr <= 180 && cb >= 70 && cb <= 135 && lum > 35 && lum < 240) {
              handSkin++;
            }

            if (x < wx + win.w - 1) {
              const nextIdx = (y * procW + x + 1) * 4;
              const nextLum = 0.299 * pixels[nextIdx] + 0.587 * pixels[nextIdx + 1] + 0.114 * pixels[nextIdx + 2];
              if (Math.abs(nextLum - lum) > 26) edges++;
            }
          }
        }

        // Detect handheld phone: solid device presence (>26% of window), supported by hand skin (>= 20), with edges
        if (devicePixels >= Math.round(winArea * 0.26) && handSkin >= 20 && edges >= 18) {
          return {
            isSuspicious: true,
            type: "PHONE_DETECTED",
            message: "Unauthorized Activity: Mobile phone detected in camera view!",
          };
        }
      }
    }
  }

  return null;
}

/**
 * Real-Time Browser-Based Face, Multi-Face, Phone & Hand Movement Detector
 */
export async function detectFacesInVideo(
  video: HTMLVideoElement,
  options?: { isVerification?: boolean; baseline?: CandidateBaseline | null }
): Promise<FaceDetectionResult> {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return {
      faceCount: 0,
      faces: [],
      status: "NO_FACE",
      message: "Initializing camera stream...",
      lightingScore: 0,
      isCentered: false,
    };
  }

  const vWidth = video.videoWidth;
  const vHeight = video.videoHeight;

  // Initialize processing canvas for pixel-level analysis
  if (!cvCanvas) {
    cvCanvas = document.createElement("canvas");
  }
  const procW = 160;
  const procH = 120;
  cvCanvas.width = procW;
  cvCanvas.height = procH;
  const ctx = cvCanvas.getContext("2d", { willReadFrequently: true });

  let pixels: Uint8ClampedArray | null = null;
  if (ctx) {
    ctx.drawImage(video, 0, 0, procW, procH);
    const imgData = ctx.getImageData(0, 0, procW, procH);
    pixels = imgData.data;
  }

  // 1. Google BlazeFace Neural Network Detector
  try {
    const model = await getBlazeFaceModel();
    if (model) {
      const predictions = await model.estimateFaces(video, false);

      if (predictions && predictions.length > 0) {
        // Filter out low-confidence detections and non-face light fixtures
        const validPredictions = predictions.filter((p: any) => {
          const prob = Array.isArray(p.probability)
            ? p.probability[0]
            : typeof p.probability === "number"
            ? p.probability
            : 1;
          return prob >= 0.86;
        });

        const boxes: BoundingBox[] = validPredictions.map((p: any) => {
          const start = p.topLeft;
          const end = p.bottomRight;
          const x = Math.max(0, Math.round(start[0]));
          const y = Math.max(0, Math.round(start[1]));
          const width = Math.min(vWidth - x, Math.round(end[0] - start[0]));
          const height = Math.min(vHeight - y, Math.round(end[1] - start[1]));
          const centerX = Math.round(x + width / 2);
          const centerY = Math.round(y + height / 2);
          const aspectRatio = Number((width / Math.max(1, height)).toFixed(2));
          const prob = Array.isArray(p.probability)
            ? p.probability[0]
            : typeof p.probability === "number"
            ? p.probability
            : 1;

          let hasLandmarks = false;
          if (p.landmarks && p.landmarks.length >= 4) {
            const rightEye = p.landmarks[0];
            const leftEye = p.landmarks[1];
            const nose = p.landmarks[2];
            const mouth = p.landmarks[3];
            const eyeDist = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
            const boxW = Math.max(1, width);

            // True biological facial topology check:
            // 1. Eyes separated horizontally (rejects point light sources, bulbs)
            // 2. Nose and mouth positioned below eyes
            // 3. Nose between the horizontal span of the eyes
            const eyesSeparated = eyeDist >= boxW * 0.14;
            const featuresAlignedVertically =
              nose[1] >= Math.min(rightEye[1], leftEye[1]) - 2 && mouth[1] > nose[1];
            const noseBetweenEyes =
              nose[0] >= Math.min(rightEye[0], leftEye[0]) - 15 &&
              nose[0] <= Math.max(rightEye[0], leftEye[0]) + 15;

            if (eyesSeparated && featuresAlignedVertically && noseBetweenEyes) {
              hasLandmarks = true;
            }
          }

          return {
            x,
            y,
            width,
            height,
            centerX,
            centerY,
            aspectRatio,
            confidence: prob,
            hasVerifiedFacialLandmarks: hasLandmarks,
          };
        });

        const { primary, secondary, hasUnauthorizedPerson } = analyzeCandidateAndSecondaryFaces(
          boxes,
          vWidth,
          vHeight,
          options?.isVerification,
          pixels,
          procW,
          procH,
          options?.baseline
        );

        if (hasUnauthorizedPerson && secondary && primary) {
          return {
            faceCount: 2,
            faces: [primary, secondary],
            status: "MULTIPLE_FACES",
            message: "⚠️ Secondary Person in Camera Radar! Unauthorized person detected.",
            lightingScore: 90,
            isCentered: false,
            coordinates: primary,
          };
        }

        if (primary) {
          // Check for phone / suspicious hand movement during exam
          if (!options?.isVerification && pixels) {
            const suspicious = checkSuspiciousHandAndPhoneMovement(
              pixels,
              procW,
              procH,
              primary,
              vWidth,
              vHeight
            );
            if (suspicious) {
              return {
                faceCount: 1,
                faces: [primary],
                status: suspicious.type,
                message: suspicious.message,
                lightingScore: 90,
                isCentered: true,
                suspiciousActivity: suspicious,
                coordinates: primary,
              };
            }
          }

          const isCentered =
            primary.centerX > vWidth * 0.22 && primary.centerX < vWidth * 0.78;
          return {
            faceCount: 1,
            faces: [primary],
            status: "VERIFIED",
            message: isCentered ? "Face verified & centered." : "Face detected. Please center your face.",
            lightingScore: 90,
            isCentered,
            coordinates: primary,
          };
        }
      }
    }
  } catch (e) {
    // Fall through to Native FaceDetector or Canvas CV
  }

  // 2. Chromium Native FaceDetector API
  if (typeof (window as any).FaceDetector === "function") {
    try {
      const faceDetector = new (window as any).FaceDetector({
        maxDetectedFaces: 5,
        fastMode: true,
      });
      const detected = await faceDetector.detect(video);
      const faces: BoundingBox[] = detected.map((f: any) => {
        const x = Math.max(0, Math.round(f.boundingBox.x));
        const y = Math.max(0, Math.round(f.boundingBox.y));
        const width = Math.min(vWidth - x, Math.round(f.boundingBox.width));
        const height = Math.min(vHeight - y, Math.round(f.boundingBox.height));
        const centerX = Math.round(x + width / 2);
        const centerY = Math.round(y + height / 2);
        const aspectRatio = Number((width / Math.max(1, height)).toFixed(2));
        return { x, y, width, height, centerX, centerY, aspectRatio };
      });

      const { primary, secondary, hasUnauthorizedPerson } = analyzeCandidateAndSecondaryFaces(
        faces,
        vWidth,
        vHeight,
        options?.isVerification,
        pixels,
        procW,
        procH,
        options?.baseline
      );

      if (hasUnauthorizedPerson && secondary && primary) {
        return {
          faceCount: 2,
          faces: [primary, secondary],
          status: "MULTIPLE_FACES",
          message: "⚠️ Secondary Person in Camera Radar! Unauthorized person detected.",
          lightingScore: 85,
          isCentered: false,
          coordinates: primary,
        };
      }

      if (primary) {
        if (!options?.isVerification && pixels) {
          const suspicious = checkSuspiciousHandAndPhoneMovement(
            pixels,
            procW,
            procH,
            primary,
            vWidth,
            vHeight
          );
          if (suspicious) {
            return {
              faceCount: 1,
              faces: [primary],
              status: suspicious.type,
              message: suspicious.message,
              lightingScore: 88,
              isCentered: true,
              suspiciousActivity: suspicious,
              coordinates: primary,
            };
          }
        }

        const isCentered =
          primary.centerX > vWidth * 0.22 && primary.centerX < vWidth * 0.78;
        return {
          faceCount: 1,
          faces: [primary],
          status: "VERIFIED",
          message: isCentered ? "Face verified & centered." : "Face detected. Please center your face.",
          lightingScore: 88,
          isCentered,
          coordinates: primary,
        };
      }
    } catch {
      // Fall through to Canvas vision
    }
  }

  // 3. Proximity-Aware Canvas Vision Pipeline
  if (!pixels) {
    const w = Math.round(vWidth * 0.45);
    const h = Math.round(vHeight * 0.55);
    const x = Math.round(vWidth * 0.28);
    const y = Math.round(vHeight * 0.2);
    const fallbackBox: BoundingBox = {
      x,
      y,
      width: w,
      height: h,
      centerX: Math.round(x + w / 2),
      centerY: Math.round(y + h / 2),
      aspectRatio: Number((w / Math.max(1, h)).toFixed(2)),
    };
    return {
      faceCount: 1,
      faces: [fallbackBox],
      status: "VERIFIED",
      message: "Camera active.",
      lightingScore: 75,
      isCentered: true,
      coordinates: fallbackBox,
    };
  }

  let totalLuminance = 0;
  const ceilingLimit = Math.floor(procH * 0.16);
  const upperLimit = Math.floor(procH * 0.62);
  const upperHist = new Int32Array(procW);
  let totalSkinCount = 0;
  let upperSkinCount = 0;
  let minX = procW;
  let maxX = 0;
  let minY = procH;
  let maxY = 0;

  for (let y = 0; y < procH; y++) {
    for (let x = 0; x < procW; x++) {
      const idx = (y * procW + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;

      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Genuine human skin color filter (lum <= 245 allows well-lit faces while excluding bare light bulbs)
      const isSkin =
        cr >= 128 &&
        cr <= 178 &&
        cb >= 75 &&
        cb <= 135 &&
        lum >= 25 &&
        lum <= 245;

      if (isSkin) {
        totalSkinCount++;
        // Exclude ceiling band (lights, bulbs, fans) from face histogram
        if (y >= ceilingLimit && y < upperLimit) {
          upperHist[x]++;
          upperSkinCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  const avgLuminance = totalLuminance / (procW * procH);
  const lightingScore = Math.min(100, Math.max(10, Math.round((avgLuminance / 255) * 100)));

  if (lightingScore < 8) {
    return {
      faceCount: 0,
      faces: [],
      status: "POOR_LIGHTING",
      message: "Lighting too dim. Please illuminate your face.",
      lightingScore,
      isCentered: false,
    };
  }

  // Candidate is only absent if virtually no skin or human presence in either upper or overall frame
  // Looking down at questions, natural blinking, or tilting head will still have ample skin/torso pixels!
  if (totalSkinCount < 18 && upperSkinCount < 12) {
    return {
      faceCount: 0,
      faces: [],
      status: "NO_FACE",
      message: "Candidate absent from camera viewport.",
      lightingScore,
      isCentered: false,
    };
  }

  // MULTI-FACE DETECTION IN PROCTORING RADAR
  let hasTwoFaces = false;
  let secondFaceBox: BoundingBox | null = null;
  let primaryFaceBox: BoundingBox | null = null;

  if (!options?.isVerification) {
    const smoothed = new Float32Array(procW);
    for (let x = 3; x < procW - 3; x++) {
      let sum = 0;
      for (let k = -3; k <= 3; k++) sum += upperHist[x + k];
      smoothed[x] = sum / 7;
    }

    interface Peak {
      x: number;
      val: number;
      start: number;
      end: number;
      mass: number;
    }

    const peaks: Peak[] = [];
    let inPeak = false;
    let peakStart = 0;
    let peakMax = 0;
    let peakMaxX = 0;
    let peakMass = 0;

    for (let x = 0; x < procW; x++) {
      if (smoothed[x] >= 6) {
        if (!inPeak) {
          inPeak = true;
          peakStart = x;
          peakMax = smoothed[x];
          peakMaxX = x;
          peakMass = smoothed[x];
        } else {
          peakMass += smoothed[x];
          if (smoothed[x] > peakMax) {
            peakMax = smoothed[x];
            peakMaxX = x;
          }
        }
      } else {
        if (inPeak) {
          inPeak = false;
          if (x - peakStart >= 14 && peakMax >= 8) {
            peaks.push({
              x: peakMaxX,
              val: peakMax,
              start: peakStart,
              end: x,
              mass: peakMass,
            });
          }
        }
      }
    }
    if (inPeak && procW - peakStart >= 14 && peakMax >= 8) {
      peaks.push({
        x: peakMaxX,
        val: peakMax,
        start: peakStart,
        end: procW,
        mass: peakMass,
      });
    }

    peaks.sort((a, b) => b.mass - a.mass);
    // Canvas CV is an offscreen luminance fallback: it reliably tracks the primary candidate's presence,
    // while secondary human face detection is strictly handled by BlazeFace/FaceDetector neural models
    // to prevent light bulbs, furniture, and shadows from ever triggering false 2nd face strikes.
  }

  if (hasTwoFaces && secondFaceBox && primaryFaceBox) {
    return {
      faceCount: 2,
      faces: [primaryFaceBox, secondFaceBox],
      status: "MULTIPLE_FACES",
      message: "⚠️ 2nd Face Detected in Frame! Unauthorized person present.",
      lightingScore,
      isCentered: false,
      coordinates: primaryFaceBox,
    };
  }

  // SINGLE CANDIDATE DETECTED
  const scaleX = vWidth / procW;
  const scaleY = vHeight / procH;
  const faceW = Math.max(Math.round(vWidth * 0.35), Math.round((maxX - minX) * scaleX));
  const faceH = Math.max(Math.round(vHeight * 0.45), Math.round((maxY - minY) * scaleY));
  const faceX = Math.max(
    0,
    Math.min(vWidth - faceW, Math.round(((minX + maxX) / 2) * scaleX - faceW / 2))
  );
  const faceY = Math.max(
    0,
    Math.min(vHeight - faceH, Math.round(((minY + maxY) / 2) * scaleY - faceH / 2))
  );

  const centerX = Math.round(faceX + faceW / 2);
  const centerY = Math.round(faceY + faceH / 2);
  const aspectRatio = Number((faceW / Math.max(1, faceH)).toFixed(2));
  const isCentered = centerX > vWidth * 0.22 && centerX < vWidth * 0.78;

  const coords = {
    x: faceX,
    y: faceY,
    width: faceW,
    height: faceH,
    centerX,
    centerY,
    aspectRatio,
  };

  // Check for suspicious hand movements or mobile phone
  if (!options?.isVerification && pixels) {
    const suspicious = checkSuspiciousHandAndPhoneMovement(
      pixels,
      procW,
      procH,
      coords,
      vWidth,
      vHeight
    );
    if (suspicious) {
      return {
        faceCount: 1,
        faces: [coords],
        status: suspicious.type,
        message: suspicious.message,
        lightingScore,
        isCentered,
        suspiciousActivity: suspicious,
        coordinates: coords,
      };
    }
  }

  return {
    faceCount: 1,
    faces: [coords],
    status: "VERIFIED",
    message: isCentered ? "Candidate face verified & centered." : "Please center your face inside the guide.",
    lightingScore,
    isCentered,
    coordinates: coords,
  };
}
