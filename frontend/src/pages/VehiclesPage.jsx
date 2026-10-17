import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Camera,
  Navigation,
  Calendar,
  ShieldCheck,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { api } from '../services/api';

export default function VehiclesPage({
  vehicles = [],
  onVehicleAdded,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('Inspection SUV');
  const [regId, setRegId] = useState('');
  const [assignedCam, setAssignedCam] = useState('Front 4K Wide-Angle');

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowAddModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId.trim()) return;

    try {
      const res = await api.createVehicle({
        vehicle_id: vehicleId.trim(),
        vehicle_type: vehicleType,
        registration_id: regId.trim(),
        assigned_camera: assignedCam,
        gps_status: 'Connected',
      });

      if (onVehicleAdded) {
        onVehicleAdded({
          id: res.id,
          vehicle_id: vehicleId.trim(),
          vehicle_type: vehicleType,
          registration_id: regId.trim(),
          assigned_camera: assignedCam,
          gps_status: 'Connected',
          last_inspection_date: new Date().toISOString(),
        });
      }

      setVehicleId('');
      setRegId('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add vehicle:', err);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Banner with Fleet Image & Add Vehicle Button */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E4E7EC] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Truck size={14} />
            <span>Inspection Fleet Management</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Registered Road Inspection Units</h2>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Manage your fleet of road survey vehicles equipped with high-resolution dashcams, RTK-GPS receivers, and edge AI compute units.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm w-full sm:w-auto min-h-[40px]"
            >
              <Plus size={16} />
              <span>Register New Vehicle</span>
            </button>
          </div>
        </div>

        {/* Real World Inspection Vehicle Photo */}
        <div className="w-full md:w-72 h-36 rounded-xl overflow-hidden shadow-inner border border-slate-200 shrink-0">
          <img
            src="/inspection_car.jpg"
            alt="Survey Vehicle"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Vehicles Grid Cards (Responsive Bootstrap-Style: 1 col mobile, 2 col tablet, 3 col desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {vehicles.map((v) => (
          <div
            key={v.id || v.vehicle_id}
            className="bg-white rounded-2xl border border-[#E4E7EC] p-4 sm:p-5 shadow-sm hover:shadow-md transition space-y-3 sm:space-y-4"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shrink-0">
                  <Truck size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{v.vehicle_id}</h3>
                  <p className="text-xs text-slate-500 truncate">{v.vehicle_type}</p>
                </div>
              </div>

              <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {v.gps_status || 'Connected'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-400">Plate Number:</span>
                <span className="font-semibold text-slate-800">{v.registration_id || 'KA-01-EXP-9921'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-400 flex items-center gap-1 truncate">
                  <Camera size={13} className="shrink-0" /> Camera:
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">{v.assigned_camera || 'Integrated USB HD'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar size={13} className="shrink-0" /> Last Inspected:
                </span>
                <span className="font-semibold text-slate-800">
                  {v.last_inspection_date ? new Date(v.last_inspection_date).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                <ShieldCheck size={14} className="shrink-0" /> Ready for Deployment
              </span>
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline text-[11px]">
                View Runs
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal: Viewport-Safe with Backdrop & Escape Dismissal */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <form
            onSubmit={handleAddSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Register Inspection Vehicle</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Identifier:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RV-1050"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Classification:</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white min-h-[40px]"
                >
                  <option value="Inspection SUV">Inspection SUV</option>
                  <option value="Survey Van">Survey Van</option>
                  <option value="Utility Truck">Utility Truck</option>
                  <option value="City Patrol Sedan">City Patrol Sedan</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registration Plate:</label>
                <input
                  type="text"
                  placeholder="e.g. KA-04-AB-1234"
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Camera Rig:</label>
                <input
                  type="text"
                  placeholder="e.g. Roof Dual HDR Sensor"
                  value={assignedCam}
                  onChange={(e) => setAssignedCam(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition min-h-[38px]"
              >
                Register Unit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
