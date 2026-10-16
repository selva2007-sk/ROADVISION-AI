import React, { useState } from 'react';
import {
  Database,
  Sliders,
  RefreshCw,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsPage({ onDataReloaded }) {
  const [intervalMs, setIntervalMs] = useState(1200);
  const [gpsThreshold, setGpsThreshold] = useState(25);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await api.seedDemo();
      setSeedSuccess(true);
      if (onDataReloaded) onDataReloaded();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error('Seeding error:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm">
        <h2 className="text-base font-bold text-slate-900">System Configuration</h2>
        <p className="text-xs text-slate-500">
          Configure telemetry processing intervals, GPS duplicate filtering thresholds, and database demo records.
        </p>
      </div>

      {/* Camera & Geolocation Filters */}
      <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Sliders className="text-blue-600" size={20} />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Telemetry & Duplicate Filtering</h3>
            <p className="text-xs text-slate-500">Tune spatial thresholds to prevent duplicate reports across frames</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>Frame Processing Interval:</span>
              <span className="text-blue-600">{intervalMs} ms</span>
            </div>
            <input
              type="range"
              min="400"
              max="3000"
              step="100"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-slate-400">
              Lower intervals yield faster responsiveness; higher intervals conserve battery and CPU.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>GPS Spatial Duplicate Radius:</span>
              <span className="text-blue-600">{gpsThreshold} meters</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={gpsThreshold}
              onChange={(e) => setGpsThreshold(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-slate-400">
              Consecutive detections within this radius will be merged into a single road hazard report.
            </p>
          </div>
        </div>
      </div>

      {/* Database Management & Seed Reset */}
      <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Demo Data Management</h3>
          <p className="text-xs text-slate-500">
            Reset database tables with realistic urban road detections, GPS routes, and fleet records.
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
        >
          {seeding ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : seedSuccess ? (
            <Check size={14} className="text-emerald-300" />
          ) : (
            <Database size={14} />
          )}
          <span>{seedSuccess ? 'Database Seeded!' : 'Seed Demonstration Records'}</span>
        </button>
      </div>
    </div>
  );
}
