import React from 'react';
import { User, Target, Briefcase, FileText } from 'lucide-react';
import ChartContainer from './ChartContainer';

interface PerformanceData {
  user: { id: string; name: string; role: string };
  leads_created: number;
  leads_converted: number;
  bookings_created: number;
  conversion_rate: number;
  recent_activity: any[];
  performance_history: Array<{ day: string, leads: number, bookings: number }>;
}

const PerformancePanel: React.FC<{ data: PerformanceData }> = ({ data }) => {
  const chartLabels = data.performance_history.map(h => h.day);
  const leadData = data.performance_history.map(h => h.leads);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Mini Profile Header */}
      <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-4 text-white shadow-lg shadow-zinc-950/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-white/5">
            <User size={20} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">{data.user.name}</h2>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none block mt-1">
                {data.user.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Efficiency</p>
          <p className="text-2xl font-black italic tracking-tighter text-indigo-400 leading-none">{data.conversion_rate}%</p>
        </div>
      </div>

      {/* Compact Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Leads" value={data.leads_created} icon={<FileText size={14}/>} color="bg-indigo-50 text-indigo-600" />
        <MetricCard label="Wins" value={data.leads_converted} icon={<Target size={14}/>} color="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Bookings" value={data.bookings_created} icon={<Briefcase size={14}/>} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
         <div className="h-full">
            <ChartContainer 
                title="7-Day Trend" 
                data={leadData} 
                labels={chartLabels} 
                unit="L"
                color="bg-indigo-500"
            />
         </div>
         
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Latest Logs</h3>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
              {data.recent_activity.map((act, i) => (
                <div key={i} className="flex items-start gap-3 group/item">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${act.type === 'lead' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 pb-2 border-b border-slate-50 group-last/item:border-0 group-last/item:pb-0">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{act.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(act.created_at).toLocaleDateString()}</span>
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 rounded-md leading-none py-0.5">{act.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.recent_activity.length === 0 && (
                <p className="text-[10px] text-slate-300 font-bold uppercase py-4 text-center">Empty Records</p>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-lg transition-all duration-300 group">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 shadow-sm ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">{label}</p>
    <p className="text-xl font-black text-slate-800 mt-1 leading-none">{value}</p>
  </div>
);

export default PerformancePanel;
