import os
import ssl
import urllib.request
import cv2
from typing import Optional, List, Tuple, Dict, Any

MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

CFG_NAME = "yolov4-tiny.cfg"
WEIGHTS_NAME = "yolov4-tiny.weights"
COCO_NAMES_NAME = "coco.names"

CFG_PATH = os.path.join(MODELS_DIR, CFG_NAME)
WEIGHTS_PATH = os.path.join(MODELS_DIR, WEIGHTS_NAME)
COCO_NAMES_PATH = os.path.join(MODELS_DIR, COCO_NAMES_NAME)

# Official Model Mirrors (Darknet / OpenCV official COCO release)
CFG_URL = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
WEIGHTS_URL = "https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights"
COCO_NAMES_URL = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/data/coco.names"

class ModelManager:
    """
    OpenCV DNN Object Detection Model Manager & Auto-Downloader
    Loads YOLOv4-tiny COCO network into OpenCV cv2.dnn for high-accuracy
    real-world cell phone detection.
    """

    _net: Optional[cv2.dnn.Net] = None
    _out_layers: List[str] = []
    _classes: List[str] = []
    _loaded: bool = False
    _load_attempted: bool = False

    @classmethod
    def get_net(cls) -> Tuple[Optional[cv2.dnn.Net], List[str], List[str]]:
        """
        Get or initialize the OpenCV DNN network instance, output layers, and class labels.
        Returns: (net, output_layer_names, class_labels)
        """
        if cls._loaded and cls._net is not None:
            return cls._net, cls._out_layers, cls._classes

        if cls._load_attempted:
            return cls._net, cls._out_layers, cls._classes

        cls._load_attempted = True
        try:
            cls.ensure_model_files()

            if os.path.exists(CFG_PATH) and os.path.exists(WEIGHTS_PATH):
                net = cv2.dnn.readNetFromDarknet(CFG_PATH, WEIGHTS_PATH)
                net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

                layer_names = net.getLayerNames()
                out_layer_indices = net.getUnconnectedOutLayers()
                out_layers = [layer_names[i - 1] for i in out_layer_indices.flatten()]

                classes = []
                if os.path.exists(COCO_NAMES_PATH):
                    with open(COCO_NAMES_PATH, "r") as f:
                        classes = [line.strip() for line in f.readlines()]

                cls._net = net
                cls._out_layers = out_layers
                cls._classes = classes
                cls._loaded = True
                print(f"[OPENCV DNN MODEL MANAGER] Successfully loaded YOLOv4-tiny COCO model ({len(classes)} classes) into cv2.dnn")
            else:
                print("[OPENCV DNN MODEL MANAGER] Model weights/config missing.")
        except Exception as e:
            print(f"[OPENCV DNN MODEL LOAD ERROR] {e}")
            cls._net = None

        return cls._net, cls._out_layers, cls._classes

    @classmethod
    def ensure_model_files(cls) -> bool:
        """
        Ensures model files are present on local disk. If missing, attempts automatic download.
        """
        os.makedirs(MODELS_DIR, exist_ok=True)
        ssl_ctx = ssl._create_unverified_context()

        # Download CFG
        if not os.path.exists(CFG_PATH):
            print(f"[OPENCV DNN MODEL MANAGER] Downloading {CFG_NAME}...")
            try:
                req = urllib.request.Request(CFG_URL, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as response, open(CFG_PATH, "wb") as f:
                    f.write(response.read())
            except Exception as e:
                print(f"[MODEL DOWNLOAD WARNING] Cfg download failed: {e}")

        # Download COCO names
        if not os.path.exists(COCO_NAMES_PATH):
            print(f"[OPENCV DNN MODEL MANAGER] Downloading {COCO_NAMES_NAME}...")
            try:
                req = urllib.request.Request(COCO_NAMES_URL, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=15) as response, open(COCO_NAMES_PATH, "wb") as f:
                    f.write(response.read())
            except Exception as e:
                print(f"[MODEL DOWNLOAD WARNING] Names download failed: {e}")

        # Download Weights
        if not os.path.exists(WEIGHTS_PATH):
            print(f"[OPENCV DNN MODEL MANAGER] Downloading {WEIGHTS_NAME} (23MB)...")
            try:
                req = urllib.request.Request(WEIGHTS_URL, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=ssl_ctx, timeout=45) as response, open(WEIGHTS_PATH, "wb") as f:
                    f.write(response.read())
            except Exception as e:
                print(f"[MODEL DOWNLOAD WARNING] Weights download failed: {e}")

        return os.path.exists(CFG_PATH) and os.path.exists(WEIGHTS_PATH)
