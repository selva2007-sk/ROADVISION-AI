from __future__ import annotations

import base64
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import cv2
except Exception as _e:
    cv2 = None
    print(f"[RoadDamageInferenceEngine] OpenCV not available, using Pillow fallback: {_e}")

import numpy as np
from PIL import Image
import io


class RoadDamageInferenceEngine:
    """Road Damage Detection Engine with dual-mode support:
    1. Real YOLO model (when weights are supplied in backend/ai/weights/)
    2. Explicitly labeled Demo Heuristic Mode (OpenCV-based edge/texture analysis + synthetic bounding boxes)
    """

    DAMAGE_CLASSES = [
        'pothole',
        'longitudinal_crack',
        'transverse_crack',
        'alligator_crack',
        'damaged_surface',
    ]

    SEVERITY_WEIGHTS = {
        'pothole': 0.92,
        'alligator_crack': 0.85,
        'longitudinal_crack': 0.65,
        'transverse_crack': 0.60,
        'damaged_surface': 0.55,
    }

    def __init__(self, weights_path: Optional[str] = None):
        self.weights_path = weights_path or os.getenv('YOLO_WEIGHTS_PATH')
        self.yolo_model = None
        self.mode = 'demo'

        # Attempt to load custom weights if available
        if self.weights_path and Path(self.weights_path).exists():
            try:
                # pyrefly: ignore [missing-import]
                from ultralytics import YOLO
                self.yolo_model = YOLO(self.weights_path)
                self.mode = 'production_yolo'
            except Exception as e:
                print(f"[RoadDamageInferenceEngine] Warning: Could not load YOLO weights from {self.weights_path}: {e}")
                self.mode = 'demo'
        else:
            self.mode = 'demo'

        # Memory for duplicate filtering across consecutive frames: stores list of (timestamp, lat, lng, bbox)
        self.recent_detections: List[Dict[str, Any]] = []

    def decode_image(self, image_data: str) -> Optional[np.ndarray]:
        """Decode base64 image data string into OpenCV BGR / RGB numpy array."""
        try:
            if ',' in image_data:
                image_data = image_data.split(',', 1)[1]
            img_bytes = base64.b64decode(image_data)
            if cv2 is not None:
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                return img
            else:
                pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
                return np.array(pil_img)
        except Exception as e:
            print(f"[RoadDamageInferenceEngine] Error decoding image: {e}")
            return None

    def detect(
        self,
        image: np.ndarray,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        filter_duplicates: bool = True
    ) -> List[Dict[str, Any]]:
        """Run object detection on an OpenCV BGR frame.

        Returns a list of detection objects with normalized coordinates [ymin, xmin, ymax, xmax].
        """
        if image is None:
            return []

        h, w = image.shape[:2]

        if self.mode == 'production_yolo' and self.yolo_model is not None:
            return self._predict_yolo(image, h, w, latitude, longitude, filter_duplicates)
        else:
            return self._predict_demo_heuristic(image, h, w, latitude, longitude, filter_duplicates)

    def _predict_yolo(
        self,
        image: np.ndarray,
        h: int,
        w: int,
        latitude: Optional[float],
        longitude: Optional[float],
        filter_duplicates: bool
    ) -> List[Dict[str, Any]]:
        results = self.yolo_model(image, verbose=False)
        detections = []

        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                cls_name = self.yolo_model.names.get(cls_id, 'damaged_surface')
                xyxy = box.xyxy[0].tolist()

                # Normalize to [ymin, xmin, ymax, xmax] in [0, 1] range
                norm_bbox = [
                    round(xyxy[1] / h, 4),
                    round(xyxy[0] / w, 4),
                    round(xyxy[3] / h, 4),
                    round(xyxy[2] / w, 4),
                ]

                severity = self.estimate_severity(cls_name, conf, norm_bbox)

                det = {
                    'category': cls_name,
                    'confidence': round(conf, 3),
                    'bbox': norm_bbox,
                    'severity': severity,
                    'source': 'production_yolo',
                    'is_demo': False,
                }

                if filter_duplicates and self.is_duplicate(norm_bbox, latitude, longitude):
                    continue

                detections.append(det)

        return detections

    def _predict_demo_heuristic(
        self,
        image: np.ndarray,
        h: int,
        w: int,
        latitude: Optional[float],
        longitude: Optional[float],
        filter_duplicates: bool
    ) -> List[Dict[str, Any]]:
        """Demo heuristic mode: uses OpenCV edge detection on the lower road ROI
        to detect realistic road irregularities and generate labeled demo detections.
        """
        detections: List[Dict[str, Any]] = []
        candidate_boxes = []
        if cv2 is not None:
            try:
                # Focus on the lower road section (bottom 60% of frame where road pavement lies)
                road_roi = image[int(h * 0.4):h, :]
                gray = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
                blurred = cv2.GaussianBlur(gray, (5, 5), 0)
                edges = cv2.Canny(blurred, 60, 180)

                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for c in contours:
                    area = cv2.contourArea(c)
                    if area > 400:
                        x, y, cw, ch = cv2.boundingRect(c)
                        # Map y back to full frame
                        full_y = int(h * 0.4) + y
                        candidate_boxes.append((x, full_y, cw, ch, area))

                # Sort by contour area descending and take top 1 or 2
                candidate_boxes.sort(key=lambda b: b[4], reverse=True)
            except Exception as _cv_err:
                print(f"[RoadDamageInferenceEngine] Heuristic contour error: {_cv_err}")

        # Fallback if no strong contour found or OpenCV is not loaded
        if not candidate_boxes:
            candidate_boxes = [(int(w * 0.35), int(h * 0.55), int(w * 0.3), int(h * 0.22), 500)]

        for i, (bx, by, bw, bh, area) in enumerate(candidate_boxes[:2]):
            norm_bbox = [
                round(max(0.0, by / h), 4),
                round(max(0.0, bx / w), 4),
                round(min(1.0, (by + bh) / h), 4),
                round(min(1.0, (bx + bw) / w), 4),
            ]

            # Choose realistic damage category based on aspect ratio of bounding box
            aspect_ratio = bw / max(bh, 1)
            if aspect_ratio > 2.2:
                category = 'transverse_crack'
                confidence = 0.86
            elif aspect_ratio < 0.5:
                category = 'longitudinal_crack'
                confidence = 0.89
            elif area > 1500:
                category = 'pothole'
                confidence = 0.94
            else:
                category = 'alligator_crack'
                confidence = 0.82

            severity = self.estimate_severity(category, confidence, norm_bbox)

            if filter_duplicates and self.is_duplicate(norm_bbox, latitude, longitude):
                continue

            detections.append({
                'category': category,
                'confidence': confidence,
                'bbox': norm_bbox,
                'severity': severity,
                'source': 'demo_heuristic',
                'is_demo': True,
                'note': 'Demo heuristic detection (No trained weights installed)',
            })

        return detections

    def estimate_severity(self, category: str, confidence: float, bbox: List[float]) -> str:
        """Estimate severity based on category weight, confidence, and bounding box area.
        Note: Clearly documented as an image-based estimate; pothole depth requires manual verification.
        """
        base_weight = self.SEVERITY_WEIGHTS.get(category, 0.6)
        # Bounding box area = (ymax - ymin) * (xmax - xmin)
        box_area = max(0.01, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]))
        area_factor = min(1.3, max(0.7, math.sqrt(box_area) * 2.5))

        score = base_weight * confidence * area_factor

        if score >= 0.72 or category == 'pothole':
            return 'High'
        elif score >= 0.50:
            return 'Medium'
        else:
            return 'Low'

    def is_duplicate(
        self,
        bbox: List[float],
        latitude: Optional[float],
        longitude: Optional[float],
        iou_threshold: float = 0.45,
        distance_meters_threshold: float = 8.0
    ) -> bool:
        """Filter out duplicates across consecutive frames using IoU and spatial proximity."""
        # 1. Spatial distance check if GPS is available
        if latitude is not None and longitude is not None:
            for past in self.recent_detections[-15:]:
                past_lat = past.get('lat')
                past_lng = past.get('lng')
                if past_lat is not None and past_lng is not None:
                    # Haversine approximation in meters
                    dlat = (latitude - past_lat) * 111139.0
                    dlng = (longitude - past_lng) * 111139.0 * math.cos(math.radians(latitude))
                    dist = math.sqrt(dlat * dlat + dlng * dlng)
                    if dist < distance_meters_threshold:
                        return True

        # 2. IoU check for consecutive frame boxes
        for past in self.recent_detections[-5:]:
            past_box = past.get('bbox')
            if past_box and self._calculate_iou(bbox, past_box) > iou_threshold:
                return True

        # Record this detection to avoid duplicate next time
        self.recent_detections.append({
            'bbox': bbox,
            'lat': latitude,
            'lng': longitude,
        })
        if len(self.recent_detections) > 40:
            self.recent_detections.pop(0)

        return False

    @staticmethod
    def _calculate_iou(boxA: List[float], boxB: List[float]) -> float:
        """Calculate Intersection over Union between two [ymin, xmin, ymax, xmax] boxes."""
        yA = max(boxA[0], boxB[0])
        xA = max(boxA[1], boxB[1])
        yB = min(boxA[2], boxB[2])
        xB = min(boxA[3], boxB[3])

        interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
        boxAArea = max(1e-6, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        boxBArea = max(1e-6, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

        iou = interArea / float(boxAArea + boxBArea - interArea)
        return iou


# Singleton instance
road_ai = RoadDamageInferenceEngine()
