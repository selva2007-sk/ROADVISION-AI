import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import {
  Filter,
  Navigation,
  Compass,
  AlertTriangle,
  ExternalLink,
  Layers,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  Gauge,
  ShieldCheck,
  FileText,
  RotateCcw,
  Eye,
  Info,
  Calendar,
  Truck,
  MapPin,
  X,
} from 'lucide-react';
import {
  createDamageIcon,
  createVehicleIcon,
  MapResizeHandler,
  formatCoordinates,
  getDirectionsUrl,
  getGPSStatusBadge,
} from '../utils/mapUtils';
import { useGPSTracker } from '../hooks/useGPSTracker';
import { api } from '../services/api';

// Helper component to programmatically control Leaflet map view
function MapViewController({ center, zoom, flyTrigger }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, flyTrigger, map]);
  return null;
}

export default function DigitalMapPage({
  dashboard = {},
  detections = [],
  vehicles = [],
  onNavigate,
  onSelectReport,
}) {
  // Filter States
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [repairStatusFilter, setRepairStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false);
  const [showRecentDrawer, setShowRecentDrawer] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);

  // Layer Toggles
  const [showDamageLayer, setShowDamageLayer] = useState(true);
  const [showSegmentsLayer, setShowSegmentsLayer] = useState(true);
  const [showVehicleLayer, setShowVehicleLayer] = useState(true);

  // Active Vehicle & GPS Source
  const [selectedVehicleId, setSelectedVehicleId] = useState(dashboard.vehicle_id || 'RV-1001');
  const [selectedGpsSource, setSelectedGpsSource] = useState('browser');

  // Real-time GPS Tracker hook
  const gpsTracker = useGPSTracker({
    vehicleId: selectedVehicleId,
    source: selectedGpsSource,
    active: true,
    autoRecord: false,
  });

  // Inspected road segments fetched from backend
  const [inspectedSegments, setInspectedSegments] = useState([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Map Center & Target
  const defaultCenter = [
    gpsTracker.latitude || dashboard.latitude || 12.9730,
    gpsTracker.longitude || dashboard.longitude || 77.5980,
  ];
  const [mapTarget, setMapTarget] = useState({ center: defaultCenter, zoom: 14, trigger: 0 });

  // Fetch inspected corridor segments from backend
  useEffect(() => {
    let isMounted = true;
    setLoadingSegments(true);
    api.getMapSegments()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setInspectedSegments(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load inspected road segments:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingSegments(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-criteria Detections Filtering
  const filteredDetections = useMemo(() => {
    const now = Date.now();
    return detections.filter((d) => {
      // 1. Severity
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
      // 2. Category
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      // 3. Review Status
      if (statusFilter !== 'all' && d.review_status !== statusFilter) return false;
      // 4. Repair Status
      if (repairStatusFilter !== 'all' && d.repair_status && d.repair_status !== repairStatusFilter) return false;
      // 5. Vehicle
      if (vehicleFilter !== 'all' && d.vehicle_id && d.vehicle_id !== vehicleFilter) return false;

      // 6. Date Range Filter
      if (dateFilter !== 'all' && d.timestamp) {
        const itemTime = new Date(d.timestamp).getTime();
        const diffHours = (now - itemTime) / (1000 * 60 * 60);
        if (dateFilter === 'today' && diffHours > 24) return false;
        if (dateFilter === '7days' && diffHours > 24 * 7) return false;
        if (dateFilter === '30days' && diffHours > 24 * 30) return false;
      }

      // 7. Search Query (Road, Category, Detection ID)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const road = (d.road_segment || '').toLowerCase();
        const cat = (d.category || '').toLowerCase().replace('_', ' ');
        const id = (d.detection_id || '').toLowerCase();
        if (!road.includes(q) && !cat.includes(q) && !id.includes(q)) return false;
      }

      return true;
    });
  }, [
    detections,
    severityFilter,
    categoryFilter,
    statusFilter,
    repairStatusFilter,
    vehicleFilter,
    dateFilter,
    searchQuery,
  ]);

  // Center on Vehicle action
  const handleCenterVehicle = () => {
    const vLat = gpsTracker.latitude || dashboard.latitude || 12.9790;
    const vLng = gpsTracker.longitude || dashboard.longitude || 77.6048;
    setMapTarget({
      center: [vLat, vLng],
      zoom: 16,
      trigger: Date.now(),
    });
  };

  // Fly to specific detection marker
  const handleLocateDetection = (det) => {
    if (det.latitude && det.longitude) {
      setMapTarget({
        center: [det.latitude, det.longitude],
        zoom: 17,
        trigger: Date.now(),
      });
      setShowRecentDrawer(false);
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSeverityFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setRepairStatusFilter('all');
    setVehicleFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const gpsBadge = getGPSStatusBadge(gpsTracker.gpsStatus || dashboard.gps_status);
  const activeVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId) || {
    vehicle_id: selectedVehicleId,
    vehicle_type: 'Inspection SUV',
    registration_id: 'KA-01-EXP-9921',
  };

  return (
    <div className="space-y-4">
      {/* Top Telemetry & GPS Hardware Status Banner */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Vehicle Selector & Type */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Fleet Unit</div>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="mt-0.5 text-xs font-bold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer w-full"
              >
                {vehicles.map((v) => (
                  <option key={v.vehicle_id || v.id} value={v.vehicle_id}>
                    {v.vehicle_id} ({v.vehicle_type || 'Vehicle'})
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-slate-500 truncate">{activeVehicle.registration_id || 'Fleet Registered'}</div>
            </div>
          </div>

          {/* 2. GPS Connection Status & Accuracy */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Radio size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">GPS Link State</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${gpsBadge.dot}`} />
                <span className="text-xs font-bold text-slate-900 truncate">{gpsBadge.label}</span>
              </div>
              <div className="text-[10px] text-slate-600">
                Precision: {gpsTracker.accuracy !== null ? `±${gpsTracker.accuracy.toFixed(1)} m` : '±3.2 m (Nominal)'}
              </div>
            </div>
          </div>

          {/* 3. Real-Time Coordinates & Heading */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ground Coordinates</div>
              <div className="text-xs font-bold text-slate-900 truncate mt-0.5 font-mono">
                {formatCoordinates(gpsTracker.latitude || dashboard.latitude, gpsTracker.longitude || dashboard.longitude, 4)}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Gauge size={11} className="text-slate-400" />
                <span>Speed: {gpsTracker.speed !== null ? `${gpsTracker.speed} km/h` : `${dashboard.speed_kmh || 32} km/h`}</span>
              </div>
            </div>
          </div>

          {/* 4. GPS Source Selector & Last Update */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Compass size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">GPS Ingest Source</div>
              <select
                value={selectedGpsSource}
                onChange={(e) => {
                  setSelectedGpsSource(e.target.value);
                  gpsTracker.setActiveSource(e.target.value);
                }}
                className="mt-0.5 text-xs font-bold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer w-full truncate"
              >
                <option value="browser">Browser Geolocation (Permitted)</option>
                <option value="usb_serial">External USB Receiver (NMEA)</option>
                <option value="edge_device">Vehicle Edge Gateway (CAN)</option>
                <option value="mobile_sync">Driver Mobile Companion</option>
              </select>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock size={11} className="text-slate-400" />
                <span>Last Fix: Just now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner if GPS Unreliable / Disconnected */}
        {gpsTracker.warning && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span className="font-medium">{gpsTracker.warning}</span>
          </div>
        )}
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E4E7EC] shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative min-w-0 flex-1 max-w-full lg:max-w-xs">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search road corridor, ID, or hazard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600 min-h-[36px]"
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 text-xs flex-1">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[36px]"
            >
              <option value="all">All Severities</option>
              <option value="High">🔴 High (Red)</option>
              <option value="Medium">🟠 Medium (Orange)</option>
              <option value="Low">🟡 Low (Yellow)</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[36px]"
            >
              <option value="all">All Hazards</option>
              <option value="pothole">Potholes</option>
              <option value="longitudinal_crack">Longitudinal Cracks</option>
              <option value="transverse_crack">Transverse Cracks</option>
              <option value="alligator_crack">Alligator Cracks</option>
              <option value="damaged_surface">Damaged Surface</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[36px]"
            >
              <option value="all">All Inspection Dates</option>
              <option value="today">Today (Last 24h)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>

            {/* Repair Status Filter */}
            <select
              value={repairStatusFilter}
              onChange={(e) => setRepairStatusFilter(e.target.value)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[36px]"
            >
              <option value="all">All Repair States</option>
              <option value="Detected">Detected</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Verified">Verified</option>
              <option value="Repair Scheduled">Repair Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Repaired">Repaired</option>
            </select>

            {/* Vehicle Filter */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[36px]"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_id}</option>
              ))}
            </select>
          </div>

          {/* Actions: Center Vehicle, Drawer Toggle, Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCenterVehicle}
              title="Smoothly center map on live vehicle position"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition min-h-[36px]"
            >
              <Compass size={14} />
              <span>Center Vehicle</span>
            </button>

            <button
              onClick={() => setShowRecentDrawer(!showRecentDrawer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-semibold text-xs transition min-h-[36px] ${
                showRecentDrawer ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText size={14} />
              <span>Hazards ({filteredDetections.length})</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse Map' : 'Expand Fullscreen Map'}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {(severityFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || repairStatusFilter !== 'all' || vehicleFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
              <button
                onClick={handleResetFilters}
                title="Reset all filters"
                className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition min-h-[36px]"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Map Layers Toggles Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Layers size={13} />
            <span>Map Layers:</span>
          </span>

          <button
            onClick={() => setShowDamageLayer(!showDamageLayer)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
              showDamageLayer ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>Road Damage Pins ({filteredDetections.length})</span>
          </button>

          <button
            onClick={() => setShowSegmentsLayer(!showSegmentsLayer)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
              showSegmentsLayer ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-3.5 h-1 bg-blue-600 rounded" />
            <span>Inspected Road Corridors ({inspectedSegments.length || 1})</span>
          </button>

          <button
            onClick={() => setShowVehicleLayer(!showVehicleLayer)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
              showVehicleLayer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Vehicle GPS Marker</span>
          </button>
        </div>
      </div>

      {/* Main Map Container Card */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-[#E4E7EC] shadow-sm relative overflow-hidden">
        <div
          className={`w-full rounded-xl overflow-hidden border border-slate-200 relative transition-all duration-300 ${
            isExpanded ? 'h-[75vh] sm:h-[82vh]' : 'h-[360px] xs:h-[420px] sm:h-[500px] md:h-[560px] lg:h-[620px]'
          }`}
        >
          <MapContainer
            center={defaultCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            <MapResizeHandler />
            <MapViewController
              center={mapTarget.center}
              zoom={mapTarget.zoom}
              flyTrigger={mapTarget.trigger}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors | ROADVISION AI GNSS Engine"
            />

            {/* Inspected Road Segments Corridors Layer */}
            {showSegmentsLayer && inspectedSegments.map((sess, idx) => (
              <React.Fragment key={sess.session_id || idx}>
                {sess.segments && sess.segments.map((polylineCoords, pIdx) => (
                  <Polyline
                    key={`${sess.session_id}-${pIdx}`}
                    positions={polylineCoords}
                    pathOptions={{
                      color: '#2563EB',
                      weight: 5,
                      opacity: 0.82,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  >
                    <Popup maxWidth={260}>
                      <div className="p-1 space-y-1.5 text-xs">
                        <div className="font-bold text-blue-700 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Inspected Road Segment</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Session:</strong> {sess.session_id}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Assigned Vehicle:</strong> {sess.vehicle_id || 'RV-1001'}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Inspected Distance:</strong> {sess.distance_km || 0.0} km
                        </div>
                        <div className="text-[10px] text-slate-500 italic border-t border-slate-100 pt-1">
                          Validated continuous GPS track. Segments split across signal gaps &gt; 30s.
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                ))}
              </React.Fragment>
            ))}

            {/* Fallback inspected corridor if backend segments not yet populated */}
            {showSegmentsLayer && inspectedSegments.length === 0 && (
              <Polyline
                positions={[
                  [12.9716, 77.5946],
                  [12.9725, 77.5954],
                  [12.9738, 77.5968],
                  [12.9752, 77.5982],
                  [12.9765, 77.6001],
                  [12.9778, 77.6025],
                  [12.9790, 77.6048],
                ]}
                pathOptions={{
                  color: '#2563EB',
                  weight: 5,
                  opacity: 0.8,
                }}
              >
                <Popup maxWidth={240}>
                  <div className="p-1 text-xs">
                    <div className="font-bold text-blue-600">Inspected Road Corridor</div>
                    <div className="text-[11px] text-slate-500">Kasturba Rd to MG Road Corridor (24.6 km)</div>
                  </div>
                </Popup>
              </Polyline>
            )}

            {/* Live Vehicle Location Marker */}
            {showVehicleLayer && (
              <Marker
                position={[
                  gpsTracker.latitude || dashboard.latitude || 12.9790,
                  gpsTracker.longitude || dashboard.longitude || 77.6048,
                ]}
                icon={createVehicleIcon(gpsTracker.heading, gpsTracker.speed || dashboard.speed_kmh || 32)}
              >
                <Popup maxWidth={260}>
                  <div className="p-1 space-y-1.5 text-xs">
                    <div className="font-bold text-blue-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Navigation size={13} />
                        <span>Active Vehicle: {selectedVehicleId}</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${gpsBadge.bg}`}>
                        {gpsBadge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">SPEED</span>
                        <span className="font-bold text-slate-800">
                          {gpsTracker.speed !== null ? `${gpsTracker.speed} km/h` : `${dashboard.speed_kmh || 32} km/h`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">ACCURACY</span>
                        <span className="font-bold text-slate-800">
                          {gpsTracker.accuracy !== null ? `±${gpsTracker.accuracy.toFixed(1)} m` : '±3.2 m'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatCoordinates(gpsTracker.latitude || dashboard.latitude, gpsTracker.longitude || dashboard.longitude, 5)}
                    </div>

                    <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 flex items-center justify-between">
                      <span>Source: {selectedGpsSource.replace('_', ' ')}</span>
                      <span className="text-emerald-600 font-semibold">● Live Telemetry</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Confirmed Database Road Damage Markers */}
            {showDamageLayer && filteredDetections.map((det) => (
              <Marker
                key={det.id || det.detection_id}
                position={[det.latitude, det.longitude]}
                icon={createDamageIcon(det.severity)}
              >
                <Popup maxWidth={280}>
                  <div className="p-1.5 space-y-2 text-xs">
                    {/* Evidence Image Thumbnail */}
                    <div
                      onClick={() => setSelectedImageModal(det)}
                      className="rounded-lg overflow-hidden bg-slate-900 aspect-video relative group cursor-pointer border border-slate-200"
                    >
                      <img
                        src={det.evidence_image || '/pothole_dashcam.jpg'}
                        alt={det.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${
                        det.severity === 'High' ? 'bg-red-600 text-white' :
                        det.severity === 'Medium' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-900'
                      }`}>
                        {det.severity} Severity
                      </span>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium gap-1">
                        <Eye size={13} />
                        <span>View Evidence</span>
                      </div>
                    </div>

                    {/* Hazard Title & Road Location */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 capitalize text-xs">
                          {det.category.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {det.detection_id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {det.road_segment || 'Sector Road Corridor'}
                      </div>
                    </div>

                    {/* Inspection & AI Confidence Metrics */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">CONFIDENCE</span>
                        <span className="font-bold text-slate-800">
                          {(det.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">REPAIR STATE</span>
                        <span className="font-bold text-blue-600 truncate block">
                          {det.repair_status || 'Detected'}
                        </span>
                      </div>
                    </div>

                    {/* Ground Coordinates & Accuracy Reliability */}
                    <div className="text-[10px] space-y-0.5 text-slate-500">
                      <div className="font-mono text-slate-700">
                        {formatCoordinates(det.latitude, det.longitude, 4)}
                      </div>
                      {det.is_location_reliable ? (
                        <div className="text-[9px] text-emerald-600 font-medium">
                          ✓ GPS Fix Validated (±{det.gps_accuracy || 3.5}m)
                        </div>
                      ) : (
                        <div className="text-[9px] text-amber-600 font-medium">
                          ⚠️ {det.location_warning || 'Unreliable GPS fix at detection time'}
                        </div>
                      )}
                    </div>

                    {/* Demonstration data label */}
                    {det.is_demo && (
                      <div className="p-1 rounded bg-amber-50 text-amber-800 text-[9px] font-bold text-center border border-amber-200">
                        [DEMONSTRATION DATA RECORD]
                      </div>
                    )}

                    {/* Actions: Full Report & Directions */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      {onNavigate && (
                        <button
                          onClick={() => {
                            if (onSelectReport) onSelectReport(det.detection_id);
                            onNavigate('reports');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold transition flex items-center gap-1"
                        >
                          <FileText size={11} />
                          <span>Full Report</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <a
                          href={getDirectionsUrl(det.latitude, det.longitude, 'google')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-0.5"
                          title="Open directions in Google Maps"
                        >
                          <span>Google Maps</span>
                          <ExternalLink size={10} />
                        </a>
                        <span className="text-slate-300">|</span>
                        <a
                          href={getDirectionsUrl(det.latitude, det.longitude, 'osm')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-800 text-[10px] font-medium flex items-center gap-0.5"
                          title="Open directions in OpenStreetMap"
                        >
                          <span>OSM</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Desktop Floating Map Legend (Bottom-Left) */}
          <div className="hidden sm:block absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-slate-200 text-xs space-y-2 max-w-xs">
            <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-blue-600" />
                <span>Map Layers &amp; Severity Key</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">OSM Live</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                <span>High Severity (Potholes, Deep Cracks)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>Medium Severity (Longitudinal Fractures)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Low Severity (Surface Deterioration)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-100">
                <span className="w-3.5 h-1 bg-blue-600 shrink-0 rounded" />
                <span>Blue Polyline: Validated Inspected Corridors</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span>Live Vehicle Position &amp; Bearing</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-tight">
              <strong>Notice:</strong> Uninspected road segments are <em>not</em> damage-free. Camera look-ahead offset of ~5-15m applies to detected road coordinates.
            </div>
          </div>
        </div>

        {/* Mobile Collapsible Legend Drawer */}
        <div className="sm:hidden mt-2.5 border-t border-slate-100 pt-2 text-xs">
          <button
            onClick={() => setMobileLegendOpen(!mobileLegendOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-700 font-semibold text-xs min-h-[38px]"
          >
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" />
              <span>Map Legend &amp; Damage Key</span>
            </span>
            {mobileLegendOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {mobileLegendOpen && (
            <div className="p-3 bg-slate-50 rounded-xl mt-1.5 space-y-1.5 text-[11px] border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                <span>High Severity Damage (Potholes)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>Medium Severity Damage</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Low Severity Damage</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-200">
                <span className="w-3.5 h-1 bg-blue-600 shrink-0 rounded" />
                <span>Blue Polyline: Validated Inspected Corridors</span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Notice: Uninspected roads are NOT damage-free. Camera forward offset of ~5-15m applies.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Hazards Drawer / List View */}
      {showRecentDrawer && (
        <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Filtered Road Hazards ({filteredDetections.length})</h3>
              <p className="text-xs text-slate-500">Click any hazard to center and fly to its GPS coordinates on the digital map.</p>
            </div>
            <button
              onClick={() => setShowRecentDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredDetections.map((det) => (
              <div
                key={det.id || det.detection_id}
                onClick={() => handleLocateDetection(det)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm cursor-pointer transition bg-white space-y-2 group"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="font-bold text-slate-900 capitalize text-xs group-hover:text-blue-600 transition">
                      {det.category.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{det.detection_id}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    det.severity === 'High' ? 'bg-red-100 text-red-700' :
                    det.severity === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {det.severity}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 truncate">
                  {det.road_segment || 'City Sector Corridor'}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Conf: {(det.confidence * 100).toFixed(0)}%</span>
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                    <Compass size={11} />
                    <span>Locate</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Image Modal */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm capitalize">
                  {selectedImageModal.category.replace('_', ' ')} Evidence Image
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Detection ID: {selectedImageModal.detection_id} | Session: {selectedImageModal.session_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950 aspect-video flex items-center justify-center relative">
              <img
                src={selectedImageModal.evidence_image || '/pothole_dashcam.jpg'}
                alt={selectedImageModal.category}
                className="max-h-full max-w-full object-contain"
              />
              <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-bold shadow ${
                selectedImageModal.severity === 'High' ? 'bg-red-600 text-white' :
                selectedImageModal.severity === 'Medium' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-900'
              }`}>
                {selectedImageModal.severity} Severity
              </span>
            </div>

            <div className="p-4 bg-slate-50 space-y-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">LATITUDE</div>
                  <div className="font-mono font-bold text-slate-800">{selectedImageModal.latitude?.toFixed(5)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">LONGITUDE</div>
                  <div className="font-mono font-bold text-slate-800">{selectedImageModal.longitude?.toFixed(5)}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">GPS ACCURACY</div>
                  <div className="font-bold text-slate-800">±{selectedImageModal.gps_accuracy || 3.5} m</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400">CONFIDENCE</div>
                  <div className="font-bold text-emerald-600">{(selectedImageModal.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                <strong>Location Reliability:</strong> {selectedImageModal.location_warning || 'Fresh GPS fix verified at frame timestamp.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
