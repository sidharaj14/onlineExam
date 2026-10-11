"""
Proctoring Configuration Parameters
Centralized configuration for OpenCV Computer Vision, Face Detection,
Temporal Smoothing, and Violation Persistence.
"""

# Temporal persistence thresholds & Grace Periods (in seconds)
FACE_CONFIDENCE_THRESHOLD: float = 0.50
NO_FACE_GRACE_PERIOD_SECONDS: float = 3.0  # Grace period before triggering NO_FACE violation
FACE_DETECTION_PERSISTENCE_SECONDS: float = 3.0
FACE_DETECTION_MIN_CONSECUTIVE_FRAMES: int = 3  # Minimum consecutive frames before absence confirmed
FACE_DETECTION_SMOOTHING_WINDOW: int = 5  # Sliding window size for temporal smoothing

# Legacy alias for backward compatibility
NO_FACE_PERSISTENCE_SECONDS: float = NO_FACE_GRACE_PERIOD_SECONDS
MULTIPLE_FACES_PERSISTENCE_SECONDS: float = 1.5
PHONE_DETECTION_PERSISTENCE_SECONDS: float = 1.5

# Cooldown between violations of the same type (in seconds)
VIOLATION_COOLDOWN_SECONDS: float = 10.0

# Frame sampling & processing defaults
DEFAULT_PROCESS_FPS: float = 3.0
TARGET_FRAME_WIDTH: int = 320
TARGET_FRAME_HEIGHT: int = 240

# OpenCV Face Detection parameters
FACE_CASCADE_NAME: str = "haarcascade_frontalface_alt2.xml"
FACE_MIN_NEIGHBORS: int = 4
FACE_SCALE_FACTOR: float = 1.1

# Phone / Object detection parameters
PHONE_CONFIDENCE_THRESHOLD: float = 0.50
