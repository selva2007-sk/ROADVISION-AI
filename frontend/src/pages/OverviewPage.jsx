import React from 'react';
import {
  Activity,
  Navigation,
  Camera,
  AlertTriangle,
  Route,
  ShieldCheck,
  Truck,
  ArrowRight,
  ExternalLink,
  Clock,
  Eye,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import StatCard from '../components/StatCard';
import CircularLoader from '../components/loading/CircularLoader';
import { createDamageIcon, createVehicleIcon, MapResizeHandler } from '../utils/mapUtils';

export default function OverviewPage({
  dashboard,
  detections = [],
  vehicles = [],
  onNavigate,
  onVerifyDetection,
}) {
  const chartData = [
    { name: 'Mon', potholes: 5, cracks: 9 },
    { name: 'Tue', potholes: 11, cracks: 14 },
    { name: 'Wed', potholes: 8, cracks: 10 },
    { name: 'Thu', potholes: 14, cracks: 16 },
    { name: 'Fri', potholes: 12, cracks: 11 },
    { name: 'Sat', potholes: 7, cracks: 8 },
    { name: 'Sun', potholes: 4, cracks: 6 },
  ];

  // Inspected road polyline coordinates
  const roadCoordinates = [
    [12.9716, 77.5946],
    [12.9725, 77.5954],
    [12.9738, 77.5968],
    [12.9752, 77.5982],
    [12.9765, 77.6001],
    [12.9778, 77.6025],
    [12.9790, 77.6048],
  ];

  const pendingReportsCount = detections.filter(
    (d) => d.review_status === 'pending_review' || d.review_status === 'detected'
  ).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 6 Core KPI Cards (Responsive Bootstrap-Style Grid: 1 col on small phones, 2 col on large phones, 3 col on tablet, 6 col on desktop) */}
      <section className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label="Total Inspections"
          value={dashboard.inspection_count || 3}
          icon={Route}
          tone="blue"
          subtitle="All fleet runs"
        />
        <StatCard
          label="Distance Inspected"
          value={`${Number(dashboard.distance_km || 32.8).toFixed(1)} km`}
          icon={Activity}
          tone="emerald"
          subtitle="Valid GPS samples"
        />
        <StatCard
          label="Potholes Detected"
          value={dashboard.total_potholes || 8}
          icon={AlertTriangle}
          tone="rose"
          subtitle="Surface craters"
        />
        <StatCard
          label="Road Cracks"
          value={dashboard.total_cracks || 14}
          icon={Route}
          tone="amber"
          subtitle="Longitudinal & alligator"
        />
        <StatCard
          label="High-Priority Damage"
          value={dashboard.high_priority_damage || 4}
          icon={ShieldCheck}
          tone="rose"
          subtitle="Immediate repair required"
        />
        <StatCard
          label="Pending Reports"
          value={pendingReportsCount || 5}
          icon={FileText}
          tone="purple"
          subtitle="Awaiting road staff review"
        />
      </section>

      {/* Main Inspection & Live Status Split */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Live Vehicle Inspection Quick Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-900 text-sm">Active Vehicle Feed</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {dashboard.vehicle_status || 'Connected'}
              </span>
            </div>

            {/* Dashcam Preview Snapshot */}
            <div className="relative mt-3 sm:mt-4 rounded-xl overflow-hidden bg-slate-950 aspect-video group shadow-inner">
              <img
                src="/road_feed_sample.jpg"
                alt="Live Road Camera"
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.src = '/pothole_dashcam.jpg';
                }}
              />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold tracking-wider shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>LIVE FEED</span>
              </div>
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-slate-200 text-[10px] font-mono border border-white/10 truncate max-w-[calc(100%-16px)]">
                GPS: {Number(dashboard.latitude || 12.9716).toFixed(4)}, {Number(dashboard.longitude || 77.5946).toFixed(4)}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-center">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Speed</div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">{dashboard.speed_kmh || 32} km/h</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Camera</div>
                <div className="font-bold text-emerald-600 text-xs sm:text-sm mt-0.5 truncate">Connected</div>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">Duration</div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">{dashboard.session_duration || '00:18:22'}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('live-camera')}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm min-h-[42px]"
          >
            <span>Open Live Camera Station</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Digital Road Map Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Digital Road Damage Map</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Real-time GPS inspection track & damage cluster</p>
              </div>

              <div className="flex items-center gap-2 self-end xs:self-auto">
                <div className="hidden sm:flex items-center gap-2.5 text-xs pr-3 border-r border-slate-200">
                  <span className="flex items-center gap-1 text-slate-600 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span> High
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Med
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Low
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('map')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <span>Full Map</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>

            {/* Leaflet Map Preview with Automatic Size Observer */}
            <div className="h-[200px] sm:h-[260px] md:h-[300px] w-full rounded-xl overflow-hidden mt-3 sm:mt-4 border border-slate-200 relative">
              <MapContainer
                center={[dashboard.latitude || 12.973, dashboard.longitude || 77.598]}
                zoom={14}
                scrollWheelZoom={false}
                className="h-full w-full z-0"
              >
                <MapResizeHandler />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {/* Inspected Route Line */}
                <Polyline
                  positions={roadCoordinates}
                  pathOptions={{ color: '#2563EB', weight: 4, opacity: 0.75 }}
                />

                {/* Live Vehicle Marker */}
                <Marker
                  position={[dashboard.latitude || 12.979, dashboard.longitude || 77.6048]}
                  icon={createVehicleIcon()}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-bold text-blue-600">Inspection Vehicle RV-1001</div>
                      <div>Speed: {dashboard.speed_kmh || 32} km/h</div>
                      <div>Status: Live Patrolling</div>
                    </div>
                  </Popup>
                </Marker>

                {/* Road Damage Markers */}
                {detections.slice(0, 8).map((det) => (
                  <Marker
                    key={det.id || det.detection_id}
                    position={[det.latitude, det.longitude]}
                    icon={createDamageIcon(det.severity)}
                  >
                    <Popup>
                      <div className="text-xs p-1 space-y-1">
                        <div className="font-bold text-slate-900 capitalize">{det.category.replace('_', ' ')}</div>
                        <div className="text-[11px] text-slate-500">{det.road_segment || 'Urban Road'}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            det.severity === 'High' ? 'bg-red-100 text-red-700' :
                            det.severity === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {det.severity}
                          </span>
                          <span className="text-slate-600">{(det.confidence * 100).toFixed(0)}% Conf</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="mt-3 flex flex-col xs:flex-row xs:items-center justify-between text-[11px] text-slate-500 gap-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-blue-600 shrink-0"></span>
              Blue Polyline: Inspected corridor (uninspected uncolored)
            </span>
            <span className="shrink-0">Plotted points: {detections.length}</span>
          </div>
        </div>
      </section>

      {/* Scroll-Triggered JSTV Visual Perception & Telemetry Core Section */}
      <section>
        <CircularLoader />
      </section>

      {/* Recent Detections Table & Fleet Trends */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Recent Detections: Dual View (Desktop Table + Mobile Cards) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 sm:mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Damage Detections</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Verified and pending hazard captures</p>
            </div>
            <button
              onClick={() => onNavigate('detections')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Desktop Table View (>= sm screens) */}
          <div className="hidden sm:block overflow-x-auto table-responsive">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Hazard Class</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Road Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detections.slice(0, 5).map((item) => (
                  <tr key={item.id || item.detection_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-slate-800 capitalize">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.severity === 'High'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : item.severity === 'Medium'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-slate-600 truncate max-w-[160px]">
                      {item.road_segment || `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.review_status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.review_status === 'pending_review' ? (
                        <button
                          onClick={() => onVerifyDetection && onVerifyDetection(item.id)}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition"
                        >
                          Verify
                        </button>
                      ) : (
                        <span className="text-emerald-600 text-[11px] font-medium flex items-center justify-end gap-1">
                          <CheckCircle size={12} />
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Records (< sm screens: Option B) */}
          <div className="sm:hidden space-y-2.5">
            {detections.slice(0, 5).map((item) => (
              <div
                key={item.id || item.detection_id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 capitalize block truncate">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                      {item.road_segment || `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      item.severity === 'High'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : item.severity === 'Medium'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="font-mono text-slate-500">
                    Conf: {(item.confidence * 100).toFixed(0)}%
                  </span>
                  <div>
                    {item.review_status === 'pending_review' ? (
                      <button
                        onClick={() => onVerifyDetection && onVerifyDetection(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold text-[11px] shadow-sm"
                      >
                        Verify
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Road Damage Trends */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Weekly Damage Trends</h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Reported road surface faults</p>
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">7 Days</span>
            </div>

            <div className="h-44 sm:h-48 w-full mt-2 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="potholes" stroke="#DC2626" strokeWidth={2.5} name="Potholes" />
                  <Line type="monotone" dataKey="cracks" stroke="#F97316" strokeWidth={2.5} name="Cracks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-red-600"></span> Potholes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-orange-500"></span> Cracks
            </span>
            <button
              onClick={() => onNavigate('analytics')}
              className="font-semibold text-blue-600 hover:underline"
            >
              Full Analytics
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
