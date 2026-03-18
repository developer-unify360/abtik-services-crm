import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import Layout from './components/Layout';
import ClientListPage from './clients/ClientListPage';
import BookingListPage from './bookings/BookingListPage';
import TenantListPage from './tenants/TenantListPage';
import UserListPage from './users/UserListPage';
import ServiceManagement from './services/pages/ServiceManagement';
import ServiceRequestList from './services/pages/ServiceRequestList';
import TaskQueue from './services/pages/TaskQueue';
import KanbanBoard from './tasks/pages/KanbanBoard';
import { ClientService } from './clients/ClientService';
import { BookingService } from './bookings/BookingService';
import { useServiceStore } from './services/store/useServiceStore';

const DashboardPage: React.FC = () => {
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
      try {
        const clientsData = await ClientService.list({ page_size: '1' });
        const totalClients = clientsData.count || 0;

        const bookingsData = await BookingService.list({});
        const allBookings = bookingsData.results || bookingsData || [];
        
        const activeBookings = allBookings.filter((b: any) => 
          b.status !== 'completed' && b.status !== 'cancelled'
        ).length;

        const pendingTasks = serviceRequests.filter((r: any) => 
          r.status === 'pending' || r.status === 'assigned'
        ).length;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyRevenue = allBookings
          .filter((b: any) => b.status === 'completed' && new Date(b.booking_date) >= startOfMonth)
          .length * 5000;

        setStats({
          totalClients,
          activeBookings,
          pendingTasks,
          monthlyRevenue,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [serviceRequests]);

  const cards = [
    { label: 'Total Clients', value: loading ? '...' : stats.totalClients, color: '#4f46e5', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-500' },
    { label: 'Active Bookings', value: loading ? '...' : stats.activeBookings, color: '#059669', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
    { label: 'Pending Tasks', value: loading ? '...' : stats.pendingTasks, color: '#d97706', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' },
    { label: 'Monthly Revenue', value: loading ? '...' : `${stats.monthlyRevenue.toLocaleString()}`, color: '#dc2626', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div 
            key={card.label}
            className={`card ${card.bgColor} border-l-4`}
            style={{ borderLeftColor: card.color }}
          >
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className="text-3xl font-bold" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/bookings" element={<BookingListPage />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/tenants" element={<TenantListPage />} />
            <Route path="/services" element={<ServiceManagement />} />
            <Route path="/service-requests" element={<ServiceRequestList />} />
            <Route path="/tasks" element={<TaskQueue />} />
            <Route path="/kanban" element={<KanbanBoard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
