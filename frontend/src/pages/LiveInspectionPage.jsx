import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Pause,
  Camera,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Navigation,
  Gauge,
  Sliders,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';

export default function LiveInspectionPage({
  dashboard,
  vehicles,
  onNewDetection,
}) {
  const [sourceMode, setSourceMode] = useState('webcam'); // 'webcam' | 'simulated'
  const [isInspecting, setIsInspecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('RV-1001');
  const [sessionId, setSessionId] = useState('live-inspection-01');
  const [intervalMs, setIntervalMs] = useState(1200);

  // Telemetry
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [liveCoords, setLiveCoords] = useState({ lat: 12.9716, lng: 77.5946, accuracy: 3.2 });
  const [speedKmh, setSpeedKmh] = useState(34);
  const [recentDetections, setRecentDetections] = useState([]);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);

  // Refs for video & canvas
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const frameIntervalRef = useRef(null);

  // Setup Browser Geolocation if supported
  useEffect(() => {
    if ('geolocation' in navigator) {
      const geoWatch = navigator.geolocation.watchPosition(
        (pos) => {
          setLiveCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => console.log('Geolocation unavailable or denied:', err.message),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(geoWatch);
    }
  }, []);

  // Timer for inspection duration
  useEffect(() => {
    if (isInspecting && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isInspecting, isPaused]);

  // Handle Webcam Start / Stop
  useEffect(() => {
    if (sourceMode === 'webcam') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('Webcam access error:', err.message);
        });
    } else {
      // Clean up webcam if switched to simulated
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sourceMode]);

  // Frame processing loop during active inspection
  useEffect(() => {
    if (isInspecting && !isPaused) {
      frameIntervalRef.current = setInterval(processFrame, intervalMs);
    } else {
      clearInterval(frameIntervalRef.current);
      clearCanvas();
    }
    return () => clearInterval(frameIntervalRef.current);
  }, [isInspecting, isPaused, intervalMs, sourceMode]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Capture frame from video or simulated image and run AI detection
  const processFrame = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let base64Frame = '';

    if (sourceMode === 'webcam' && video && video.readyState >= 2) {
      // Draw video frame to an off-screen canvas to capture base64
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 640;
      offscreen.height = video.videoHeight || 360;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      base64Frame = offscreen.toDataURL('image/jpeg', 0.6);
    } else {
      // Simulated feed: use the sample dashcam frame
      const simImg = document.getElementById('simulated-dashcam-img');
      if (simImg) {
        const offscreen = document.createElement('canvas');
        offscreen.width = simImg.naturalWidth || 640;
        offscreen.height = simImg.naturalHeight || 360;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(simImg, 0, 0, offscreen.width, offscreen.height);
        base64Frame = offscreen.toDataURL('image/jpeg', 0.6);
      }
    }

    if (!base64Frame) return;

    try {
      const response = await api.detectFrame({
        image: base64Frame,
        latitude: liveCoords.lat,
        longitude: liveCoords.lng,
        filter_duplicates: true,
      });

      // Clear previous boxes
      ctx.clearRect(0, 0, width, height);

      if (response && response.detections && response.detections.length > 0) {
        response.detections.forEach((det) => {
          const [ymin, xmin, ymax, xmax] = det.bbox;
          const bx = xmin * width;
          const by = ymin * height;
          const bw = (xmax - xmin) * width;
          const bh = (ymax - ymin) * height;

          // Box color based on severity
          let strokeColor = '#F97316';
          if (det.severity === 'High') strokeColor = '#DC2626';
          if (det.severity === 'Low') strokeColor = '#EAB308';

          // Draw Bounding Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, bw, bh);

          // Draw Label Tag
          const label = `${det.category.replace('_', ' ')} (${(det.confidence * 100).toFixed(0)}%)`;
          ctx.font = 'bold 12px Inter, sans-serif';
          const textWidth = ctx.measureText(label).width;

          ctx.fillStyle = strokeColor;
          ctx.fillRect(bx, Math.max(0, by - 22), textWidth + 12, 22);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, bx + 6, Math.max(14, by - 6));

          // Save detection record
          const newRecord = {
            id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            category: det.category,
            severity: det.severity,
            confidence: det.confidence,
            latitude: liveCoords.lat,
            longitude: liveCoords.lng,
            timestamp: new Date().toISOString(),
            review_status: 'pending_review',
            evidence_image: base64Frame,
            road_segment: 'Live Inspection Sector',
            source: det.source || 'demo_heuristic',
          };

          setRecentDetections((prev) => [newRecord, ...prev.slice(0, 15)]);

          // Post to backend database
          api.createDetection({
            ...newRecord,
            session_id: sessionId,
          }).catch(() => {});

          if (onNewDetection) {
            onNewDetection(newRecord);
          }
        });
      }
    } catch (err) {
      console.warn('Frame detection error:', err.message);
    }
  };

  const startInspection = () => {
    setIsInspecting(true);
    setIsPaused(false);
    setSecondsElapsed(0);
    const timestampStr = Date.now().toString();
    const newSessionId = `session-${timestampStr}`;
    setSessionId(newSessionId);

    // Call backend
    api.createSession({
      session_id: newSessionId,
      vehicle_id: selectedVehicle,
      notes: 'Active Road Patrol Inspection',
    }).catch(() => {});
  };

  const togglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    api.updateSession(sessionId, {
      status: nextPaused ? 'paused' : 'recording',
    }).catch(() => {});
  };

  const stopInspection = () => {
    setIsInspecting(false);
    setIsPaused(false);
    clearCanvas();

    api.updateSession(sessionId, {
      status: 'completed',
      detections_count: recentDetections.length,
      distance_km: (secondsElapsed * 0.009).toFixed(1),
    }).catch(() => {});
  };

  const handleReviewAction = async (item, status) => {
    try {
      await api.updateDetection(item.id, { review_status: status });
      setRecentDetections((prev) =>
        prev.map((d) => (d.id === item.id ? { ...d, review_status: status } : d))
      );
      setSelectedReviewItem(null);
    } catch (err) {
      console.error('Failed to update detection review:', err);
    }
  };

  const formatDuration = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Strip */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Camera size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Vehicle Camera Detection Station</h2>
            <p className="text-xs text-slate-500">Live AI inference with spatial duplicate filtering</p>
          </div>
        </div>

        {/* Source Selector & Vehicle Selector */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setSourceMode('webcam')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                sourceMode === 'webcam'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Webcam (Live)
            </button>
            <button
              onClick={() => setSourceMode('simulated')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                sourceMode === 'simulated'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simulated Dashcam (Demo)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Vehicle:</span>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
            >
              {vehicles?.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_id} ({v.vehicle_type})
                </option>
              )) || <option value="RV-1001">RV-1001 (Inspection SUV)</option>}
            </select>
          </div>

          {/* Inspection Buttons */}
          {!isInspecting ? (
            <button
              onClick={startInspection}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
            >
              <Play size={16} />
              <span>Start Inspection</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition"
              >
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={stopInspection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition"
              >
                <Square size={15} />
                <span>Stop & Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Screen: Video Stream on Left, Live Detection History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video & Bounding Boxes Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-lg border border-slate-800">
            {sourceMode === 'webcam' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                id="simulated-dashcam-img"
                src="/road_feed_sample.jpg"
                alt="Simulated Dashcam"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/pothole_dashcam.jpg';
                }}
              />
            )}

            {/* Overlaid HTML5 Canvas for real-time bounding box drawing */}
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Live Indicator Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {isInspecting ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  <span>RECORDING</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 backdrop-blur text-slate-300 text-xs font-medium border border-white/10">
                  <Radio size={12} />
                  <span>PREVIEW STANDBY</span>
                </div>
              )}

              {sourceMode === 'simulated' && (
                <div className="px-2.5 py-1 rounded-md bg-amber-500/90 text-slate-950 text-xs font-bold border border-amber-300">
                  DEMO / TEST FEED
                </div>
              )}
            </div>

            {/* Telemetry HUD on Bottom Left */}
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-xs font-mono">
              <div className="px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur border border-white/10 text-slate-200">
                GPS: {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)}
              </div>
              <div className="px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur border border-white/10 text-slate-200">
                SPD: {speedKmh} km/h
              </div>
              <div className="px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur border border-white/10 text-emerald-400">
                TIME: {formatDuration(secondsElapsed)}
              </div>
            </div>

            {/* Detection count pill */}
            <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-blue-600/90 backdrop-blur text-white text-xs font-bold border border-blue-400/30">
              Detections: {recentDetections.length}
            </div>
          </div>

          {/* Frame Interval & Severity Disclaimer */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <Sliders size={14} />
              <span>Inference Interval: {intervalMs}ms</span>
              <input
                type="range"
                min="500"
                max="2500"
                step="100"
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                className="w-24 accent-blue-600"
              />
            </div>
            <div className="italic text-[11px] text-slate-400">
              * Note: Severity is an image-based estimate; pothole depth requires manual verification.
            </div>
          </div>
        </div>

        {/* Right: Live Detection History & Review Queue */}
        <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Detection Review Queue</h3>
              <p className="text-xs text-slate-500">Incoming hazard detections</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {recentDetections.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2 scrollbar-thin">
            {recentDetections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <AlertTriangle size={32} className="opacity-30 mb-2" />
                <p className="text-xs font-medium text-slate-500">No detections recorded yet</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Click 'Start Inspection' to begin analyzing video frames for potholes and cracks.
                </p>
              </div>
            ) : (
              recentDetections.map((det) => (
                <div
                  key={det.id}
                  className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 capitalize truncate">
                        {det.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          det.severity === 'High'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : det.severity === 'Medium'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {det.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Conf: {(det.confidence * 100).toFixed(0)}% · {new Date(det.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Actions: Verify / Reject */}
                  <div className="flex items-center gap-1">
                    {det.review_status === 'pending_review' ? (
                      <>
                        <button
                          onClick={() => handleReviewAction(det, 'verified')}
                          className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          title="Verify as genuine hazard"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReviewAction(det, 'rejected')}
                          className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Reject false positive"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 capitalize">
                        {det.review_status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
