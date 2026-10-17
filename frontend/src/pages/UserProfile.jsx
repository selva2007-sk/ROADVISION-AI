import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  Wrench,
  Activity,
  Lock,
  Save,
  Bell,
  Camera,
  Check,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';

export default function UserProfile({
  user,
  onUserUpdated,
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'security' | 'notifications'

  // Personal Info Form State
  const [fullName, setFullName] = useState(user.full_name || 'Chief Engineer Alex Morgan');
  const [email, setEmail] = useState(user.email || 'alex.morgan@roadvision.gov');
  const [phone, setPhone] = useState(user.phone || '+1 (555) 438-9210');
  const [department, setDepartment] = useState(user.department || 'Urban Road Infrastructure & Civil Assets');
  const [role, setRole] = useState(user.role || 'Administrator');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification Preferences State
  const [notifyUrgent, setNotifyUrgent] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);
  const [notifyDispatch, setNotifyDispatch] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });

    try {
      await api.updateProfile({
        full_name: fullName,
        email: email,
        phone: phone,
        department: department,
        role: role,
        avatar_url: avatarUrl,
      });

      if (onUserUpdated) {
        onUserUpdated({
          ...user,
          full_name: fullName,
          email: email,
          phone: phone,
          department: department,
          role: role,
          avatar_url: avatarUrl,
        });
      }

      setStatusMsg({ type: 'success', text: 'Profile information saved successfully!' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });

    if (!currentPassword) {
      setStatusMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setStatusMsg({ type: 'success', text: 'Password successfully updated and encrypted!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating password.' });
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'Administrator':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Inspection Operator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Maintenance Staff':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const activity = user.activity || {
    inspection_sessions_performed: 3,
    reports_submitted: 8,
    reports_reviewed: 6,
    tasks_completed: 4,
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[#E4E7EC] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-20 sm:h-24 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500"></div>

        <div className="relative pt-6 sm:pt-8 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left min-w-0">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-slate-900"
              />
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-white shadow"></span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">{fullName}</h2>
                <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getRoleBadgeStyle(role)}`}>
                  {role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{department}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 break-all">
                  <Mail size={13} className="shrink-0" /> {email}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Phone size={13} className="shrink-0" /> {phone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Account Verified
            </span>
          </div>
        </div>
      </div>

      {/* Activity Summary Stats (Bootstrap-Style Grid) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Activity size={14} className="text-blue-600" />
            <span>Inspection Runs</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {activity.inspection_sessions_performed}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Fleet surveys led</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <FileCheck size={14} className="text-emerald-600" />
            <span>Hazards Submitted</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {activity.reports_submitted}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Detected via AI Stream</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-purple-600" />
            <span>Reports Reviewed</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {activity.reports_reviewed}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Verified by inspection staff</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Wrench size={14} className="text-amber-600" />
            <span>Repairs Completed</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {activity.tasks_completed}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Asphalt work finished</div>
        </div>
      </div>

      {/* Profile Settings Panel */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#E4E7EC] shadow-sm overflow-hidden">
        {/* Navigation Tabs with Horizontal Scrolling on Mobile */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-3 sm:px-6 pt-2.5 sm:pt-3 text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-thin">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 sm:px-4 border-b-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Personal Info & Role
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 px-3 sm:px-4 border-b-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-3 sm:px-4 border-b-2 transition min-h-[40px] shrink-0 ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Notifications & Dispatch Alerts
          </button>
        </div>

        {/* Feedback Message */}
        {statusMsg.text && (
          <div
            className={`m-4 sm:m-6 mb-0 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Personal Information */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveProfile} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Department:</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Active User Role (RBAC):</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium min-h-[40px]"
                >
                  <option value="Administrator">Administrator (Full Access)</option>
                  <option value="Inspection Operator">Inspection Operator (Live Camera & Detections)</option>
                  <option value="Maintenance Staff">Maintenance Staff (Repair Tracking & Dispatch)</option>
                  <option value="Viewer">Viewer (Read-Only GIS Map & Analytics)</option>
                </select>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                  Adjusting this role modifies permitted views, sidebar navigation, and authorized buttons.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Avatar Image URL:</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
                />
              </div>
            </div>

            <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition w-full sm:w-auto min-h-[40px]"
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 max-w-md text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password:</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password:</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password:</label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 min-h-[40px]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition w-full sm:w-auto min-h-[40px]"
              >
                <Lock size={15} />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Notification Preferences */}
        {activeTab === 'notifications' && (
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 text-xs">
            <div className="space-y-2.5 sm:space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyUrgent}
                  onChange={(e) => setNotifyUrgent(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 accent-blue-600 w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-slate-900">High-Priority Pothole Alerts</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">
                    Receive instant notifications when dangerous severity potholes are identified.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDaily}
                  onChange={(e) => setNotifyDaily(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 accent-blue-600 w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-slate-900">Daily Fleet Inspection Digest</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">
                    Summary report of all kilometers surveyed and cracks cataloged across municipal sectors.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDispatch}
                  onChange={(e) => setNotifyDispatch(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 accent-blue-600 w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-slate-900">Repair Crew Work Orders</div>
                  <div className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">
                    Notifications when road maintenance teams update task status to 'In Progress' or 'Repaired'.
                  </div>
                </div>
              </label>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  setStatusMsg({ type: 'success', text: 'Notification preferences updated!' });
                  setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition w-full sm:w-auto min-h-[40px]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
