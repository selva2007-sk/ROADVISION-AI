import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Video,
  MapPin,
  History,
  FileText,
  Truck,
  BarChart3,
  Wrench,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  userRole = 'Administrator',
}) {
  const allNavItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      roles: ['Administrator', 'Inspection Operator', 'Maintenance Staff', 'Viewer'],
    },
    {
      id: 'live-camera',
      label: 'Live Inspection',
      icon: Video,
      badge: 'LIVE',
      roles: ['Administrator', 'Inspection Operator'],
    },
    {
      id: 'map',
      label: 'Digital Road Map',
      icon: MapPin,
      roles: ['Administrator', 'Inspection Operator', 'Maintenance Staff', 'Viewer'],
    },
    {
      id: 'detections',
      label: 'Detection History',
      icon: History,
      roles: ['Administrator', 'Inspection Operator'],
    },
    {
      id: 'reports',
      label: 'Damage Reports',
      icon: FileText,
      roles: ['Administrator', 'Maintenance Staff'],
    },
    {
      id: 'vehicles',
      label: 'Vehicle Fleet',
      icon: Truck,
      roles: ['Administrator', 'Inspection Operator'],
    },
    {
      id: 'analytics',
      label: 'Inspection Analytics',
      icon: BarChart3,
      roles: ['Administrator', 'Viewer'],
    },
    {
      id: 'repair-tracking',
      label: 'Repair Tracking',
      icon: Wrench,
      roles: ['Administrator', 'Maintenance Staff'],
    },
  ];

  // Filter items based on active role permissions
  const permittedItems = allNavItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Close mobile drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const renderContent = (isMobileView = false) => (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#1f2a3d] shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
          <img
            src="/logo.png"
            alt="RoadVision AI"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-md shadow-blue-500/20 bg-slate-900 border border-blue-500/30 p-0.5 shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {(!collapsed || isMobileView) && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">ROADVISION</span>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">AI</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Intelligent Road Monitoring</p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle OR Mobile Close Button */}
        {isMobileView ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[38px] min-h-[38px] flex items-center justify-center"
            aria-label="Close navigation drawer"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden md:flex items-center justify-center"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Role Badge Banner in Sidebar */}
      {(!collapsed || isMobileView) && (
        <div className="px-4 py-2 border-b border-[#1f2a3d] bg-slate-950/40 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 font-medium">Role:</span>
          <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 truncate max-w-[130px]">
            {userRole}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 sm:px-3 py-3 sm:py-4 space-y-1 sm:space-y-1.5 scrollbar-thin">
        {permittedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed && !isMobileView ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 group min-h-[44px] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              } ${collapsed && !isMobileView ? 'justify-center' : ''}`}
            >
              <Icon
                size={19}
                className={`shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`}
              />
              {(!collapsed || isMobileView) && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse ml-2 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Demo Mode Notice */}
      {(!collapsed || isMobileView) ? (
        <div className="mx-3 mb-2 sm:mb-3 p-2.5 sm:p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <ShieldAlert size={14} className="shrink-0" />
            <span className="text-[11px] sm:text-xs">AI Demo Prototype</span>
          </div>
          <p className="text-slate-300 text-[10px] sm:text-[11px] leading-relaxed">
            Heuristic detection core active. Analyzes camera frames for road faults.
          </p>
        </div>
      ) : (
        <div className="mx-auto mb-3 shrink-0" title="AI Demo Mode active">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
            <ShieldAlert size={16} />
          </div>
        </div>
      )}

      {/* Bottom Footer Section */}
      <div className="p-2.5 sm:p-3 border-t border-[#1f2a3d] space-y-1 shrink-0">
        {/* User Profile Navigation Link */}
        <button
          onClick={() => handleNavClick('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition min-h-[44px] ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          } ${collapsed && !isMobileView ? 'justify-center' : ''}`}
          title={collapsed && !isMobileView ? 'User Profile' : undefined}
        >
          <User size={18} className="shrink-0 text-slate-400" />
          {(!collapsed || isMobileView) && <span>User Profile</span>}
        </button>

        {userRole === 'Administrator' && (
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition min-h-[44px] ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            } ${collapsed && !isMobileView ? 'justify-center' : ''}`}
            title={collapsed && !isMobileView ? 'Settings' : undefined}
          >
            <Settings size={18} className="shrink-0 text-slate-400" />
            {(!collapsed || isMobileView) && <span>Settings & System</span>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP SIDEBAR (Visible on md: and above) */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-30 flex-col bg-[#101828] text-white transition-all duration-300 border-r border-[#1e293b] ${
          collapsed ? 'w-20' : 'w-64'
        }`}
        aria-label="Desktop Navigation"
      >
        {renderContent(false)}
      </aside>

      {/* 2. MOBILE NAVIGATION DRAWER & BACKDROP (Visible on mobile when triggered) */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          mobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Sliding Drawer */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Main Navigation"
          className={`absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#101828] text-white shadow-2xl border-r border-[#1e293b] flex flex-col transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderContent(true)}
        </aside>
      </div>
    </>
  );
}
