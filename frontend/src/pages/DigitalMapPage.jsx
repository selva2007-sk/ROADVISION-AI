import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { createDamageIcon, createVehicleIcon } from '../utils/mapUtils';

// Helper component to smoothly center map
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function DigitalMapPage({
  dashboard,
  detections = [],
}) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Default coordinates centered on vehicle or city center
  const defaultCenter = [dashboard.latitude || 12.973, dashboard.longitude || 77.598];
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(14);

  // Inspected road segments corridor polyline
  const roadSegments = [
    [12.9716, 77.5946],
    [12.9725, 77.5954],
    [12.9738, 77.5968],
    [12.9752, 77.5982],
    [12.9765, 77.6001],
    [12.9778, 77.6025],
    [12.9790, 77.6048],
  ];

  // Filter detections based on user selection
  const filteredDetections = useMemo(() => {
    return detections.filter((d) => {
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && d.review_status !== statusFilter) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const seg = (d.road_segment || '').toLowerCase();
        const cat = d.category.toLowerCase();
        if (!seg.includes(query) && !cat.includes(query)) return false;
      }
      return true;
    });
  }, [detections, severityFilter, categoryFilter, statusFilter, searchQuery]);

  const handleCenterVehicle = () => {
    setMapCenter([dashboard.latitude || 12.979, dashboard.longitude || 77.6048]);
    setMapZoom(16);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search road or damage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">All Severities</option>
              <option value="High">High (Red)</option>
              <option value="Medium">Medium (Orange)</option>
              <option value="Low">Low (Yellow)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="all">All Hazards</option>
              <option value="pothole">Potholes</option>
              <option value="longitudinal_crack">Longitudinal Cracks</option>
              <option value="transverse_crack">Transverse Cracks</option>
              <option value="alligator_crack">Alligator Cracks</option>
              <option value="damaged_surface">Damaged Surface</option>
            </select>
          </div>

          {/* Quick Center Vehicle */}
          <button
            onClick={handleCenterVehicle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition"
          >
            <Compass size={14} />
            <span>Center on Vehicle</span>
          </button>
        </div>
      </div>

      {/* Main Map Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm relative">
        <div className="h-[620px] w-full rounded-xl overflow-hidden border border-slate-200 relative">
          <MapContainer
            center={defaultCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {/* Inspected Road Segment Polyline Layer */}
            <Polyline
              positions={roadSegments}
              pathOptions={{
                color: '#2563EB',
                weight: 5,
                opacity: 0.75,
              }}
            />

            {/* Live Vehicle Marker */}
            <Marker
              position={[dashboard.latitude || 12.979, dashboard.longitude || 77.6048]}
              icon={createVehicleIcon()}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-blue-600 flex items-center gap-1">
                    <Navigation size={13} />
                    <span>Active Vehicle RV-1001</span>
                  </div>
                  <div>Speed: {dashboard.speed_kmh || 32} km/h</div>
                  <div>Coordinates: {Number(dashboard.latitude).toFixed(4)}, {Number(dashboard.longitude).toFixed(4)}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">● Connected to Live Camera</div>
                </div>
              </Popup>
            </Marker>

            {/* Damage Hazard Markers */}
            {filteredDetections.map((det) => (
              <Marker
                key={det.id || det.detection_id}
                position={[det.latitude, det.longitude]}
                icon={createDamageIcon(det.severity)}
              >
                <Popup maxWidth={280}>
                  <div className="p-2 space-y-2 text-xs">
                    {/* Optional Evidence Image Thumbnail */}
                    <div className="rounded-lg overflow-hidden bg-slate-900 aspect-video relative">
                      <img
                        src={det.evidence_image || '/pothole_dashcam.jpg'}
                        alt={det.category}
                        className="w-full h-full object-cover"
                      />
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        det.severity === 'High' ? 'bg-red-600 text-white' :
                        det.severity === 'Medium' ? 'bg-orange-500 text-white' : 'bg-yellow-500 text-slate-900'
                      }`}>
                        {det.severity} Severity
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-sm capitalize">
                        {det.category.replace('_', ' ')}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {det.road_segment || 'Highway Corridor'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400">Confidence:</span>
                        <div className="font-semibold text-slate-800">{(det.confidence * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Review Status:</span>
                        <div className="font-semibold text-slate-800 capitalize">{det.review_status?.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {det.latitude.toFixed(4)}, {det.longitude.toFixed(4)}
                      </span>
                      {/* Direct Google Maps Navigation Link */}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${det.latitude},${det.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                      >
                        <span>Directions</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Map Legend */}
          <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-md border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" />
              <span>Map Layers & Legend</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
                <span>High Severity Damage (Potholes, Deep Cracks)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
                <span>Medium Severity (Longitudinal & Web Cracks)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0"></span>
                <span>Low Severity (Surface Deterioration)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
                <span>Active Vehicle Position</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-100">
                <span className="w-4 h-1 bg-blue-600 shrink-0 rounded"></span>
                <span>Blue Line: Verified Inspected Roads Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
