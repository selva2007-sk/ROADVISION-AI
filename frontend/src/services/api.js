// Configurable backend base URL: reads VITE_API_BASE_URL or VITE_API_URL
const rawApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApiBase.replace(/\/+$/, '');

export const getApiBaseUrl = () => API_BASE;

/**
 * Standardized API client for RoadVision AI backend
 */
export async function apiFetch(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  // Retrieve auth token from localStorage if present
  const token = typeof window !== 'undefined' ? localStorage.getItem('roadvision_token') : null;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...authHeaders,
      ...options.headers,
    },
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      if (res.status === 401) {
        console.warn(`[RoadVision API] 401 Unauthorized for ${endpoint}`);
      }
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error || jsonErr.message || errText;
      } catch {
        // use raw text
      }
      throw new Error(`API Error ${res.status}: ${parsedErr || res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[RoadVision API] Request to ${endpoint} failed:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication & Session
  login: async (credentials) => {
    const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('roadvision_token', res.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('roadvision_token');
      }
    }
  },
  getCurrentUser: () => apiFetch('/auth/me'),

  // Health & System Status
  getHealth: () => apiFetch('/health'),
  getDashboard: () => apiFetch('/dashboard'),

  // Vehicles Management
  getVehicles: () => apiFetch('/vehicles'),
  getVehicle: (vehicleId) => apiFetch(`/vehicles/${vehicleId}`),
  createVehicle: (data) => apiFetch('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (vehicleId, data) => apiFetch(`/vehicles/${vehicleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getVehicleHistory: (vehicleId) => apiFetch(`/vehicles/${vehicleId}/history`),

  // Inspection Sessions Lifecycle
  getSessions: () => apiFetch('/sessions'),
  getSession: (sessionId) => apiFetch(`/sessions/${sessionId}`),
  createSession: (data) => apiFetch('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (sessionId, data) => apiFetch(`/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  startSession: (sessionId) => apiFetch(`/sessions/${sessionId}/start`, { method: 'POST' }),
  pauseSession: (sessionId) => apiFetch(`/sessions/${sessionId}/pause`, { method: 'POST' }),
  resumeSession: (sessionId) => apiFetch(`/sessions/${sessionId}/resume`, { method: 'POST' }),
  stopSession: (sessionId) => apiFetch(`/sessions/${sessionId}/stop`, { method: 'POST' }),
  getSessionSummary: (sessionId) => apiFetch(`/sessions/${sessionId}/summary`),

  // AI Detections
  getDetections: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/detections${query ? `?${query}` : ''}`);
  },
  getDetection: (id) => apiFetch(`/detections/${id}`),
  createDetection: (data) => apiFetch('/detections', { method: 'POST', body: JSON.stringify(data) }),
  updateDetection: (id, data) => apiFetch(`/detections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDetection: (id) => apiFetch(`/detections/${id}`, { method: 'DELETE' }),

  // Damage Reports & Repair Tracking
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/reports${query ? `?${query}` : ''}`);
  },
  getReport: (id) => apiFetch(`/reports/${id}`),
  createReport: (data) => apiFetch('/reports', { method: 'POST', body: JSON.stringify(data) }),
  updateReport: (id, data) => apiFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteReport: (id) => apiFetch(`/reports/${id}`, { method: 'DELETE' }),
  getReportHistory: (reportId) => apiFetch(`/reports/${reportId}/history`),
  getDetectionRepairHistory: (detectionId) => apiFetch(`/reports/history/${detectionId}`),
  uploadReportEvidence: (reportId, data) => apiFetch(`/reports/${reportId}/evidence`, { method: 'POST', body: JSON.stringify(data) }),

  // Secure File & Evidence Uploads
  uploadFile: (formData) => apiFetch('/upload', { method: 'POST', body: formData }),

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

  // Digital Road Map & Inspected Segments
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

  // Analytics & Aggregates
  getAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/analytics${query ? `?${query}` : ''}`);
  },

  // Seed Demo Dataset
  seedDemo: () => apiFetch('/demo/seed', { method: 'POST' }),

  // User Profile & Roles
  getProfile: () => apiFetch('/profile'),
  updateProfile: (data) => apiFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => apiFetch('/profile/change-password', { method: 'POST', body: JSON.stringify(data) }),
  getRoles: () => apiFetch('/roles'),

  // CSV Export URL
  getExportCsvUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/export/csv${query ? `?${query}` : ''}`;
  },
};
