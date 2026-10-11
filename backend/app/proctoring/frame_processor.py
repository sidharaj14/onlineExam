import base64
import numpy as np
import cv2
from typing import Tuple, Optional, Any

from app.proctoring.config import TARGET_FRAME_WIDTH, TARGET_FRAME_HEIGHT

class OpenCVFrameProcessor:
    """
    Genuine OpenCV Frame Preprocessor
    Performs Base64 decoding, BGR color conversion, resizing, grayscale conversion,
    histogram equalization, and Gaussian smoothing using OpenCV routines.
    """

    @staticmethod
    def decode_base64_frame(base64_str: str) -> Optional[np.ndarray]:
        """Decode Base64 data string to OpenCV BGR numpy array image using cv2.imdecode."""
        if not base64_str:
            return None
        try:
            if "," in base64_str:
                _, data = base64_str.split(",", 1)
            else:
                data = base64_str
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"[OPENCV DECODE ERROR] {e}")
            return None

    @staticmethod
    def encode_frame_to_base64(img: np.ndarray, quality: int = 80) -> Optional[str]:
        """Encode OpenCV image (BGR numpy array) to Base64 JPEG string using cv2.imencode."""
        try:
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            success, buffer = cv2.imencode(".jpg", img, encode_param)
            if not success:
                return None
            b64_str = base64.b64encode(buffer).decode("utf-8")
            return f"data:image/jpeg;base64,{b64_str}"
        except Exception as e:
            print(f"[OPENCV ENCODE ERROR] {e}")
            return None

    @staticmethod
    def preprocess_frame(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float, float]:
        """
        Preprocess OpenCV BGR image:
        - Resizes to standard processing dimensions (320x240)
        - Converts BGR to Grayscale using cv2.cvtColor
        - Equalizes histogram using cv2.equalizeHist for lighting robustness
        - Applies cv2.GaussianBlur smoothing
        Returns: (resized_bgr, preprocessed_gray, scale_x, scale_y)
        """
        orig_h, orig_w = img.shape[:2]
        resized_bgr = cv2.resize(img, (TARGET_FRAME_WIDTH, TARGET_FRAME_HEIGHT), interpolation=cv2.INTER_AREA)

        scale_x = orig_w / float(TARGET_FRAME_WIDTH)
        scale_y = orig_h / float(TARGET_FRAME_HEIGHT)

        # Convert to Grayscale
        gray = cv2.cvtColor(resized_bgr, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian Blur to reduce high-frequency camera noise
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)

        # Equalize Histogram to normalize lighting and glare
        equalized = cv2.equalizeHist(blurred)

        return resized_bgr, equalized, scale_x, scale_y
