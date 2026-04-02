import React, { useEffect, useState } from 'react';
import { Users, Calendar, TrendingUp, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import StatsCard from './components/StatsCard';
import UserSearchBar from './components/UserSearchBar';
import PerformancePanel from './components/PerformancePanel';

interface DashboardStats {
  totalClients: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
}

interface TodayStats {
  total_leads_today: number;
  leads_by_bde: Array<{ user_id: string; name: string; count: number }>;
  total_bookings_today: number;
  bookings_by_bdm: Array<{ user_id: string; name: string; count: number }>;
}

const TodayStatsTable = ({ data, title, type }: { data: any[], title: string, type: string }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
      <div className="flex items-center gap-1.5 opacity-50">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
           <span className="text-[8px] font-bold uppercase tracking-tighter">Today</span>
      </div>
    </div>
    <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 scroll-compact">
      {data.map((item, i) => (
        <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50 group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs shadow-inner">
              {item.name[0]?.toUpperCase()}
            </div>
            <div>
                <p className="text-[11px] font-bold text-slate-800 leading-none mb-1">{item.name}</p>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{type}</p>
            </div>
          </div>
          <p className="text-sm font-black text-slate-900">{item.count}</p>
        </div>
      ))}
      {data.length === 0 && (
        <p className="text-[10px] text-slate-300 font-black uppercase text-center py-4">No Entries</p>
      )}
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
  });
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, bookingsRes, pendingRes, completedRes, todayRes] = await Promise.all([
          apiClient.get('/clients/?page=1&page_size=1'),
          apiClient.get('/bookings/?page=1&page_size=1'),
          apiClient.get('/bookings/?status=pending&page=1&page_size=1'),
          apiClient.get('/bookings/?status=completed&page=1&page_size=1'),
          apiClient.get('/dashboard/today-stats/'),
        ]);
        
        setStats({
          totalClients: clientsRes.data.count ?? 0,
          totalBookings: bookingsRes.data.count ?? 0,
          pendingBookings: pendingRes.data.count ?? 0,
          completedBookings: completedRes.data.count ?? 0,
        });
        setTodayStats(todayRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUserSearch = async (query: string) => {
    setSearching(true);
    try {
      const res = await apiClient.get(`/dashboard/user-performance/?query=${encodeURIComponent(query)}`);
      setPerformanceData(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
        <div className="space-y-4 px-2 lg:px-0 max-w-full mx-auto animate-pulse">
            <div className="h-10 bg-slate-200 rounded-xl w-1/4 mb-4" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-3 h-[400px] bg-white border border-slate-100 rounded-2xl" />
                <div className="space-y-4">
                    <div className="h-[180px] bg-white border border-slate-100 rounded-2xl" />
                    <div className="h-[180px] bg-white border border-slate-100 rounded-2xl" />
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-4 px-2 lg:px-0 pb-2 max-w-full mx-auto overflow-hidden h-[calc(100vh-100px)] flex flex-col">
      
      {/* Top Search Matrix Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        <div className="lg:col-span-3 flex items-center gap-4">
             <div className="flex-1">
                <UserSearchBar onSearch={handleUserSearch} isLoading={searching} />
             </div>
             <button 
                onClick={() => navigate('/bookings/new')}
                className="whitespace-nowrap px-6 py-2.5 bg-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
             >
                 + Booking
             </button>
        </div>
        <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400">Globe Total</span>
            <span className="text-sm font-black text-indigo-600">{(todayStats?.total_leads_today || 0) + (todayStats?.total_bookings_today || 0)} Units</span>
        </div>
      </div>

      {/* Analytics Main View */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
         {/* Global Metrics Row (Secondary) */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="CLIENTS" value={stats.totalClients} icon={<Users size={16} />} color="bg-indigo-50 text-indigo-600" onClick={() => navigate('/clients')} />
            <StatsCard label="BOOKINGS" value={stats.totalBookings} icon={<Calendar size={16} />} color="bg-indigo-50 text-indigo-600" onClick={() => navigate('/bookings')} />
            <StatsCard label="PENDING" value={stats.pendingBookings} icon={<TrendingUp size={16} />} color="bg-amber-50 text-amber-600" onClick={() => navigate('/bookings?status=pending')} />
            <StatsCard label="COMPLETED" value={stats.completedBookings} icon={<ClipboardCheck size={16} />} color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/bookings?status=completed')} />
         </div>

         <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
            {/* Performance Panel Sub-section */}
            <div className="lg:col-span-3 overflow-y-auto custom-scrollbar bg-slate-50/10 rounded-2xl border border-slate-100/50 p-1">
                {performanceData ? (
                    <PerformancePanel data={performanceData} />
                ) : (
                    <div className="h-full bg-white rounded-2xl border border-dotted border-slate-200 flex flex-col items-center justify-center p-12 group transition-all">
                        <Users className="text-slate-200 mb-6 group-hover:scale-110 transition-transform" size={48} />
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 text-center">Executive Intelligence Matrix</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter text-center">Search above to load real-time personnel analytics</p>
                    </div>
                )}
            </div>

            {/* Daily Operational Side View */}
            <div className="flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    <TodayStatsTable title="Daily Leads" data={todayStats?.leads_by_bde || []} type="BDE" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <TodayStatsTable title="Daily Bookings" data={todayStats?.bookings_by_bdm || []} type="BDM" />
                </div>
                
                <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-xl flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[8px] font-black uppercase text-indigo-200 tracking-widest leading-none mb-2">Live Leads</p>
                        <p className="text-2xl font-black leading-none">{todayStats?.total_leads_today || 0}</p>
                    </div>
                    <div className="w-px h-8 bg-indigo-500 mx-4 opacity-50" />
                    <div className="text-right">
                        <p className="text-[8px] font-black uppercase text-indigo-200 tracking-widest leading-none mb-2">Live Bookings</p>
                        <p className="text-2xl font-black leading-none">{todayStats?.total_bookings_today || 0}</p>
                    </div>
                </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
