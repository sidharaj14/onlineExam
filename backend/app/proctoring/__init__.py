"""
OpenCV Proctoring Module
"""
from app.proctoring.frame_processor import OpenCVFrameProcessor
from app.proctoring.face_detector import OpenCVFaceDetector
from app.proctoring.object_detector import OpenCVObjectDetector
from app.proctoring.evidence import OpenCVEvidenceCapturer
from app.proctoring.violation_engine import proctoring_engine, OpenCVProctoringEngine

__all__ = [
    "OpenCVFrameProcessor",
    "OpenCVFaceDetector",
    "OpenCVObjectDetector",
    "OpenCVEvidenceCapturer",
    "proctoring_engine",
    "OpenCVProctoringEngine",
]
