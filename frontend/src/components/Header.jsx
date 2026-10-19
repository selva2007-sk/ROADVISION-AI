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
  Menu,
  Activity,
  X,
  Info,
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
  onToggleMobileMenu,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
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

  // Close notifications on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowStatusModal(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

    if (status === 'connected' || status === 'online' || status === 'Connected' || status === 'GPS Available' || status === 'GPS Connected') {
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClass = 'bg-emerald-500';
    } else if (status === 'warning' || status === 'degraded' || status === 'demo' || status === 'GPS Signal Unreliable' || status === 'GPS Reconnecting') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
      dotClass = 'bg-amber-500';
    } else if (status === 'disconnected' || status === 'offline' || status === 'error' || status === 'GPS Permission Denied') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
      dotClass = 'bg-rose-500';
    } else if (status === 'GPS Unavailable') {
      badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
      dotClass = 'bg-slate-400';
    }

    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeClass} shrink-0`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
        <Icon size={13} className="opacity-80" />
        <span className="capitalize">{label}: {status}</span>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E4E7EC] px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-sm select-none">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Hamburger Menu Toggle on Mobile (< md) */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 md:hidden shrink-0 flex items-center justify-center min-w-[38px] min-h-[38px]"
          aria-label="Toggle navigation drawer"
          title="Open menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-0.5">
            <span>RoadVision AI</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold truncate capitalize">{breadcrumb || pageTitle}</span>
          </div>
          <h1 className="text-xs min-[360px]:text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate max-w-[120px] min-[360px]:max-w-[160px] xs:max-w-[220px] sm:max-w-none">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Center: System Status Indicators (Visible on lg: screens) */}
      <div className="hidden lg:flex items-center gap-2">
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

      {/* Right: Actions, Clock, Notifications & User Avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Mobile Status Info Pill (< lg) */}
        <button
          onClick={() => setShowStatusModal(true)}
          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 lg:hidden flex items-center justify-center min-w-[34px] min-h-[34px]"
          title="System Connection Status"
          aria-label="View system status"
        >
          <div className="relative">
            <Activity size={15} />
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${systemStatus.backendConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </div>
        </button>

        {/* Real-time Clock (Desktop only) */}
        <div className="hidden xl:block text-right pr-2 border-r border-slate-200">
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
          className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 min-w-[34px] min-h-[34px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center shrink-0"
          title="Refresh dashboard data"
          aria-label="Refresh data"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
        </button>

        {/* Notifications Button & Responsive Dropdown */}
        <div className="relative" ref={notifyRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 sm:p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 relative min-w-[34px] min-h-[34px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center shrink-0"
            title="Notifications"
            aria-label="View notifications"
            aria-expanded={showNotifications}
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute top-14 sm:top-full left-2 sm:left-auto right-2 sm:right-0 mt-1 sm:mt-2 w-auto sm:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-slate-50 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">System Road Alerts</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                    3 New
                  </span>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="sm:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    aria-label="Close notifications"
                  >
                    <X size={14} />
                  </button>
                </div>
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
                  className="text-xs font-semibold text-blue-600 hover:underline min-h-[36px] flex items-center justify-center w-full"
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

      {/* Mobile System Status Modal (< lg screens) */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">System Telemetry Status</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600">
                  <Database size={15} /> Backend API Service
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${systemStatus.backendConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {systemStatus.backendConnected ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600">
                  <Camera size={15} /> Dashcam Optical Feed
                </span>
                <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                  {systemStatus.cameraStatus || 'Connected'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600">
                  <Navigation size={15} /> RTK GPS Satellite Fix
                </span>
                <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                  {systemStatus.gpsStatus || 'GPS Available'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600">
                  <Cpu size={15} /> Neural Vision Core
                </span>
                <span className="font-bold px-2 py-0.5 rounded-full text-[11px] bg-blue-100 text-blue-800">
                  {systemStatus.aiMode === 'production_yolo' ? 'YOLO Production' : 'Demo Heuristic'}
                </span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
              >
                Close Status
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
