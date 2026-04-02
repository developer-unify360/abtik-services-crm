import React from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, color, trend, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 transition-all duration-300 ${
      onClick ? 'cursor-pointer hover:shadow-md' : ''
    }`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
        {trend && <span className="text-[9px] font-bold text-emerald-600 leading-none">{trend}</span>}
      </div>
    </div>
  </div>
);

export default StatsCard;
