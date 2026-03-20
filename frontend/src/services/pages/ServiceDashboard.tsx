import React, { useEffect, useState } from 'react';
import { ClientService } from '../../clients/ClientService';
import { BookingService } from '../../bookings/BookingService';
import { useServiceStore } from '../store/useServiceStore';

const ServiceDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeBookings: 0,
    pendingTasks: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { fetchServiceRequests, serviceRequests } = useServiceStore();

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const clientsData = await ClientService.list({ page_size: '1' });
        const totalClients = clientsData?.count || 0;

        const bookingsData = await BookingService.list({});
        const allBookings = bookingsData?.results || bookingsData || [];

        const activeBookings = allBookings.filter((b: { status: string }) =>
          b.status !== 'completed' && b.status !== 'cancelled'
        ).length;

        const pendingTasks = serviceRequests.filter((r) =>
          r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress'
        ).length;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyRevenue = allBookings
          .filter((b: { status: string; booking_date: string }) => b.status === 'completed' && new Date(b.booking_date) >= startOfMonth)
          .reduce((sum: number, b: { revenue?: number }) => sum + (b.revenue || 0), 0);

        setStats({ totalClients, activeBookings, pendingTasks, monthlyRevenue });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [serviceRequests]);

  const cards = [
    { label: 'Total Clients', value: loading ? '...' : stats.totalClients, border: 'border-indigo-500' },
    { label: 'Active Bookings', value: loading ? '...' : stats.activeBookings, border: 'border-green-500' },
    { label: 'Open Requests', value: loading ? '...' : stats.pendingTasks, border: 'border-yellow-500' },
    { label: 'Monthly Revenue', value: loading ? '...' : `$${stats.monthlyRevenue.toLocaleString()}`, border: 'border-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Role-driven Operations Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className={`card border-l-4 p-4 ${card.border}`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Create new service request</p>
            <p className="text-xl font-bold">Fast-add workflow</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Assignment board</p>
            <p className="text-xl font-bold">Prioritize ready tasks</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Task pipeline</p>
            <p className="text-xl font-bold">Move from pending to completed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDashboard;
