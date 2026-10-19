import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Standardized GPS Tracking Hook supporting multiple source pipelines:
 * - Browser Geolocation API (prototype/mobile companion)
 * - External USB GPS Receiver (NMEA stream via backend)
 * - Vehicle Edge Telematics Gateway
 * - Mobile Companion Sync
 */
export function useGPSTracker({
  vehicleId = 'RV-1001',
  sessionId = null,
  active = true,
  source = 'browser', // 'browser' | 'usb_serial' | 'edge_device' | 'mobile_sync'
  autoRecord = false,
  recordIntervalMs = 3000,
  onLocationUpdate = null,
} = {}) {
  const [coords, setCoords] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
  });

  const [gpsStatus, setGpsStatus] = useState('GPS Unavailable');
  const [isReliable, setIsReliable] = useState(false);
  const [warning, setWarning] = useState(null);
  const [activeSource, setActiveSource] = useState(source);

  const watchIdRef = useRef(null);
  const pollTimerRef = useRef(null);
  const recordTimerRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const mountedRef = useRef(true);

  // Evaluate location reliability based on accuracy and age
  const evaluateReliability = useCallback((accuracy, updateTime) => {
    if (!updateTime) {
      return { reliable: false, status: 'GPS Unavailable', warn: 'No GPS sample received.' };
    }
    const ageSeconds = (Date.now() - new Date(updateTime).getTime()) / 1000;

    if (ageSeconds > 35) {
      return { reliable: false, status: 'GPS Unavailable', warn: `Signal lost (${Math.round(ageSeconds)}s ago)` };
    }
    if (ageSeconds > 12) {
      return { reliable: false, status: 'GPS Reconnecting', warn: `Signal delayed (${Math.round(ageSeconds)}s ago)` };
    }
    if (accuracy !== null && accuracy > 25.0) {
      return { reliable: false, status: 'GPS Signal Unreliable', warn: `Accuracy ±${accuracy.toFixed(1)}m exceeds 25m threshold` };
    }
    return { reliable: true, status: 'GPS Connected', warn: null };
  }, []);

  // Update local coordinates and broadcast to backend if autoRecord is active
  const applyFix = useCallback((fix) => {
    if (!mountedRef.current) return;
    const { latitude, longitude, accuracy, speed, heading, timestamp, fixSource } = fix;
    const nowIso = timestamp || new Date().toISOString();
    lastUpdateRef.current = nowIso;

    const evaluation = evaluateReliability(accuracy, nowIso);

    const newCoords = {
      latitude: latitude !== null ? Number(latitude) : null,
      longitude: longitude !== null ? Number(longitude) : null,
      accuracy: accuracy !== null ? Number(accuracy) : null,
      speed: speed !== null && speed >= 0 ? Number(speed) : null,
      heading: heading !== null ? Number(heading) : null,
      timestamp: nowIso,
    };

    setCoords(newCoords);
    setIsReliable(evaluation.reliable);
    setGpsStatus(evaluation.status);
    setWarning(evaluation.warn);

    if (onLocationUpdate) {
      onLocationUpdate(newCoords);
    }
  }, [evaluateReliability, onLocationUpdate]);

  // Handle Browser Geolocation source
  useEffect(() => {
    mountedRef.current = true;
    if (!active) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (activeSource === 'browser') {
      if (!('geolocation' in navigator)) {
        setGpsStatus('GPS Unavailable');
        setIsReliable(false);
        setWarning('Geolocation API is not supported in this browser.');
        return;
      }

      setGpsStatus('GPS Reconnecting');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!mountedRef.current) return;
          const speedKmh = pos.coords.speed !== null && pos.coords.speed >= 0
            ? Math.round(pos.coords.speed * 3.6)
            : null;

          applyFix({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: speedKmh,
            heading: pos.coords.heading,
            timestamp: new Date(pos.timestamp).toISOString(),
            fixSource: 'browser',
          });
        },
        (err) => {
          if (!mountedRef.current) return;
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatus('GPS Permission Denied');
            setIsReliable(false);
            setWarning('Browser location permission was denied. Enable location permissions in browser settings.');
            api.updateGPSStatus({ vehicle_id: vehicleId, status: 'GPS Permission Denied' }).catch(() => {});
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setGpsStatus('GPS Unavailable');
            setIsReliable(false);
            setWarning('Position unavailable from GPS receiver/network provider.');
          } else if (err.code === err.TIMEOUT) {
            setGpsStatus('GPS Reconnecting');
            setIsReliable(false);
            setWarning('GPS fix request timed out. Reconnecting...');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Backend Telemetry Polling (USB Serial, Edge Device, or Mobile Sync)
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const pollBackendGPS = async () => {
        try {
          const res = await api.getGPSStatus(vehicleId);
          if (res && mountedRef.current) {
            if (res.latitude !== null && res.longitude !== null) {
              applyFix({
                latitude: res.latitude,
                longitude: res.longitude,
                accuracy: res.accuracy,
                speed: res.speed,
                heading: null,
                timestamp: res.last_update,
                fixSource: activeSource,
              });
            } else {
              setGpsStatus(res.status || 'GPS Unavailable');
              setIsReliable(false);
              setWarning(res.warning || 'No active telemetry fix from edge device.');
            }
          }
        } catch {
          if (mountedRef.current) {
            setGpsStatus('GPS Unavailable');
            setIsReliable(false);
            setWarning('Backend GPS service unreachable.');
          }
        }
      };

      pollBackendGPS();
      pollTimerRef.current = setInterval(pollBackendGPS, 4000);
    }

    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [active, activeSource, vehicleId, applyFix]);

  // Periodic Auto-Recording to Backend Database
  useEffect(() => {
    if (!active || !autoRecord || coords.latitude === null || coords.longitude === null) {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      return;
    }

    recordTimerRef.current = setInterval(() => {
      if (coords.latitude !== null && coords.longitude !== null) {
        api.recordGPS({
          vehicle_id: vehicleId,
          session_id: sessionId || 'live-session',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          source: activeSource,
          timestamp: new Date().toISOString(),
          status: gpsStatus,
        }).catch((err) => console.warn('GPS auto-record note:', err.message));
      }
    }, recordIntervalMs);

    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, [active, autoRecord, coords, vehicleId, sessionId, activeSource, gpsStatus, recordIntervalMs]);

  // Manual one-off record trigger
  const recordFixNow = useCallback(async (customSessId) => {
    if (coords.latitude === null || coords.longitude === null) {
      throw new Error('No GPS fix available to record.');
    }
    return api.recordGPS({
      vehicle_id: vehicleId,
      session_id: customSessId || sessionId || 'live-session',
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed || 0,
      source: activeSource,
      timestamp: new Date().toISOString(),
      status: gpsStatus,
    });
  }, [coords, vehicleId, sessionId, activeSource, gpsStatus]);

  return {
    ...coords,
    gpsStatus,
    isReliable,
    warning,
    activeSource,
    setActiveSource,
    recordFixNow,
  };
}
