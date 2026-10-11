"""
Proctoring Configuration Parameters
"""

# Temporal persistence thresholds (in seconds)
NO_FACE_PERSISTENCE_SECONDS: float = 1.5
MULTIPLE_FACES_PERSISTENCE_SECONDS: float = 1.5
PHONE_DETECTION_PERSISTENCE_SECONDS: float = 1.5

# Cooldown between violations of the same type (in seconds)
VIOLATION_COOLDOWN_SECONDS: float = 10.0

# Frame sampling & processing defaults
DEFAULT_PROCESS_FPS: float = 3.0
TARGET_FRAME_WIDTH: int = 320
TARGET_FRAME_HEIGHT: int = 240

# OpenCV Face Detection parameters
FACE_CASCADE_NAME: str = "haarcascade_frontalface_default.xml"
FACE_MIN_NEIGHBORS: int = 5
FACE_SCALE_FACTOR: float = 1.1

# Phone / Object detection parameters
PHONE_CONFIDENCE_THRESHOLD: float = 0.50
