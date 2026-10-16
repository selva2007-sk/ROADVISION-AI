import React, { useState } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle,
  Truck,
  FileEdit,
  AlertTriangle,
  ArrowRight,
  Filter,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';

const STATUS_STAGES = [
  'Detected',
  'Pending Review',
  'Verified',
  'Repair Scheduled',
  'In Progress',
  'Repaired',
];

export default function ReportsPage({
  reports = [],
  onUpdateReport,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingReport, setEditingReport] = useState(null);
  const [teamInput, setTeamInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [statusInput, setStatusInput] = useState('Detected');

  const filteredReports = activeFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === activeFilter);

  const startEdit = (report) => {
    setEditingReport(report);
    setTeamInput(report.assigned_team || '');
    setNotesInput(report.maintenance_notes || '');
    setStatusInput(report.status || 'Detected');
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    try {
      await api.updateReport(editingReport.id, {
        status: statusInput,
        assigned_team: teamInput,
        maintenance_notes: notesInput,
      });

      if (onUpdateReport) {
        onUpdateReport(editingReport.id, {
          status: statusInput,
          assigned_team: teamInput,
          maintenance_notes: notesInput,
        });
      }
      setEditingReport(null);
    } catch (err) {
      console.error('Failed to update report:', err);
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'Repaired':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Repair Scheduled':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Verified':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Pending Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Workflow Explanation & Status Tabs */}
      <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Road Damage Reporting & Repair Workflow</h2>
            <p className="text-xs text-slate-500">Track and dispatch city maintenance crews from initial AI detection to verified asphalt repair</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({reports.length})
            </button>
            {STATUS_STAGES.map((stage) => {
              const count = reports.filter((r) => r.status === stage).length;
              return (
                <button
                  key={stage}
                  onClick={() => setActiveFilter(stage)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition ${
                    activeFilter === stage
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {stage} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Linear Workflow Indicator */}
        <div className="mt-4 hidden md:flex items-center justify-between text-xs">
          {STATUS_STAGES.map((stage, idx) => (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-700">{stage}</span>
              </div>
              {idx < STATUS_STAGES.length - 1 && (
                <div className="flex-1 border-t border-slate-200 mx-3"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Reports Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-2xl border border-[#E4E7EC] shadow-sm p-4 hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              {/* Image & Status Header */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 mb-3">
                <img
                  src={report.evidence_image || '/pothole_dashcam.jpg'}
                  alt={report.category}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm ${getStatusColor(
                    report.status
                  )}`}
                >
                  {report.status}
                </span>

                <span
                  className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                    report.severity === 'High' ? 'bg-red-600' :
                    report.severity === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`}
                >
                  {report.severity} Severity
                </span>
              </div>

              {/* Title & Road Segment */}
              <h3 className="font-bold text-slate-900 text-sm capitalize">
                {report.category?.replace('_', ' ') || 'Road Damage Record'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{report.road_segment || 'Sector Highway'}</p>

              {/* Meta details */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 bg-slate-50 p-2 rounded-lg">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Truck size={13} /> Assigned Crew:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {report.assigned_team || 'Unassigned'}
                  </span>
                </div>

                {report.maintenance_notes && (
                  <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-100 flex items-start gap-1.5">
                    <MessageSquare size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>{report.maintenance_notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {report.updated_at ? new Date(report.updated_at).toLocaleDateString() : 'Active'}
              </span>

              <button
                onClick={() => startEdit(report)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition"
              >
                <FileEdit size={13} />
                <span>Update Status</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Status & Assign Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Update Repair Tracking</h3>
            <p className="text-xs text-slate-500 mb-4">
              Manage dispatch status for {editingReport.category?.replace('_', ' ')}
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repair Status:</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {STATUS_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Maintenance Team:</label>
                <input
                  type="text"
                  placeholder="e.g. Rapid Asphalt Crew B"
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maintenance / Work Order Notes:</label>
                <textarea
                  rows={3}
                  placeholder="Specify asphalt mix, repair crew instructions, or completion notes..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
              >
                Save & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
