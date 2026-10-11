import base64
import numpy as np
import cv2
import logging
from typing import Tuple, Optional, Any

from app.proctoring.config import TARGET_FRAME_WIDTH, TARGET_FRAME_HEIGHT

logger = logging.getLogger("proctoring.frame_processor")

class OpenCVFrameProcessor:
    """
    Genuine OpenCV Frame Preprocessor
    Performs Base64 decoding, BGR color conversion, resizing, grayscale conversion,
    adaptive histogram equalization (CLAHE), and Gaussian smoothing using OpenCV routines.
    """

    @staticmethod
    def decode_base64_frame(base64_str: str) -> Optional[np.ndarray]:
        """Decode Base64 data string to OpenCV BGR numpy array image using cv2.imdecode."""
        if not base64_str or not isinstance(base64_str, str):
            return None
        try:
            if "," in base64_str:
                _, data = base64_str.split(",", 1)
            else:
                data = base64_str
            img_bytes = base64.b64decode(data)
            if not img_bytes:
                return None
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None or img.size == 0:
                return None
            return img
        except Exception as e:
            logger.warning("[OPENCV DECODE ERROR] Failed to decode base64 frame: %s", e)
            return None

    @staticmethod
    def encode_frame_to_base64(img: np.ndarray, quality: int = 80) -> Optional[str]:
        """Encode OpenCV image (BGR numpy array) to Base64 JPEG string using cv2.imencode."""
        if img is None or img.size == 0:
            return None
        try:
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            success, buffer = cv2.imencode(".jpg", img, encode_param)
            if not success:
                return None
            b64_str = base64.b64encode(buffer).decode("utf-8")
            return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            logger.warning("[OPENCV ENCODE ERROR] Failed to encode frame to base64: %s", e)
            return None

    @staticmethod
    def preprocess_frame(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """
        Preprocess OpenCV BGR image:
        - Resizes to standard processing dimensions (320x240)
        - Converts BGR to Grayscale using cv2.cvtColor
        - Applies adaptive CLAHE (Contrast Limited Adaptive Histogram Equalization)
          to preserve facial gradient landmarks under varied indoor lighting
        - Applies mild cv2.GaussianBlur smoothing
        Returns: (resized_bgr, processed_gray, scale_x, scale_y)
        """
        orig_h, orig_w = img.shape[:2]
        resized_bgr = cv2.resize(img, (TARGET_FRAME_WIDTH, TARGET_FRAME_HEIGHT), interpolation=cv2.INTER_AREA)

        scale_x = orig_w / float(TARGET_FRAME_WIDTH)
        scale_y = orig_h / float(TARGET_FRAME_HEIGHT)

        # Convert to Grayscale
        gray = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2GRAY)

        # Apply mild Gaussian Blur to reduce high-frequency sensor noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        # Use CLAHE to preserve local contrast and facial landmark gradients
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        processed_gray = clahe.apply(blurred)

        return resized_bgr, processed_gray, scale_x, scale_y
