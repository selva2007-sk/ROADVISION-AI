import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Calendar,
  ExternalLink,
  X,
  MapPin,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';

export default function DetectionsPage({
  detections = [],
  onUpdateStatus,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    return detections.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.review_status !== statusFilter) return false;

      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const idMatch = (item.detection_id || '').toLowerCase().includes(q);
        const roadMatch = (item.road_segment || '').toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        if (!idMatch && !roadMatch && !catMatch) return false;
      }
      return true;
    });
  }, [detections, severityFilter, categoryFilter, statusFilter, searchTerm]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateDetection(id, { review_status: newStatus });
      if (onUpdateStatus) onUpdateStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search, Filter, Export Bar: Responsive Toolbar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E7EC] shadow-sm flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-0 flex-1 max-w-full sm:max-w-xs md:max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, category, or road..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600 min-h-[38px]"
          />
        </div>

        {/* Filter Selectors and Export Button */}
        <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 sm:gap-2.5 text-xs">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[38px] flex-1"
          >
            <option value="all">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[38px] flex-1"
          >
            <option value="all">All Damage Types</option>
            <option value="pothole">Potholes</option>
            <option value="longitudinal_crack">Longitudinal Cracks</option>
            <option value="transverse_crack">Transverse Cracks</option>
            <option value="alligator_crack">Alligator Cracks</option>
            <option value="damaged_surface">Damaged Surface</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 min-h-[38px] flex-1"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Export CSV Button */}
          <a
            href={api.getExportCsvUrl()}
            download
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition shadow-sm min-h-[38px]"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Detections Dual-View: Desktop Table + Mobile Compact Records */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm overflow-hidden">
        {/* 1. Desktop / Tablet Table View (>= md screens) */}
        <div className="hidden md:block overflow-x-auto table-responsive">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Evidence</th>
                <th className="py-3 px-4">Hazard Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Road Location</th>
                <th className="py-3 px-4">GPS Coordinates</th>
                <th className="py-3 px-4">Recorded At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-500">No detection records match your query</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id || item.detection_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedPhoto(item)}
                        className="w-12 h-9 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative group"
                        title="Click to view evidence photo"
                      >
                        <img
                          src={item.evidence_image || '/pothole_dashcam.jpg'}
                          alt={item.category}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Eye size={12} className="text-white" />
                        </div>
                      </button>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 capitalize">
                      {item.category.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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

                    <td className="py-3 px-4 font-mono text-slate-600">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate">
                      {item.road_segment || 'Highway Sector'}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.timestamp).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium capitalize ${
                          item.review_status === 'verified'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.review_status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.review_status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.review_status === 'pending_review' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusChange(item.id, 'verified')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, 'rejected')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(item.id, 'pending_review')}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Mobile Card Records View (< md screens: Option B) */}
        <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <AlertTriangle size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium text-slate-500">No detection records match your query</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id || item.detection_id}
                className="pt-3 first:pt-0 space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Evidence Thumbnail */}
                  <button
                    onClick={() => setSelectedPhoto(item)}
                    className="w-16 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative group shrink-0"
                    title="View evidence photo"
                  >
                    <img
                      src={item.evidence_image || '/pothole_dashcam.jpg'}
                      alt={item.category}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Eye size={14} className="text-white" />
                    </div>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="font-bold text-xs text-slate-900 capitalize truncate">
                        {item.category.replace('_', ' ')}
                      </h4>
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

                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      {item.road_segment || 'Highway Corridor'}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>Conf: {(item.confidence * 100).toFixed(0)}%</span>
                      <span>•</span>
                      <span>{item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Bottom Status & Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                      item.review_status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.review_status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.review_status?.replace('_', ' ') || 'Pending'}
                  </span>

                  <div className="flex items-center gap-2">
                    {item.review_status === 'pending_review' ? (
                      <>
                        <button
                          onClick={() => handleStatusChange(item.id, 'verified')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition min-h-[32px]"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition min-h-[32px]"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(item.id, 'pending_review')}
                        className="text-[11px] text-blue-600 font-semibold hover:underline"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Photo Modal: Viewport-Safe with Backdrop & Escape Dismissal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm capitalize truncate">
                  Evidence Photo: {selectedPhoto.category.replace('_', ' ')}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">{selectedPhoto.road_segment}</p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.evidence_image || '/pothole_dashcam.jpg'}
                alt={selectedPhoto.category}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-50 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div>Coordinates: {selectedPhoto.latitude}, {selectedPhoto.longitude}</div>
                <div>Confidence: {(selectedPhoto.confidence * 100).toFixed(0)}% · Severity: {selectedPhoto.severity}</div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 font-semibold hover:underline shrink-0"
              >
                <span>Navigate on Google Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
