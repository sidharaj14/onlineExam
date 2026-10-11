import os
import cv2
import numpy as np
import logging
from typing import List, Tuple, Dict, Any, Optional

from app.proctoring.config import FACE_SCALE_FACTOR, FACE_MIN_NEIGHBORS

logger = logging.getLogger("proctoring.face_detector")

class OpenCVFaceDetector:
    """
    OpenCV High-Accuracy Face Detection Engine
    Uses an ensemble of OpenCV Haar Cascade classifiers (Alt2, Default, Profile)
    with adaptive CLAHE illumination preprocessing for robust face presence monitoring,
    head posture tolerance, and multi-face verification.
    """

    def __init__(self):
        cascade_dir = cv2.data.haarcascades
        alt2_path = os.path.join(cascade_dir, "haarcascade_frontalface_alt2.xml")
        frontal_path = os.path.join(cascade_dir, "haarcascade_frontalface_default.xml")
        profile_path = os.path.join(cascade_dir, "haarcascade_profileface.xml")

        # Primary: alt2 (decision-tree boosted, highly robust to tilted heads & glasses)
        self.alt2_cascade = cv2.CascadeClassifier(alt2_path) if os.path.exists(alt2_path) else None
        # Secondary: default frontal
        self.frontal_cascade = cv2.CascadeClassifier(frontal_path) if os.path.exists(frontal_path) else None
        # Profile: profile face for tilted/turned head
        self.profile_cascade = cv2.CascadeClassifier(profile_path) if os.path.exists(profile_path) else None

        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        logger.info(
            "[FACE DETECTOR INIT] Initialized OpenCV Face Detector (alt2=%s, default=%s, profile=%s)",
            self.alt2_cascade is not None,
            self.frontal_cascade is not None,
            self.profile_cascade is not None,
        )

    def detect_faces(self, img: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect face bounding boxes (x, y, w, h).
        Maintains backward compatibility returning a list of tuples.
        """
        boxes, _, _ = self.detect_faces_detailed(img)
        return boxes

    def detect_faces_detailed(
        self, img: np.ndarray
    ) -> Tuple[List[Tuple[int, int, int, int]], float, str]:
        """
        Detect face bounding boxes with confidence score and method description.
        Returns: (detected_boxes, best_confidence, detector_method)
        """
        if img is None or img.size == 0:
            return [], 0.0, "empty_frame"

        # Ensure grayscale format
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img

        detected_boxes: List[Tuple[int, int, int, int]] = []
        confidences: List[float] = []
        method = "none"

        # Pass 1: Primary Frontal Cascade (Alt2 on raw gray)
        if self.alt2_cascade is not None:
            boxes, weights = self._detect_cascade(self.alt2_cascade, gray, min_neighbors=FACE_MIN_NEIGHBORS)
            if len(boxes) > 0:
                detected_boxes.extend(boxes)
                confidences.extend(weights)
                method = "alt2_raw"

        # Pass 2: Alt2 on CLAHE adaptive contrast (resolves backlight and dim indoor lighting)
        if len(detected_boxes) == 0 and self.alt2_cascade is not None:
            clahe_gray = self.clahe.apply(gray)
            boxes, weights = self._detect_cascade(self.alt2_cascade, clahe_gray, min_neighbors=FACE_MIN_NEIGHBORS)
            if len(boxes) > 0:
                detected_boxes.extend(boxes)
                confidences.extend(weights)
                method = "alt2_clahe"

        # Pass 3: Default Frontal Cascade on raw gray (secondary fallback)
        if len(detected_boxes) == 0 and self.frontal_cascade is not None:
            boxes, weights = self._detect_cascade(self.frontal_cascade, gray, min_neighbors=FACE_MIN_NEIGHBORS)
            if len(boxes) > 0:
                detected_boxes.extend(boxes)
                confidences.extend(weights)
                method = "default_raw"

        # Pass 4: Profile Face Cascade (detects turned head, preventing false 'absent' strikes)
        if len(detected_boxes) == 0 and self.profile_cascade is not None:
            boxes, weights = self._detect_cascade(self.profile_cascade, gray, min_neighbors=3)
            if len(boxes) > 0:
                detected_boxes.extend(boxes)
                confidences.extend(weights)
                method = "profile_raw"

        # Perform Non-Maximum Suppression to deduplicate overlapping detections
        final_boxes = self._suppress_overlapping_boxes(detected_boxes)
        best_confidence = max(confidences) if confidences else 0.0

        return final_boxes, best_confidence, method

    def _detect_cascade(
        self, cascade: cv2.CascadeClassifier, gray: np.ndarray, min_neighbors: int = 4
    ) -> Tuple[List[Tuple[int, int, int, int]], List[float]]:
        """Run cascade classifier and extract bounding boxes + normalized confidence weights."""
        try:
            res = cascade.detectMultiScale3(
                gray,
                scaleFactor=FACE_SCALE_FACTOR,
                minNeighbors=min_neighbors,
                minSize=(28, 28),
                flags=cv2.CASCADE_SCALE_IMAGE,
                outputRejectLevels=True,
            )
            raw_boxes, _, raw_weights = res
            boxes: List[Tuple[int, int, int, int]] = []
            weights: List[float] = []

            for i, (x, y, w, h) in enumerate(raw_boxes):
                boxes.append((int(x), int(y), int(w), int(h)))
                # Normalize boosting stage weights into [0.5, 0.99] confidence
                raw_w = float(raw_weights[i]) if i < len(raw_weights) else 10.0
                norm_conf = min(0.99, max(0.50, 0.50 + raw_w * 0.01))
                weights.append(norm_conf)

            return boxes, weights
        except Exception:
            # Fallback to standard detectMultiScale if detectMultiScale3 raises on specific platform
            raw_boxes = cascade.detectMultiScale(
                gray,
                scaleFactor=FACE_SCALE_FACTOR,
                minNeighbors=min_neighbors,
                minSize=(28, 28),
            )
            boxes = [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in raw_boxes]
            weights = [0.85] * len(boxes)
            return boxes, weights

    def _suppress_overlapping_boxes(
        self, boxes: List[Tuple[int, int, int, int]], iou_threshold: float = 0.35
    ) -> List[Tuple[int, int, int, int]]:
        """Filter duplicate bounding boxes on the same face."""
        if not boxes:
            return []

        boxes_sorted = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)
        filtered: List[Tuple[int, int, int, int]] = []

        for b in boxes_sorted:
            bx, by, bw, bh = b
            b_area = bw * bh
            overlap = False

            for f in filtered:
                fx, fy, fw, fh = f
                f_area = fw * fh

                ix1 = max(bx, fx)
                iy1 = max(by, fy)
                ix2 = min(bx + bw, fx + fw)
                iy2 = min(by + bh, fy + fh)

                iw = max(0, ix2 - ix1)
                ih = max(0, iy2 - iy1)
                intersection = iw * ih

                if intersection > (b_area * iou_threshold) or intersection > (f_area * iou_threshold):
                    overlap = True
                    break

            if not overlap:
                filtered.append(b)

        return filtered
