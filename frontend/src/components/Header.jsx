import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  RefreshCw,
  Database,
  Camera,
  Navigation,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import ProfileDropdown from './profile/ProfileDropdown';

export default function Header({
  pageTitle,
  breadcrumb,
  systemStatus,
  user,
  onRefresh,
  refreshing,
  onNavigate,
  onRoleChange,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const notifyRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'High-Severity Pothole Detected',
      desc: 'Outer Ring Rd - Sector 4 (94% AI Confidence)',
      time: '12m ago',
      urgent: true,
    },
    {
      id: 2,
      title: 'Repair Crew Dispatched',
      desc: 'Rapid Asphalt Unit assigned to Kasturba Rd',
      time: '34m ago',
      urgent: false,
    },
    {
      id: 3,
      title: 'Inspection Session Completed',
      desc: 'Vehicle RV-1001 completed 24.6 km run',
      time: '1h ago',
      urgent: false,
    },
  ];

  const getStatusBadge = (status, label, icon) => {
    const Icon = icon;
    let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
    let dotClass = 'bg-slate-400';

    if (status === 'connected' || status === 'online' || status === 'Connected' || status === 'GPS Available') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClass = 'bg-emerald-500';
    } else if (status === 'warning' || status === 'degraded' || status === 'demo') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      dotClass = 'bg-amber-500';
    } else if (status === 'disconnected' || status === 'offline' || status === 'error') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      dotClass = 'bg-rose-500';
    }

    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
        <Icon size={13} className="opacity-80" />
        <span className="capitalize">{label}: {status}</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E4E7EC] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-0.5">
          <span>RoadVision AI</span>
          <span>/</span>
          <span className="text-blue-600 font-semibold">{breadcrumb || pageTitle}</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
      </div>

      {/* System Status Indicators (Backend, Camera, GPS, AI Model) */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {getStatusBadge(
          systemStatus.backendConnected ? 'Connected' : 'Offline',
          'API',
          Database
        )}
        {getStatusBadge(
          systemStatus.cameraStatus || 'Connected',
          'Cam',
          Camera
        )}
        {getStatusBadge(
          systemStatus.gpsStatus || 'GPS Available',
          'GPS',
          Navigation
        )}
        {getStatusBadge(
          systemStatus.aiMode === 'production_yolo' ? 'YOLO' : 'Demo Mode',
          'AI',
          Cpu
        )}
      </div>

      {/* Actions, Time, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Real-time Clock */}
        <div className="hidden lg:block text-right pr-2 border-r border-slate-200">
          <div className="text-xs font-semibold text-slate-800">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] text-slate-400">
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200"
          title="Refresh dashboard data"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={notifyRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 relative"
            title="Notifications"
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">System Road Alerts</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                  3 New
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition cursor-pointer">
                    <div className="flex items-start gap-2">
                      {n.urgent ? (
                        <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 size={15} className="text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-slate-900 leading-tight">{n.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.desc}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 text-center bg-slate-50">
                <button
                  onClick={() => {
                    onNavigate('reports');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View All Work Orders
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <ProfileDropdown
          user={user}
          onNavigate={onNavigate}
          onRoleChange={onRoleChange}
        />
      </div>
    </header>
  );
}
