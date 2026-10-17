import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Edit3,
  Check,
  X,
} from 'lucide-react';

export default function ProfileDropdown({
  user,
  onNavigate,
  onRoleChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roles = ['Administrator', 'Inspection Operator', 'Maintenance Staff', 'Viewer'];

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Administrator':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Inspection Operator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Maintenance Staff':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Viewer':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200 focus:outline-none min-h-[34px] sm:min-h-[38px]"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User profile menu"
      >
        <div className="relative shrink-0">
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
            alt={user.full_name || 'User'}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300"
          />
          <span className="absolute bottom-0 right-0 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
        </div>

        <div className="hidden sm:block text-left text-xs max-w-[120px] lg:max-w-[150px]">
          <div className="font-semibold text-slate-800 leading-tight truncate">
            {user.full_name || 'Alex Morgan'}
          </div>
          <div className="text-[10px] text-slate-400 capitalize truncate">
            {user.role || 'Administrator'}
          </div>
        </div>

        <ChevronDown size={14} className="text-slate-400 ml-0.5 shrink-0" />
      </button>

      {/* Viewport-Safe Responsive Dropdown Menu */}
      {isOpen && (
        <div className="fixed sm:absolute top-14 sm:top-full left-2 sm:left-auto right-2 sm:right-0 mt-1 sm:mt-2 w-auto sm:w-72 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Info */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
                  alt={user.full_name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">{user.full_name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium shrink-0">● Active</span>
                  </div>
                </div>
              </div>

              {/* Close Button on Mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg shrink-0"
                aria-label="Close profile menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Role Switcher (For testing RBAC roles) */}
          <div className="p-3 bg-slate-50/30">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Switch Active Role (RBAC Demo)
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (onRoleChange) onRoleChange(r);
                    setIsOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left truncate font-medium flex items-center justify-between transition min-h-[32px] ${
                    user.role === r
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{r.replace(' Inspection', '').replace(' Staff', '')}</span>
                  {user.role === r && <Check size={12} className="text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-1.5 text-xs font-medium space-y-0.5">
            <button
              onClick={() => {
                onNavigate('profile');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition min-h-[38px]"
            >
              <User size={15} className="text-slate-400 shrink-0" />
              <span>View Profile</span>
            </button>

            <button
              onClick={() => {
                onNavigate('profile');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition min-h-[38px]"
            >
              <Edit3 size={15} className="text-slate-400 shrink-0" />
              <span>Edit Profile & Password</span>
            </button>

            <button
              onClick={() => {
                onNavigate('settings');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition min-h-[38px]"
            >
              <Settings size={15} className="text-slate-400 shrink-0" />
              <span>System Settings</span>
            </button>
          </div>

          {/* Logout Action */}
          <div className="p-1.5">
            <button
              onClick={() => {
                alert('Session locked. Refresh page to re-authenticate.');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition text-xs font-medium min-h-[38px]"
            >
              <LogOut size={15} className="shrink-0" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
