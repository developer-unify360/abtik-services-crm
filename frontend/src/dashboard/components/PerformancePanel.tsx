import React from 'react';
import { User, Target, Briefcase, FileText, IndianRupee, TrendingUp } from 'lucide-react';
import ChartContainer from './ChartContainer';

interface PerformanceData {
  user: { id: string; name: string; role: string };
  leads_created: number;
  leads_converted: number;
  bookings_created: number;
  conversion_rate: number;
  total_payments: number;
  recent_activity: any[];
  performance_history: Array<{ day: string, leads: number, bookings: number }>;
}

const PerformancePanel: React.FC<{ data: PerformanceData }> = ({ data }) => {
  const isBDE = data.user.role === 'bde';
  const chartLabels = data.performance_history.map(h => h.day);
  const chartData = isBDE 
    ? data.performance_history.map(h => h.leads)
    : data.performance_history.map(h => h.bookings);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 p-2">
      {/* Mini Profile Header - Premium & Expansive */}
      <div className="flex items-center justify-between bg-zinc-950 rounded-2xl p-5 text-white shadow-xl shadow-zinc-950/20">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-white/5">
            <User size={24} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">{data.user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none">
                    {data.user.role?.replace('_', ' ')}
                </span>
                {!isBDE && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400">Top Performer</span>
                    </div>
                )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Performance Efficiency</p>
          <div className="flex items-center gap-2 justify-end">
            <p className="text-3xl font-black italic tracking-tighter text-indigo-400 leading-none">{isBDE ? data.leads_created : data.conversion_rate + '%'}</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Role-Specific Metric Grid - Fixed height to avoid scroll */}
      <div className="grid grid-cols-4 gap-4">
        {isBDE ? (
            <>
                <MetricCard label="Leads Generated" value={data.leads_created} icon={<FileText size={18}/>} color="bg-indigo-50 text-indigo-600" />
                <MetricCard label="Potential Wins" value={data.leads_converted} icon={<Target size={18}/>} color="bg-emerald-50 text-emerald-600" />
                <div className="col-span-2 bg-indigo-600 rounded-2xl p-5 text-white flex flex-col justify-center shadow-lg shadow-indigo-600/20">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Lead Matrix Goal</p>
                        <span className="text-[10px] font-black">{(data.leads_created / 50 * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                        <div className="bg-white h-full transition-all duration-1000" style={{ width: `${Math.min(100, data.leads_created / 50 * 100)}%` }} />
                    </div>
                </div>
            </>
        ) : (
            <>
                <MetricCard label="Total Bookings" value={data.bookings_created} icon={<Briefcase size={18}/>} color="bg-amber-50 text-amber-600" />
                <MetricCard label="Conversion" value={data.conversion_rate + '%'} icon={<Target size={18}/>} color="bg-indigo-50 text-indigo-600" />
                <div className="col-span-2 bg-emerald-600 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg shadow-emerald-600/20">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Total Revenue Stream</p>
                        <p className="text-2xl font-black leading-none">₹{data.total_payments.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                        <IndianRupee size={24} />
                    </div>
                </div>
            </>
        )}
      </div>

      {/* Expansive Visualization Section */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
         <div className="xl:col-span-3">
            <ChartContainer 
                title={isBDE ? "Lead Generation Velocity" : "Booking Conversion Trend"} 
                data={chartData} 
                labels={chartLabels} 
                unit={isBDE ? "L" : "B"}
                color={isBDE ? "bg-indigo-500" : "bg-emerald-500"}
                compact={false}
            />
         </div>
         
         <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Logs</h3>
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                    <span className="text-[8px] font-bold uppercase tracking-tighter">Live Monitor</span>
                </div>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
              {data.recent_activity.map((act, i) => (
                <div key={act.id || i} className="flex items-start gap-4 group/item">
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${act.type === 'lead' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 pb-2.5 border-b border-slate-50 group-last/item:border-0 group-last/item:pb-0">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{act.title}</p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(act.created_at).toLocaleDateString()}</span>
                        {act.amount ? (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-md leading-none py-0.5">₹{act.amount}</span>
                        ) : (
                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 rounded-md leading-none py-0.5">{act.status}</span>
                        )}
                    </div>
                  </div>
                </div>
              ))}
              {data.recent_activity.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center opacity-20">
                    <Briefcase size={24} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Active Records</p>
                </div>
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
  <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-xl transition-all duration-500 group flex flex-col items-center text-center">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</p>
    <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
  </div>
);

export default PerformancePanel;


