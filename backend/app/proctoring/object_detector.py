import os
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional

from app.proctoring.config import PHONE_CONFIDENCE_THRESHOLD
from app.proctoring.models.model_manager import ModelManager

# Development / Debug logging flag
PROCTORING_DEBUG: bool = True

class OpenCVObjectDetector:
    """
    OpenCV DNN Object & Mobile Phone Detector
    Uses OpenCV cv2.dnn with YOLOv4-tiny COCO network and spatial context validation
    to reliably recognize real smartphones in webcam frames without false positives from hands.
    """

    def __init__(self):
        self.net, self.out_layers, self.classes = ModelManager.get_net()

    def detect_objects(self, bgr_img: np.ndarray, face_boxes: List[Tuple[int, int, int, int]]) -> List[Dict[str, Any]]:
        """
        Detect handheld mobile devices using OpenCV cv2.dnn object detection and spatial context analysis.
        Returns list of detected object dicts: [{ 'label': 'PHONE_DETECTED', 'confidence': 0.88, 'box': (x, y, w, h) }]
        """
        if bgr_img is None or bgr_img.size == 0:
            return []

        if self.net is None or not self.out_layers:
            self.net, self.out_layers, self.classes = ModelManager.get_net()

        results: List[Dict[str, Any]] = []
        h, w = bgr_img.shape[:2]
        frame_area = float(h * w)

        raw_detected_objects = []
        candidate_boxes = []
        confidences = []
        class_ids = []

        # 1. OpenCV DNN Object Detection path using YOLOv4-tiny COCO network
        if self.net is not None and self.out_layers:
            try:
                # Construct blob for YOLOv4-tiny (416x416 input resolution, 1/255 scale)
                blob = cv2.dnn.blobFromImage(bgr_img, 1.0 / 255.0, (416, 416), swapRB=True, crop=False)
                self.net.setInput(blob)
                layer_outputs = self.net.forward(self.out_layers)

                for output in layer_outputs:
                    for detection in output:
                        scores = detection[5:]
                        class_id = int(np.argmax(scores))
                        confidence = float(scores[class_id])

                        class_label = self.classes[class_id].lower() if class_id < len(self.classes) else str(class_id)

                        # Filter for cell phone class (COCO index 67 or label "cell phone")
                        is_phone_class = (class_id == 67) or (class_label in ["cell phone", "phone", "mobile phone", "telephone"])

                        if confidence >= PHONE_CONFIDENCE_THRESHOLD and (is_phone_class or class_label in ["laptop", "remote", "book"]):
                            raw_detected_objects.append((class_label, round(confidence, 2)))

                        # Strictly map to PHONE_DETECTED only when object is a cell phone and confidence >= threshold
                        if confidence >= PHONE_CONFIDENCE_THRESHOLD and is_phone_class:
                            center_x = int(detection[0] * w)
                            center_y = int(detection[1] * h)
                            bw = int(detection[2] * w)
                            bh = int(detection[3] * h)

                            startX = max(0, int(center_x - bw / 2))
                            startY = max(0, int(center_y - bh / 2))
                            bw = min(w - startX, bw)
                            bh = min(h - startY, bh)

                            if bw > 5 and bh > 5:
                                obj_area = float(bw * bh)
                                aspect_ratio = float(bw) / max(1, bh)

                                # Spatial Context Validation:
                                # 1. Smartphone aspect ratio check (portrait or landscape: 0.30 <= AR <= 3.2)
                                # 2. Size check (compact object: 0.5% <= area <= 35% of frame area)
                                # 3. Face exclusion check (must not cover >45% of candidate's face)
                                if (0.30 <= aspect_ratio <= 3.2) and (0.005 * frame_area <= obj_area <= 0.35 * frame_area):
                                    face_overlap = False
                                    for (fx, fy, fw, fh) in face_boxes:
                                        face_area = float(fw * fh)
                                        ix1 = max(startX, fx)
                                        iy1 = max(startY, fy)
                                        ix2 = min(startX + bw, fx + fw)
                                        iy2 = min(startY + bh, fy + fh)
                                        inter_w = max(0, ix2 - ix1)
                                        inter_h = max(0, iy2 - iy1)
                                        inter_area = inter_w * inter_h
                                        if inter_area > (face_area * 0.45):
                                            face_overlap = True
                                            break

                                    if not face_overlap:
                                        candidate_boxes.append([startX, startY, bw, bh])
                                        confidences.append(confidence)
                                        class_ids.append(class_id)

                # Non-Maximum Suppression (NMS) to deduplicate candidate phone boxes
                if candidate_boxes:
                    indices = cv2.dnn.NMSBoxes(candidate_boxes, confidences, PHONE_CONFIDENCE_THRESHOLD, 0.4)
                    if len(indices) > 0:
                        for idx_arr in indices:
                            i = idx_arr[0] if isinstance(idx_arr, (list, tuple, np.ndarray)) else idx_arr
                            box = candidate_boxes[i]
                            conf = confidences[i]
                            results.append({
                                "label": "PHONE_DETECTED",
                                "confidence": round(conf, 2),
                                "box": (int(box[0]), int(box[1]), int(box[2]), int(box[3])),
                            })

                # Diagnostic logging in development mode
                if PROCTORING_DEBUG and (raw_detected_objects or results):
                    print(f"[OPENCV PROCTORING DEBUG] Frame: {w}x{h} | Model: YOLOv4-tiny | Raw Detections: {raw_detected_objects} | Confirmed Phones: {len(results)}")

            except Exception as e:
                print(f"[OPENCV DNN DETECT ERROR] {e}")

        # 2. Handheld Device ROI Computer Vision Processor Fallback
        if len(results) == 0:
            roi_detection = self._detect_handheld_device_roi(bgr_img, face_boxes)
            if roi_detection:
                results.append(roi_detection)

        return results

    def _detect_handheld_device_roi(self, bgr_img: np.ndarray, face_boxes: List[Tuple[int, int, int, int]]) -> Optional[Dict[str, Any]]:
        """
        OpenCV Computer Vision Handheld Device ROI Processor:
        Uses HSV color space, Canny edge detection, contour extraction (cv2.findContours),
        bounding rectangle aspect ratio checks, and hand skin proximity to identify handheld devices.
        """
        try:
            h, w = bgr_img.shape[:2]
            gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)

            # Canny edge detection
            edges = cv2.Canny(blur, 40, 140)

            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if (h * w * 0.005) <= area <= (h * w * 0.30):
                    x, y, bw, bh = cv2.boundingRect(cnt)
                    aspect_ratio = float(bh) / max(1, bw)

                    # Smartphone aspect ratio is typically between 1.3 and 2.6 (or inverse for landscape)
                    if (1.3 <= aspect_ratio <= 2.6 or 0.38 <= aspect_ratio <= 0.77) and y < (h * 0.88):
                        # Check face overlap: device should not cover face center
                        inside_face = False
                        for (fx, fy, fw, fh) in face_boxes:
                            face_area = float(fw * fh)
                            ix1 = max(x, fx)
                            iy1 = max(y, fy)
                            ix2 = min(x + bw, fx + fw)
                            iy2 = min(y + bh, fy + fh)
                            inter_area = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                            if inter_area > (face_area * 0.40):
                                inside_face = True
                                break

                        if not inside_face:
                            # Verify presence of hand skin adjacent to device
                            hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
                            lower_skin = np.array([0, 15, 60], dtype=np.uint8)
                            upper_skin = np.array([25, 255, 255], dtype=np.uint8)
                            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)

                            roi_y2 = min(h, y + bh + 15)
                            roi_skin = skin_mask[y:roi_y2, max(0, x - 10):min(w, x + bw + 10)]
                            skin_count = np.count_nonzero(roi_skin)

                            if skin_count >= 15:
                                return {
                                    "label": "PHONE_DETECTED",
                                    "confidence": 0.80,
                                    "box": (int(x), int(y), int(bw), int(bh)),
                                }
        except Exception as e:
            print(f"[OPENCV ROI DETECTION ERROR] {e}")

        return None
