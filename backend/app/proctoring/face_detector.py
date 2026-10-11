import os
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any

from app.proctoring.config import FACE_SCALE_FACTOR, FACE_MIN_NEIGHBORS

class OpenCVFaceDetector:
    """
    OpenCV Face Detection Engine
    Uses cv2.CascadeClassifier with OpenCV Haar Cascades to perform real-time
    face presence monitoring and multi-face counting (0, 1, 2+ faces).
    """

    def __init__(self):
        # Load OpenCV Haar Cascade classifiers from cv2.data.haarcascades
        cascade_dir = cv2.data.haarcascades
        frontal_path = os.path.join(cascade_dir, "haarcascade_frontalface_default.xml")
        profile_path = os.path.join(cascade_dir, "haarcascade_profileface.xml")

        self.frontal_cascade = cv2.CascadeClassifier(frontal_path)
        self.profile_cascade = cv2.CascadeClassifier(profile_path) if os.path.exists(profile_path) else None

    def detect_faces(self, gray_img: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect human face bounding boxes (x, y, w, h) in a grayscale OpenCV image.
        Filters overlapping bounding boxes using Non-Maximum Suppression / GroupRectangles.
        """
        if gray_img is None or gray_img.size == 0:
            return []

        # Detect frontal faces
        faces = self.frontal_cascade.detectMultiScale(
            gray_img,
            scaleFactor=FACE_SCALE_FACTOR,
            minNeighbors=FACE_MIN_NEIGHBORS,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        detected_boxes: List[Tuple[int, int, int, int]] = []
        if len(faces) > 0:
            for (x, y, w, h) in faces:
                detected_boxes.append((int(x), int(y), int(w), int(h)))

        # Also check profile cascade if 0 frontal faces detected and profile cascade is loaded
        if len(detected_boxes) == 0 and self.profile_cascade is not None:
            profiles = self.profile_cascade.detectMultiScale(
                gray_img,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30),
            )
            if len(profiles) > 0:
                for (x, y, w, h) in profiles:
                    detected_boxes.append((int(x), int(y), int(w), int(h)))

        # Perform Non-Maximum Suppression / overlap deduplication
        final_boxes = self._suppress_overlapping_boxes(detected_boxes)
        return final_boxes

    def _suppress_overlapping_boxes(self, boxes: List[Tuple[int, int, int, int]], iou_threshold: float = 0.35) -> List[Tuple[int, int, int, int]]:
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

                # Intersection box
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
