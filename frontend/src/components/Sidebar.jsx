import React from 'react';
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
  UserCheck,
  User,
  Shield,
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
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
      label: 'Vehicle Management',
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

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#101828] text-white transition-all duration-300 border-r border-[#1e293b] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f2a3d]">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo.png"
            alt="RoadVision AI"
            className="w-10 h-10 rounded-xl object-contain shadow-md shadow-blue-500/20 bg-slate-900 border border-blue-500/30 p-0.5"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">ROADVISION</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Intelligent Road Monitoring</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Role Badge Banner in Sidebar */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-[#1f2a3d] bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Role:</span>
          <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 truncate max-w-[130px]">
            {userRole}
          </span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin">
        {permittedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-transform ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
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
      {!collapsed ? (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <ShieldAlert size={15} />
            <span>AI Demo Prototype</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Operating in labeled heuristic mode. Model detects potholes & cracks from camera frames.
          </p>
        </div>
      ) : (
        <div className="mx-auto mb-3" title="AI Demo Mode active">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
            <ShieldAlert size={16} />
          </div>
        </div>
      )}

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-[#1f2a3d] space-y-1">
        {/* User Profile Navigation Link */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          } ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'User Profile' : undefined}
        >
          <User size={18} className="shrink-0 text-slate-400" />
          {!collapsed && <span>User Profile</span>}
        </button>

        {userRole === 'Administrator' && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={18} className="shrink-0 text-slate-400" />
            {!collapsed && <span>Settings & System</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
