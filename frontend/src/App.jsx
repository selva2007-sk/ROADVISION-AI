import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InitialLoadingScreen from './components/loading/InitialLoadingScreen';
import OverviewPage from './pages/OverviewPage';
import LiveInspectionPage from './pages/LiveInspectionPage';
import DigitalMapPage from './pages/DigitalMapPage';
import DetectionsPage from './pages/DetectionsPage';
import ReportsPage from './pages/ReportsPage';
import VehiclesPage from './pages/VehiclesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import UserProfile from './pages/UserProfile';
import { api } from './services/api';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fallback demo data in case backend is offline during first mount
const initialDashboard = {
  vehicle_status: 'Connected',
  camera_status: 'Connected',
  gps_status: 'GPS Available',
  latitude: 12.9716,
  longitude: 77.5946,
  speed_kmh: 32,
  distance_km: 32.8,
  total_potholes: 8,
  total_cracks: 14,
  high_priority_damage: 4,
  session_duration: '00:18:22',
  inspection_count: 3,
};

const defaultVehicles = [
  {
    id: 1,
    vehicle_id: 'RV-1001',
    vehicle_type: 'Inspection SUV',
    registration_id: 'KA-01-BM-1234',
    assigned_camera: 'Front HDR 4K',
    gps_status: 'Connected',
    last_inspection_date: new Date().toISOString(),
  },
  {
    id: 2,
    vehicle_id: 'RV-1018',
    vehicle_type: 'Survey Van',
    registration_id: 'KA-03-TR-5678',
    assigned_camera: 'Dual USB Cam Rig',
    gps_status: 'Connected',
    last_inspection_date: new Date().toISOString(),
  },
  {
    id: 3,
    vehicle_id: 'RV-1042',
    vehicle_type: 'Utility Truck',
    registration_id: 'KA-05-MK-9012',
    assigned_camera: 'Front Dashcam Ultra',
    gps_status: 'Connected',
    last_inspection_date: new Date().toISOString(),
  },
];

const defaultDetections = [
  {
    id: 1,
    detection_id: 'det-blr-01',
    category: 'pothole',
    confidence: 0.94,
    severity: 'High',
    latitude: 12.9719,
    longitude: 77.5948,
    road_segment: 'Kasturba Road - Northbound Lane 1',
    review_status: 'verified',
    timestamp: new Date().toISOString(),
    evidence_image: '/pothole_dashcam.jpg',
  },
  {
    id: 2,
    detection_id: 'det-blr-02',
    category: 'longitudinal_crack',
    confidence: 0.88,
    severity: 'Medium',
    latitude: 12.9734,
    longitude: 77.5962,
    road_segment: 'MG Road Intersection Flyover',
    review_status: 'verified',
    timestamp: new Date().toISOString(),
    evidence_image: '/road_feed_sample.jpg',
  },
  {
    id: 3,
    detection_id: 'det-blr-03',
    category: 'alligator_crack',
    confidence: 0.85,
    severity: 'High',
    latitude: 12.9750,
    longitude: 77.5980,
    road_segment: 'Cubbon Road Service Pavement',
    review_status: 'pending_review',
    timestamp: new Date().toISOString(),
    evidence_image: '/pothole_dashcam.jpg',
  },
  {
    id: 4,
    detection_id: 'det-blr-04',
    category: 'transverse_crack',
    confidence: 0.82,
    severity: 'Low',
    latitude: 12.9767,
    longitude: 77.6005,
    road_segment: 'Queens Road Junction',
    review_status: 'verified',
    timestamp: new Date().toISOString(),
    evidence_image: '/road_feed_sample.jpg',
  },
  {
    id: 5,
    detection_id: 'det-blr-05',
    category: 'damaged_surface',
    confidence: 0.79,
    severity: 'Medium',
    latitude: 12.9782,
    longitude: 77.6030,
    road_segment: 'Dickenson Road Entry',
    review_status: 'pending_review',
    timestamp: new Date().toISOString(),
    evidence_image: '/pothole_dashcam.jpg',
  },
  {
    id: 6,
    detection_id: 'det-blr-06',
    category: 'pothole',
    confidence: 0.96,
    severity: 'High',
    latitude: 12.9792,
    longitude: 77.6051,
    road_segment: 'Old Madras Road - Sector 2',
    review_status: 'verified',
    timestamp: new Date().toISOString(),
    evidence_image: '/road_feed_sample.jpg',
  },
];

const defaultUser = {
  id: 1,
  username: 'alex.morgan',
  full_name: 'Chief Engineer Alex Morgan',
  email: 'alex.morgan@roadvision.gov',
  phone: '+1 (555) 438-9210',
  role: 'Administrator', // 'Administrator' | 'Inspection Operator' | 'Maintenance Staff' | 'Viewer'
  department: 'Urban Road Infrastructure & Civil Assets',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  activity: {
    inspection_sessions_performed: 4,
    reports_submitted: 12,
    reports_reviewed: 9,
    tasks_completed: 6,
  },
};

// Role-based permission definitions
const rolePermissions = {
  'Administrator': ['overview', 'live-camera', 'map', 'detections', 'reports', 'repair-tracking', 'vehicles', 'analytics', 'settings', 'profile'],
  'Inspection Operator': ['overview', 'live-camera', 'map', 'detections', 'vehicles', 'profile'],
  'Maintenance Staff': ['overview', 'map', 'reports', 'repair-tracking', 'profile'],
  'Viewer': ['overview', 'map', 'analytics', 'profile'],
};

export default function App() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [detections, setDetections] = useState(defaultDetections);
  const [vehicles, setVehicles] = useState(defaultVehicles);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(defaultUser);
  const [refreshing, setRefreshing] = useState(false);

  const [systemStatus, setSystemStatus] = useState({
    backendConnected: true,
    cameraStatus: 'Connected',
    gpsStatus: 'GPS Available',
    aiMode: 'demo',
  });

  // Fetch all primary datasets from backend
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Health
      try {
        const health = await api.getHealth();
        setSystemStatus((prev) => ({
          ...prev,
          backendConnected: true,
          aiMode: health.mode || 'demo',
        }));
      } catch {
        setSystemStatus((prev) => ({ ...prev, backendConnected: false }));
      }

      // 2. Dashboard
      try {
        const dash = await api.getDashboard();
        setDashboard((prev) => ({ ...prev, ...dash }));
        setSystemStatus((prev) => ({
          ...prev,
          cameraStatus: dash.camera_status || 'Connected',
          gpsStatus: dash.gps_status || 'GPS Available',
        }));
      } catch (e) {
        console.warn('Dashboard fetch fallback');
      }

      // 3. User Profile
      try {
        const profile = await api.getProfile();
        if (profile && profile.full_name) {
          setUser(profile);
        }
      } catch (e) {
        console.warn('Profile fetch fallback');
      }

      // 4. Detections
      try {
        const dets = await api.getDetections();
        if (Array.isArray(dets) && dets.length > 0) {
          setDetections(dets);
        }
      } catch (e) {
        console.warn('Detections fetch fallback');
      }

      // 5. Vehicles
      try {
        const vehs = await api.getVehicles();
        if (Array.isArray(vehs) && vehs.length > 0) {
          setVehicles(vehs);
        }
      } catch (e) {
        console.warn('Vehicles fetch fallback');
      }

      // 6. Reports
      try {
        const reps = await api.getReports();
        if (Array.isArray(reps) && reps.length > 0) {
          setReports(reps);
        } else {
          setReports(
            defaultDetections.map((d) => ({
              id: d.id,
              detection_id: d.detection_id,
              category: d.category,
              severity: d.severity,
              road_segment: d.road_segment,
              status: d.review_status === 'verified' ? 'Verified' : 'Pending Review',
              assigned_team: d.severity === 'High' ? 'Rapid Asphalt Crew A' : 'District Patch Unit',
              maintenance_notes: 'Road surface inspection report logged by AI.',
              updated_at: d.timestamp,
              evidence_image: d.evidence_image,
            }))
          );
        }
      } catch (e) {
        console.warn('Reports fetch fallback');
      }
    } finally {
      setRefreshing(false);
      setIsDataLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle Role Change (RBAC switch)
  const handleRoleChange = (newRole) => {
    const updated = { ...user, role: newRole };
    setUser(updated);
    api.updateProfile({ role: newRole }).catch(() => {});

    // Guard: If current activeTab is not permitted for the new role, redirect to 'overview'
    const permitted = rolePermissions[newRole] || ['overview', 'profile'];
    if (!permitted.includes(activeTab)) {
      setActiveTab('overview');
    }
  };

  // Handler when a new detection is produced in Live Inspection
  const handleNewDetection = (newDet) => {
    setDetections((prev) => [newDet, ...prev]);
    setDashboard((prev) => ({
      ...prev,
      total_potholes: newDet.category === 'pothole' ? prev.total_potholes + 1 : prev.total_potholes,
      total_cracks: newDet.category !== 'pothole' ? prev.total_cracks + 1 : prev.total_cracks,
      high_priority_damage: newDet.severity === 'High' ? prev.high_priority_damage + 1 : prev.high_priority_damage,
    }));
  };

  const handleVerifyDetection = async (detId) => {
    try {
      await api.updateDetection(detId, { review_status: 'verified' });
      setDetections((prev) =>
        prev.map((d) => (d.id === detId ? { ...d, review_status: 'verified' } : d))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReport = (repId, updatedFields) => {
    setReports((prev) =>
      prev.map((r) => (r.id === repId ? { ...r, ...updatedFields } : r))
    );
  };

  const handleVehicleAdded = (newVeh) => {
    setVehicles((prev) => [newVeh, ...prev]);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Monitoring Overview';
      case 'live-camera':
        return 'Live Vehicle Camera & AI Detection';
      case 'map':
        return 'Digital Road Damage Map';
      case 'detections':
        return 'Detection History & Hazard Records';
      case 'reports':
        return 'Damage Reporting & Work Orders';
      case 'repair-tracking':
        return 'Repair Tracking & Crew Dispatch';
      case 'vehicles':
        return 'Vehicle Fleet & Device Management';
      case 'analytics':
        return 'Inspection Analytics & KPIs';
      case 'settings':
        return 'Settings & System Configuration';
      case 'profile':
        return 'User Profile & Access Credentials';
      default:
        return 'Dashboard';
    }
  };

  // Check if current tab is permitted for user's role
  const isPermitted = (rolePermissions[user.role] || ['overview', 'profile']).includes(activeTab);

  return (
    <>
      {/* Premium 3-Second JSTV Circular Initial Loading Screen */}
      {initialLoading && (
        <InitialLoadingScreen
          isReady={isDataLoaded}
          onFinish={() => setInitialLoading(false)}
        />
      )}

      <div className="min-h-screen bg-[#F5F7FB] text-[#111827] font-sans flex w-full">
        {/* Responsive Sidebar (Fixed on Desktop, Sliding Drawer on Mobile) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
          userRole={user.role}
        />

        {/* Main Content Area (0 margin on mobile, margin-left only on md: screens) */}
        <div
          className={`flex-1 flex flex-col min-h-screen w-full min-w-0 transition-all duration-300 ml-0 ${
            sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
          }`}
        >
          {/* Top Header */}
          <Header
            pageTitle={getPageTitle()}
            breadcrumb={activeTab.replace('-', ' ')}
            systemStatus={systemStatus}
            user={user}
            onRefresh={loadData}
            refreshing={refreshing}
            onNavigate={setActiveTab}
            onRoleChange={handleRoleChange}
            onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          />

          {/* Dynamic Page Views with Role Guards */}
          <main className="flex-1 p-2.5 xs:p-3.5 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0">
            {!isPermitted ? (
              <div className="bg-white rounded-3xl p-5 sm:p-10 border border-slate-200 text-center max-w-lg mx-auto shadow-sm my-6 sm:my-12 space-y-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                  <ShieldAlert size={26} />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">Access Restricted</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your current account role (<strong className="text-slate-800">{user.role}</strong>) does not have permission to view or manage this module.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition min-h-[40px]"
                  >
                    <ArrowLeft size={14} />
                    <span>Return to Overview</span>
                  </button>
                  <button
                    onClick={() => handleRoleChange('Administrator')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm min-h-[40px]"
                  >
                    Switch to Administrator (Demo)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewPage
                    dashboard={dashboard}
                    detections={detections}
                    vehicles={vehicles}
                    onNavigate={setActiveTab}
                    onVerifyDetection={handleVerifyDetection}
                  />
                )}

                {activeTab === 'live-camera' && (
                  <LiveInspectionPage
                    dashboard={dashboard}
                    vehicles={vehicles}
                    onNewDetection={handleNewDetection}
                  />
                )}

                {activeTab === 'map' && (
                  <DigitalMapPage
                    dashboard={dashboard}
                    detections={detections}
                  />
                )}

                {activeTab === 'detections' && (
                  <DetectionsPage
                    detections={detections}
                    onUpdateStatus={handleVerifyDetection}
                  />
                )}

                {(activeTab === 'reports' || activeTab === 'repair-tracking') && (
                  <ReportsPage
                    reports={reports}
                    onUpdateReport={handleUpdateReport}
                  />
                )}

                {activeTab === 'vehicles' && (
                  <VehiclesPage
                    vehicles={vehicles}
                    onVehicleAdded={handleVehicleAdded}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsPage />
                )}

                {activeTab === 'settings' && (
                  <SettingsPage
                    onDataReloaded={loadData}
                  />
                )}

                {activeTab === 'profile' && (
                  <UserProfile
                    user={user}
                    onUserUpdated={setUser}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
