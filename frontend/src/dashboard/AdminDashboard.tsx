import React, { useEffect, useState } from 'react';
import { Users, Calendar, TrendingUp, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

interface Stats {
  totalClients: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
}

const StatCard = ({
  label,
  value,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
  >
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, bookingsRes, pendingRes, completedRes] = await Promise.all([
          apiClient.get('/clients/?page=1&page_size=1'),
          apiClient.get('/bookings/?page=1&page_size=1'),
          apiClient.get('/bookings/?status=pending&page=1&page_size=1'),
          apiClient.get('/bookings/?status=completed&page=1&page_size=1'),
        ]);
        setStats({
          totalClients: clientsRes.data.count ?? (clientsRes.data.results?.length ?? 0),
          totalBookings: bookingsRes.data.count ?? (bookingsRes.data.results?.length ?? 0),
          pendingBookings: pendingRes.data.count ?? (pendingRes.data.results?.length ?? 0),
          completedBookings: completedRes.data.count ?? (completedRes.data.results?.length ?? 0),
        });
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8 px-2 lg:px-0">
      {/* Header */}
      <div className="px-2 lg:px-0">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">Overview</p>
        <h1 className="mt-2 text-2xl lg:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 hidden sm:block">
          Real-time summary of all clients and bookings managed through the BDE form.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <StatCard
            label="Total Clients"
            value={stats.totalClients}
            icon={<Users size={26} className="text-indigo-600" />}
            color="bg-indigo-50"
            onClick={() => navigate('/clients')}
          />
          <StatCard
            label="Total Bookings"
            value={stats.totalBookings}
            icon={<Calendar size={26} className="text-blue-600" />}
            color="bg-blue-50"
            onClick={() => navigate('/bookings')}
          />
          <StatCard
            label="Pending Bookings"
            value={stats.pendingBookings}
            icon={<TrendingUp size={26} className="text-amber-600" />}
            color="bg-amber-50"
            onClick={() => navigate('/bookings?status=pending')}
          />
          <StatCard
            label="Completed"
            value={stats.completedBookings}
            icon={<ClipboardCheck size={26} className="text-green-600" />}
            color="bg-green-50"
            onClick={() => navigate('/bookings?status=completed')}
          />
        </div>
      )}

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/bookings/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Open Public Booking Form ↗
          </a>
          <button
            onClick={() => navigate('/clients')}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            View All Clients
          </button>
          <button
            onClick={() => navigate('/bookings')}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
