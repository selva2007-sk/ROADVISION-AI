import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../services/api';

const SEVERITY_COLORS = {
  High: '#DC2626',
  Medium: '#F97316',
  Low: '#EAB308',
};

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then((data) => {
        setAnalyticsData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Analytics API error:', err);
        setLoading(false);
      });
  }, []);

  const defaultCategoryData = [
    { category: 'Pothole', count: 12 },
    { category: 'Longitudinal Crack', count: 9 },
    { category: 'Alligator Crack', count: 6 },
    { category: 'Transverse Crack', count: 4 },
    { category: 'Damaged Surface', count: 3 },
  ];

  const defaultSeverityData = [
    { name: 'High', value: 10, color: '#DC2626' },
    { name: 'Medium', value: 14, color: '#F97316' },
    { name: 'Low', value: 7, color: '#EAB308' },
  ];

  const defaultTrends = [
    { day: 'Mon', potholes: 4, cracks: 8, repaired: 3 },
    { day: 'Tue', potholes: 9, cracks: 12, repaired: 6 },
    { day: 'Wed', potholes: 6, cracks: 7, repaired: 5 },
    { day: 'Thu', potholes: 11, cracks: 15, repaired: 9 },
    { day: 'Fri', potholes: 8, cracks: 10, repaired: 8 },
    { day: 'Sat', potholes: 5, cracks: 6, repaired: 4 },
    { day: 'Sun', potholes: 3, cracks: 4, repaired: 2 },
  ];

  const categoryData = analyticsData?.category_breakdown?.length
    ? analyticsData.category_breakdown
    : defaultCategoryData;

  const severityData = analyticsData?.severity_breakdown?.length
    ? analyticsData.severity_breakdown.map((s) => ({
        name: s.severity,
        value: s.count,
        color: SEVERITY_COLORS[s.severity] || '#3b82f6',
      }))
    : defaultSeverityData;

  const trendData = analyticsData?.trends?.length
    ? analyticsData.trends
    : defaultTrends;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Banner & Export */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Road Infrastructure Analytics & KPIs</h2>
          <p className="text-[11px] sm:text-xs text-slate-500">Aggregated damage distribution and repair efficiency metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={api.getExportCsvUrl()}
            download
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm min-h-[38px]"
          >
            <Download size={14} />
            <span>Download Full CSV</span>
          </a>
        </div>
      </div>

      {/* Summary KPI Pills (Bootstrap-Style Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Inspected Distance</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {analyticsData?.total_km_inspected || 42.6} km
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">● Continuous GIS track samples</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Hazards Logged</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {analyticsData?.total_detections || 34}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">● Verified & pending review</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Repair Completion Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
            {analyticsData?.repair_completion_rate || 68.4}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across 6 municipal zones</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E4E7EC] shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Inspection Runs</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {analyticsData?.total_sessions || 4} runs
          </div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">All active vehicles</div>
        </div>
      </div>

      {/* 2 Core Visualizations: Category Bar Chart & Severity Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Category Breakdown (Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Damage Detections by Hazard Category</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Breakdown of potholes, surface cracks, and road degradation</p>
          </div>

          <div className="h-60 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} name="Detections" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution (Donut Chart) */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Severity Distribution</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Proportion of High vs Medium vs Low hazard levels</p>
          </div>

          <div className="h-48 sm:h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-500 text-center pt-2 border-t border-slate-100">
            Red: High (urgent patch) · Orange: Med · Yellow: Low
          </div>
        </div>
      </div>

      {/* 7-Day Inspection Activity & Repair Progress Trend */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E4E7EC] shadow-sm">
        <div className="pb-3 border-b border-slate-100 mb-3 sm:mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">7-Day Inspection vs Repair Dispatch Trends</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Track incoming detections alongside completed road repairs</p>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            Current Week
          </span>
        </div>

        <div className="h-60 sm:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPotholes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCracks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRepaired" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="potholes" stroke="#DC2626" fillOpacity={1} fill="url(#colorPotholes)" name="Potholes Found" />
              <Area type="monotone" dataKey="cracks" stroke="#F97316" fillOpacity={1} fill="url(#colorCracks)" name="Cracks Detected" />
              <Area type="monotone" dataKey="repaired" stroke="#16A34A" fillOpacity={1} fill="url(#colorRepaired)" name="Repaired by Crews" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
