// In production on Vercel, /api is routed to api/index.py or to external VITE_API_URL.
// For local development, it proxies via vite.config.js or falls back to VITE_API_URL.
const rawApiBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApiBase.replace(/\/+$/, '');

/**
 * Standardized API client for RoadVision AI backend
 */
export async function apiFetch(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText || res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[RoadVision API] Request to ${endpoint} failed:`, err.message);
    throw err;
  }
}

export const api = {
  // Health & System
  getHealth: () => apiFetch('/health'),
  getDashboard: () => apiFetch('/dashboard'),

  // Vehicles
  getVehicles: () => apiFetch('/vehicles'),
  createVehicle: (data) => apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(data) }),

  // Sessions
  getSessions: () => apiFetch('/sessions'),
  createSession: (data) => apiFetch('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (sessionId, data) => apiFetch(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Detections
  getDetections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/detections${query ? `?${query}` : ''}`);
  },
  createDetection: (data) => apiFetch('/detections', { method: 'POST', body: JSON.stringify(data) }),
  updateDetection: (id, data) => apiFetch(`/detections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDetection: (id) => apiFetch(`/detections/${id}`, { method: 'DELETE' }),

  // Reports & Repair Tracking
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/reports${query ? `?${query}` : ''}`);
  },
  createReport: (data) => apiFetch('/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id, data) => apiFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // GPS Telemetry & Tracking
  getGPS: (sessionId, vehicleId) => {
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId);
    if (vehicleId) params.append('vehicle_id', vehicleId);
    const q = params.toString();
    return apiFetch(`/gps${q ? `?${q}` : ''}`);
  },
  recordGPS: (data) => apiFetch('/gps', { method: 'POST', body: JSON.stringify(data) }),
  getGPSStatus: (vehicleId) => apiFetch(`/gps/status${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  updateGPSStatus: (data) => apiFetch('/gps/status', { method: 'POST', body: JSON.stringify(data) }),
  getGPSTracks: (sessionId, vehicleId) => {
    const params = new URLSearchParams();
    if (sessionId) params.append('session_id', sessionId);
    if (vehicleId) params.append('vehicle_id', vehicleId);
    const q = params.toString();
    return apiFetch(`/gps/tracks${q ? `?${q}` : ''}`);
  },
  sendNMEA: (data) => apiFetch('/gps/nmea', { method: 'POST', body: JSON.stringify(data) }),

  // Digital Road Map & Segments
  getMapMarkers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/map/markers${query ? `?${query}` : ''}`);
  },
  getMapSegments: (sessionId) => apiFetch(`/map/segments${sessionId ? `?session_id=${sessionId}` : ''}`),

  // Camera Status
  getCameraStatus: () => apiFetch('/camera-status'),
  updateCameraStatus: (data) => apiFetch('/camera-status', { method: 'POST', body: JSON.stringify(data) }),

  // AI Inference
  detectFrame: (data) => apiFetch('/ai/detect', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAnalytics: () => apiFetch('/analytics'),

  // Seed Demo
  seedDemo: () => apiFetch('/demo/seed', { method: 'POST' }),

  // User Profile & Roles
  getProfile: () => apiFetch('/profile'),
  updateProfile: (data) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/profile/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getRoles: () => apiFetch('/roles'),

  // CSV Export URL
  getExportCsvUrl: () => `${API_BASE}/export/csv`,
};
