import React, { useState, useMemo } from 'react';
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
    <div className="space-y-5">
      {/* Search, Filter, Export Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, category, or road segment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="all">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium Severity</option>
            <option value="Low">Low Severity</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
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
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition shadow-sm"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Detections Table Card */}
      <div className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, 'rejected')}
                            className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] transition"
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
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm capitalize">
                  Evidence Photo: {selectedPhoto.category.replace('_', ' ')}
                </h3>
                <p className="text-xs text-slate-500">{selectedPhoto.road_segment}</p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              <img
                src={selectedPhoto.evidence_image || '/pothole_dashcam.jpg'}
                alt={selectedPhoto.category}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div>Coordinates: {selectedPhoto.latitude}, {selectedPhoto.longitude}</div>
                <div>Confidence: {(selectedPhoto.confidence * 100).toFixed(0)}% · Severity: {selectedPhoto.severity}</div>
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 font-semibold hover:underline"
              >
                <span>Navigate</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
