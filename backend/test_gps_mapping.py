import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

from app import app
from database import SessionLocal, init_db
from models import DetectionEvent, GPSPoint, InspectionSession, Report, Vehicle
from gps_service import (
    validate_coordinates,
    determine_gps_state,
    parse_nmea_sentence,
    group_points_into_segments,
    associate_ai_detection_with_gps,
    haversine_distance_km,
)


def run_all_tests():
    print("======================================================================")
    print("ROADVISION AI - GPS TRACKING & DIGITAL ROAD DAMAGE MAPPING TEST SUITE")
    print("======================================================================")
    client = app.test_client()
    passed = 0
    total = 0

    def assert_test(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {name}")
        else:
            print(f"[FAIL] {name} - Details: {details}")

    # -------------------------------------------------------------------------
    # 1. Coordinate Validation Tests
    # -------------------------------------------------------------------------
    print("\n--- 1. Coordinate Validation Tests ---")
    valid, lat, lng, err = validate_coordinates(12.9716, 77.5946)
    assert_test("Valid Bangalore Coordinates", valid and lat == 12.9716 and lng == 77.5946)

    valid, _, _, err = validate_coordinates(95.0, 77.5946)
    assert_test("Latitude Out of Bounds (>90) Rejected", not valid and "out of valid range" in err)

    valid, _, _, err = validate_coordinates(12.9716, 195.0)
    assert_test("Longitude Out of Bounds (>180) Rejected", not valid and "out of valid range" in err)

    valid, _, _, err = validate_coordinates(float('nan'), 77.5946)
    assert_test("NaN Coordinate Rejected", not valid and "NaN" in err)

    valid, _, _, err = validate_coordinates(0.0, 0.0)
    assert_test("Null Island (0,0) Uninitialized Fix Flagged", not valid and "Null Island" in err)

    valid, _, _, err = validate_coordinates(None, 77.5946)
    assert_test("Null Coordinate Rejected", not valid)

    # -------------------------------------------------------------------------
    # 2. GPS State Determination Tests
    # -------------------------------------------------------------------------
    print("\n--- 2. GPS State Determination Tests ---")
    now = datetime.now(timezone.utc)

    # Fresh & Accurate
    state, reliable, warn = determine_gps_state(last_update=now - timedelta(seconds=2), accuracy=3.2)
    assert_test("GPS Connected (Fresh & Accuracy 3.2m)", state == 'GPS Connected' and reliable and warn is None)

    # Unreliable Signal (Accuracy > 25m)
    state, reliable, warn = determine_gps_state(last_update=now - timedelta(seconds=2), accuracy=32.0)
    assert_test("GPS Signal Unreliable (Accuracy 32m > 25m)", state == 'GPS Signal Unreliable' and not reliable and "exceeds" in warn)

    # Reconnecting (15s delay)
    state, reliable, warn = determine_gps_state(last_update=now - timedelta(seconds=18), accuracy=4.0)
    assert_test("GPS Reconnecting (18s delay)", state == 'GPS Reconnecting' and not reliable and "delayed" in warn.lower() or "temporary" in warn.lower())

    # Unavailable (Timeout > 45s)
    state, reliable, warn = determine_gps_state(last_update=now - timedelta(seconds=60), accuracy=4.0)
    assert_test("GPS Unavailable (60s timeout)", state == 'GPS Unavailable' and not reliable)

    # Explicit Permission Denied
    state, reliable, warn = determine_gps_state(last_update=now, accuracy=3.0, current_status='GPS Permission Denied')
    assert_test("GPS Permission Denied", state == 'GPS Permission Denied' and not reliable and "denied" in warn.lower())

    # -------------------------------------------------------------------------
    # 3. NMEA 0183 Sentence Parser Tests (External USB GPS Receiver)
    # -------------------------------------------------------------------------
    print("\n--- 3. NMEA 0183 Hardware Sentence Parser Tests ---")
    # Sample GPRMC from GPS receiver
    gprmc = "$GPRMC,081836,A,1258.296,N,07735.676,E,18.5,084.4,191026,003.1,W*6A"
    res_rmc = parse_nmea_sentence(gprmc)
    assert_test(
        "NMEA $GPRMC Parser (Decimal Coordinates & Speed)",
        res_rmc is not None and res_rmc['is_valid'] and abs(res_rmc['latitude'] - 12.9716) < 0.01 and res_rmc['speed'] > 0
    )

    # Sample GPGGA from GNSS receiver
    gpgga = "$GPGGA,081836,1258.296,N,07735.676,E,1,08,1.2,920.0,M,-42.0,M,,*76"
    res_gga = parse_nmea_sentence(gpgga)
    assert_test(
        "NMEA $GPGGA Parser (Satellites & HDOP Accuracy)",
        res_gga is not None and res_gga['is_valid'] and res_gga['satellites'] == 8 and res_gga['accuracy'] < 5.0
    )

    # Invalid / Void Sentence
    void_rmc = "$GPRMC,081836,V,,,,,,,191026,,*28"
    res_void = parse_nmea_sentence(void_rmc)
    assert_test("NMEA Void/No-Fix Handled Gracefully", res_void is not None and not res_void['is_valid'])

    # -------------------------------------------------------------------------
    # 4. Inspected Road Segments & Gap Splitting Tests
    # -------------------------------------------------------------------------
    print("\n--- 4. Inspected Road Segments & Gap Splitting Tests ---")
    points = [
        # Segment 1 (continuous)
        {'latitude': 12.9716, 'longitude': 77.5946, 'is_valid': True, 'accuracy': 3.0, 'timestamp': '2026-10-19T10:00:00Z'},
        {'latitude': 12.9725, 'longitude': 77.5954, 'is_valid': True, 'accuracy': 3.2, 'timestamp': '2026-10-19T10:00:05Z'},
        {'latitude': 12.9738, 'longitude': 77.5968, 'is_valid': True, 'accuracy': 3.1, 'timestamp': '2026-10-19T10:00:10Z'},
        # Big time gap: 60s signal loss (tunnel / outage)
        {'latitude': 12.9752, 'longitude': 77.5982, 'is_valid': True, 'accuracy': 3.0, 'timestamp': '2026-10-19T10:01:10Z'},
        {'latitude': 12.9765, 'longitude': 77.6001, 'is_valid': True, 'accuracy': 3.2, 'timestamp': '2026-10-19T10:01:15Z'},
    ]
    segments, dist = group_points_into_segments(points, max_time_gap_seconds=30.0)
    assert_test(
        "Signal Gap Splitting (Does not bridge across 60s outage)",
        len(segments) == 2 and dist > 0,
        f"Segment count: {len(segments)}, distance: {dist}km"
    )

    # -------------------------------------------------------------------------
    # 5. AI-to-GPS Sample Association & Temporal Validation
    # -------------------------------------------------------------------------
    print("\n--- 5. AI-to-GPS Association Tests ---")
    det_time = datetime(2026, 10, 19, 10, 0, 4, tzinfo=timezone.utc)
    fresh_gps = {
        'latitude': 12.9725,
        'longitude': 77.5954,
        'accuracy': 3.5,
        'timestamp': datetime(2026, 10, 19, 10, 0, 2, tzinfo=timezone.utc),
    }
    assoc_fresh = associate_ai_detection_with_gps(det_time, fresh_gps, max_age_seconds=5.0)
    assert_test(
        "Fresh GPS Sample Associated with AI Detection",
        assoc_fresh['is_location_reliable'] and "Verified" in assoc_fresh['location_warning']
    )

    stale_gps = {
        'latitude': 12.9725,
        'longitude': 77.5954,
        'accuracy': 3.5,
        'timestamp': datetime(2026, 10, 19, 9, 59, 45, tzinfo=timezone.utc), # 19s old
    }
    assoc_stale = associate_ai_detection_with_gps(det_time, stale_gps, max_age_seconds=5.0)
    assert_test(
        "Stale GPS Sample (>5s) Flagged as Unreliable",
        not assoc_stale['is_location_reliable'] and "Stale" in assoc_stale['location_warning']
    )

    assoc_none = associate_ai_detection_with_gps(det_time, None)
    assert_test(
        "Missing GPS Sample Flagged Gracefully",
        not assoc_none['is_location_reliable'] and assoc_none['latitude'] is None
    )

    # -------------------------------------------------------------------------
    # 6. REST API Endpoints Tests
    # -------------------------------------------------------------------------
    print("\n--- 6. Backend REST API Endpoints Tests ---")

    # Health
    r = client.get('/api/health')
    assert_test("GET /api/health", r.status_code == 200 and r.json['status'] == 'online')

    # GPS Status
    r = client.get('/api/gps/status?vehicle_id=RV-1001')
    assert_test("GET /api/gps/status", r.status_code == 200 and 'status' in r.json and 'supported_sources' in r.json)

    # GPS Ingest Valid
    payload_valid = {
        'vehicle_id': 'RV-1001',
        'session_id': 'test-session-01',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'accuracy': 3.2,
        'speed': 34.0,
        'source': 'browser',
    }
    r = client.post('/api/gps', json=payload_valid)
    assert_test("POST /api/gps (Valid fix)", r.status_code == 201 and r.json['is_valid'])

    # GPS Ingest Invalid Coordinates
    payload_invalid = {
        'vehicle_id': 'RV-1001',
        'latitude': 120.0, # invalid lat
        'longitude': 77.5946,
    }
    r = client.post('/api/gps', json=payload_invalid)
    assert_test("POST /api/gps (Invalid coords rejected with 400)", r.status_code == 400)

    # GPS Ingest NMEA
    r = client.post('/api/gps/nmea', json={
        'sentence': "$GPRMC,081836,A,1258.296,N,07735.676,E,18.5,084.4,191026,003.1,W*6A",
        'vehicle_id': 'RV-1001',
    })
    assert_test("POST /api/gps/nmea", r.status_code == 201 and 'NMEA telemetry stored' in r.json['message'])

    # GPS Tracks
    r = client.get('/api/gps/tracks?vehicle_id=RV-1001')
    assert_test("GET /api/gps/tracks", r.status_code == 200 and 'segments' in r.json and 'total_distance_km' in r.json)

    # Map Markers with Multi-filter
    r = client.get('/api/map/markers?severity=High')
    assert_test("GET /api/map/markers?severity=High", r.status_code == 200 and all(m['severity'] == 'High' for m in r.json))

    # Map Segments
    r = client.get('/api/map/segments')
    assert_test("GET /api/map/segments", r.status_code == 200 and isinstance(r.json, list))

    # Vehicles endpoint returns telemetry
    r = client.get('/api/vehicles')
    assert_test("GET /api/vehicles (With GPS state & coords)", r.status_code == 200 and len(r.json) > 0 and 'gps_status' in r.json[0])

    # AI Detection Frame inference
    # Create simple base64 dummy frame (10x10 black jpeg)
    from PIL import Image
    import io, base64
    img = Image.new('RGB', (160, 120), color=(50, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    dummy_b64 = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

    r = client.post('/api/ai/detect', json={
        'image': dummy_b64,
        'latitude': 12.9716,
        'longitude': 77.5946,
        'filter_duplicates': True,
    })
    assert_test("POST /api/ai/detect (Inference on base64 frame)", r.status_code == 200 and 'detections' in r.json)

    # Create Detection with Automatic GPS sample association
    r = client.post('/api/detections', json={
        'category': 'pothole',
        'confidence': 0.95,
        'severity': 'High',
        'vehicle_id': 'RV-1001',
        'session_id': 'test-session-01',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'gps_accuracy': 3.2,
    })
    assert_test("POST /api/detections (Automatic AI-to-GPS sample association)", r.status_code == 201 and r.json['is_location_reliable'])

    # -------------------------------------------------------------------------
    # Final Results
    # -------------------------------------------------------------------------
    print("\n======================================================================")
    print(f"TEST RESULTS: {passed} / {total} tests passed ({(passed/total)*100:.1f}%)")
    print("======================================================================")
    return passed == total


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
