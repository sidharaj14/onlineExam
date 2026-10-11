import cv2
import numpy as np
import base64
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional

class OpenCVEvidenceCapturer:
    """
    OpenCV Evidence Annotation & Snapshot Capturer
    Annotates OpenCV BGR frames with bounding boxes (cv2.rectangle) and text overlays (cv2.putText)
    including attempt ID, violation label, timestamp, confidence score, and strike number.
    """

    @staticmethod
    def annotate_evidence_frame(
        bgr_img: np.ndarray,
        attempt_id: str,
        violation_type: str,
        message: str,
        face_boxes: List[Tuple[int, int, int, int]],
        object_boxes: List[Dict[str, Any]],
        confidence: float = 95.0,
        strike_number: int = 1,
    ) -> str:
        """
        Draw bounding boxes and security watermark on frame using OpenCV, then encode as Base64 JPEG.
        """
        if bgr_img is None or bgr_img.size == 0:
            return ""

        annotated = bgr_img.copy()
        h, w = annotated.shape[:2]

        # Draw Face Bounding Boxes using cv2.rectangle
        for i, (fx, fy, fw, fh) in enumerate(face_boxes):
            color = (0, 255, 0) if i == 0 and violation_type != "MULTIPLE_FACES" else (0, 0, 255)
            label = "Primary Candidate" if i == 0 else f"2nd Face #{i+1}"
            cv2.rectangle(annotated, (fx, fy), (fx + fw, fy + fh), color, 2)
            cv2.putText(
                annotated,
                label,
                (fx, max(15, fy - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
                cv2.LINE_AA,
            )

        # Draw Object Bounding Boxes using cv2.rectangle
        for obj in object_boxes:
            box = obj.get("box")
            if box:
                ox, oy, ow, oh = box
                cv2.rectangle(annotated, (ox, oy), (ox + ow, oy + oh), (0, 0, 255), 2)
                cv2.putText(
                    annotated,
                    f"PHONE DETECTED ({obj.get('confidence', 0.8)*100:.0f}%)",
                    (ox, max(15, oy - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 0, 255),
                    2,
                    cv2.LINE_AA,
                )

        # Draw Top Banner Bar using cv2.rectangle
        cv2.rectangle(annotated, (0, 0), (w, 32), (15, 15, 25), -1)

        # Watermark Text using cv2.putText
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        header_text = f"PROCTOR AUDIT | STRIKE {strike_number}/3 | {violation_type} | {now_str}"
        cv2.putText(
            annotated,
            header_text,
            (10, 21),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 215, 255),
            1,
            cv2.LINE_AA,
        )

        # Encode to Base64 JPEG using cv2.imencode
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
        success, buffer = cv2.imencode(".jpg", annotated, encode_param)
        if not success:
            return ""

        b64_str = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"
