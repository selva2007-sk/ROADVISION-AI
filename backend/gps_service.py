import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth in km."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def validate_coordinates(lat: Any, lng: Any) -> Tuple[bool, Optional[float], Optional[float], Optional[str]]:
    """Validate latitude and longitude ranges.
    Returns (is_valid, float_lat, float_lng, error_message).
    """
    if lat is None or lng is None:
        return False, None, None, "Coordinates cannot be null"
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (ValueError, TypeError):
        return False, None, None, "Coordinates must be valid floating point numbers"

    if math.isnan(lat_f) or math.isnan(lng_f) or math.isinf(lat_f) or math.isinf(lng_f):
        return False, None, None, "Coordinates cannot be NaN or Infinite"

    if not (-90.0 <= lat_f <= 90.0):
        return False, None, None, f"Latitude {lat_f} is out of valid range [-90.0, 90.0]"

    if not (-180.0 <= lng_f <= 180.0):
        return False, None, None, f"Longitude {lng_f} is out of valid range [-180.0, 180.0]"

    # Check for (0,0) "Null Island" error common in uninitialized hardware
    if abs(lat_f) < 0.0001 and abs(lng_f) < 0.0001:
        return False, lat_f, lng_f, "Coordinates (0,0) indicate uninitialized GPS receiver / no fix"

    return True, round(lat_f, 7), round(lng_f, 7), None


def determine_gps_state(
    last_update: Optional[datetime],
    accuracy: Optional[float],
    current_status: Optional[str] = None,
    explicit_disconnected: bool = False
) -> Tuple[str, bool, Optional[str]]:
    """Determine standardized GPS connection state:
    - GPS Connected
    - GPS Unavailable
    - GPS Permission Denied
    - GPS Signal Unreliable
    - GPS Reconnecting

    Returns (status_label, is_reliable, warning_reason).
    """
    if current_status == 'GPS Permission Denied':
        return 'GPS Permission Denied', False, "Location access was denied by browser or device security policy."

    if explicit_disconnected or last_update is None:
        return 'GPS Unavailable', False, "No GPS telemetry stream detected from receiver or edge device."

    # Calculate time elapsed since last fix
    now = datetime.now(timezone.utc)
    if last_update.tzinfo is None:
        last_update = last_update.replace(tzinfo=timezone.utc)
    time_delta_seconds = (now - last_update).total_seconds()

    if time_delta_seconds > 45.0:
        return 'GPS Unavailable', False, f"GPS fix timeout: no samples received for {int(time_delta_seconds)}s."
    elif time_delta_seconds > 12.0:
        return 'GPS Reconnecting', False, f"Temporary signal loss detected ({int(time_delta_seconds)}s since last sample)."

    # Check accuracy
    if accuracy is not None and accuracy > 25.0:
        return 'GPS Signal Unreliable', False, f"Horizontal accuracy ±{accuracy:.1f}m exceeds the reliable road mapping threshold of 25m."

    return 'GPS Connected', True, None


def parse_nmea_sentence(sentence: str) -> Optional[Dict[str, Any]]:
    """Parse NMEA-0183 standard sentences ($GPRMC or $GPGGA) from USB/serial GPS receivers."""
    if not sentence or not sentence.startswith('$'):
        return None

    # Strip checksum if present
    content = sentence.strip()
    if '*' in content:
        content, _ = content.split('*', 1)

    parts = content.split(',')
    sentence_type = parts[0].upper()

    def nmea_to_decimal(val_str: str, direction: str) -> Optional[float]:
        if not val_str or not direction:
            return None
        try:
            dot_pos = val_str.find('.')
            if dot_pos < 2:
                return None
            deg_digits = 2 if direction.upper() in ('N', 'S') else 3
            deg = float(val_str[:deg_digits])
            minutes = float(val_str[deg_digits:])
            decimal = deg + (minutes / 60.0)
            if direction.upper() in ('S', 'W'):
                decimal = -decimal
            return decimal
        except Exception:
            return None

    if sentence_type in ('$GPRMC', '$GNRMC'):
        # Format: $GPRMC,hhmmss.ss,status,lat,N/S,lon,E/W,speed_knots,track_deg,date,...
        if len(parts) < 8:
            return None
        status = parts[2].upper()
        if status != 'A':
            return {'is_valid': False, 'status': 'GPS Unavailable', 'warning': 'NMEA Void status (no fix)'}

        lat = nmea_to_decimal(parts[3], parts[4])
        lon = nmea_to_decimal(parts[5], parts[6])
        if lat is None or lon is None:
            return None

        speed_knots = float(parts[7]) if parts[7] else 0.0
        speed_kmh = round(speed_knots * 1.852, 1)

        return {
            'is_valid': True,
            'latitude': round(lat, 7),
            'longitude': round(lon, 7),
            'speed': speed_kmh,
            'accuracy': 3.5,  # Nominal standard GNSS accuracy
            'status': 'GPS Connected',
            'sentence_type': sentence_type,
        }

    elif sentence_type in ('$GPGGA', '$GNGGA'):
        # Format: $GPGGA,hhmmss.ss,lat,N/S,lon,E/W,quality,satellites,hdop,altitude,...
        if len(parts) < 10:
            return None
        quality = int(parts[6]) if parts[6] else 0
        if quality == 0:
            return {'is_valid': False, 'status': 'GPS Unavailable', 'warning': 'No GPS fix in GGA sentence'}

        lat = nmea_to_decimal(parts[2], parts[3])
        lon = nmea_to_decimal(parts[4], parts[5])
        if lat is None or lon is None:
            return None

        satellites = int(parts[7]) if parts[7] else 4
        hdop = float(parts[8]) if parts[8] else 1.5
        est_accuracy = round(hdop * 2.5, 1)

        return {
            'is_valid': True,
            'latitude': round(lat, 7),
            'longitude': round(lon, 7),
            'satellites': satellites,
            'accuracy': est_accuracy,
            'status': 'GPS Signal Unreliable' if est_accuracy > 25.0 else 'GPS Connected',
            'sentence_type': sentence_type,
        }

    return None


def group_points_into_segments(
    points: List[Dict[str, Any]],
    max_time_gap_seconds: float = 30.0,
    max_distance_jump_km: float = 0.50
) -> Tuple[List[List[Tuple[float, float]]], float]:
    """Group chronological GPS points into distinct continuous road segments.
    Splits when:
    1. Time gap between consecutive samples > 30s
    2. Distance jump > 0.50 km (500m)
    3. Point is marked is_valid=False or accuracy > 30m

    Avoids drawing false connection lines across outages or tunnels.
    Calculates total inspection distance only along valid continuous segments.
    """
    segments: List[List[Tuple[float, float]]] = []
    current_segment: List[Tuple[float, float]] = []
    total_distance_km = 0.0

    prev_pt: Optional[Dict[str, Any]] = None

    for pt in points:
        lat = pt.get('latitude')
        lng = pt.get('longitude')
        is_valid = pt.get('is_valid', True)
        accuracy = pt.get('accuracy')

        # Filter out invalid or degraded points from path geometry
        if not is_valid or (accuracy is not None and accuracy > 30.0):
            if current_segment:
                if len(current_segment) >= 2:
                    segments.append(current_segment)
                current_segment = []
            prev_pt = None
            continue

        if prev_pt is not None:
            prev_lat = prev_pt['latitude']
            prev_lng = prev_pt['longitude']
            dist = haversine_distance_km(prev_lat, prev_lng, lat, lng)

            # Check time gap if timestamps exist
            time_gap_seconds = 0.0
            pt_time = pt.get('timestamp')
            prev_time = prev_pt.get('timestamp')
            if pt_time and prev_time:
                try:
                    if isinstance(pt_time, str):
                        t1 = datetime.fromisoformat(pt_time.replace('Z', '+00:00'))
                    else:
                        t1 = pt_time
                    if isinstance(prev_time, str):
                        t0 = datetime.fromisoformat(prev_time.replace('Z', '+00:00'))
                    else:
                        t0 = prev_time
                    time_gap_seconds = abs((t1 - t0).total_seconds())
                except Exception:
                    time_gap_seconds = 0.0

            # If gap exceeded, break current segment to prevent bridging across signal loss
            if (time_gap_seconds > max_time_gap_seconds and time_gap_seconds > 0) or dist > max_distance_jump_km:
                if len(current_segment) >= 2:
                    segments.append(current_segment)
                current_segment = [(lat, lng)]
                prev_pt = pt
                continue

            # Valid contiguous sample
            current_segment.append((lat, lng))
            total_distance_km += dist
        else:
            current_segment.append((lat, lng))

        prev_pt = pt

    if len(current_segment) >= 2:
        segments.append(current_segment)
    elif len(current_segment) == 1 and not segments:
        # Single isolated point fallback
        segments.append(current_segment)

    return segments, round(total_distance_km, 2)


def associate_ai_detection_with_gps(
    detection_timestamp: Optional[datetime],
    latest_gps_point: Optional[Dict[str, Any]],
    max_age_seconds: float = 6.0,
    max_accuracy_meters: float = 25.0
) -> Dict[str, Any]:
    """Associate AI road hazard detection with the closest valid GPS sample.
    Validates temporal proximity and positional accuracy.

    Note: Camera is mounted on the windshield/roof looking forward ~5-15m ahead
    of the vehicle's GNSS antenna. Pothole coordinates are the vehicle's estimated
    position when detected, with inherent camera perspective offset.
    """
    if latest_gps_point is None:
        return {
            'is_location_reliable': False,
            'location_warning': 'No GPS telemetry fix available at detection time.',
            'latitude': None,
            'longitude': None,
            'gps_accuracy': None,
        }

    lat = latest_gps_point.get('latitude')
    lng = latest_gps_point.get('longitude')
    accuracy = latest_gps_point.get('accuracy', 10.0)
    gps_time = latest_gps_point.get('timestamp')

    # Check temporal freshness
    time_delta = 0.0
    if detection_timestamp and gps_time:
        try:
            if isinstance(detection_timestamp, str):
                t_det = datetime.fromisoformat(detection_timestamp.replace('Z', '+00:00'))
            else:
                t_det = detection_timestamp
            if isinstance(gps_time, str):
                t_gps = datetime.fromisoformat(gps_time.replace('Z', '+00:00'))
            else:
                t_gps = gps_time

            if t_det.tzinfo is None:
                t_det = t_det.replace(tzinfo=timezone.utc)
            if t_gps.tzinfo is None:
                t_gps = t_gps.replace(tzinfo=timezone.utc)

            time_delta = abs((t_det - t_gps).total_seconds())
        except Exception:
            time_delta = 0.0

    warning = None
    is_reliable = True

    if time_delta > max_age_seconds and time_delta > 0:
        is_reliable = False
        warning = f"Stale GPS sample ({time_delta:.1f}s delay). Vehicle was moving during detection."
    elif accuracy is not None and accuracy > max_accuracy_meters:
        is_reliable = False
        warning = f"Low GPS accuracy (±{accuracy:.1f}m exceeds {max_accuracy_meters}m threshold)."
    else:
        warning = "Verified fresh GPS sample. (Note: Camera forward look-ahead offset of ~5-15m applies)."

    return {
        'is_location_reliable': is_reliable,
        'location_warning': warning,
        'latitude': lat,
        'longitude': lng,
        'gps_accuracy': accuracy,
        'time_delta_seconds': round(time_delta, 2),
    }
