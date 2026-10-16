import React from 'react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  subtitle,
  trend,
  trendPositive,
}) {
  const tones = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
    },
  };

  const currentTone = tones[tone] || tones.blue;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        </div>
        <div className={`p-3 rounded-xl ${currentTone.bg} ${currentTone.text} border ${currentTone.border}`}>
          <Icon size={22} />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{subtitle}</span>
          {trend && (
            <span
              className={`font-semibold ml-2 px-1.5 py-0.5 rounded text-[11px] ${
                trendPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
