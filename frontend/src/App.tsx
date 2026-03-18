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
import { ClientService } from './clients/ClientService';
import { BookingService } from './bookings/BookingService';
import { useServiceStore } from './services/store/useServiceStore';
import { Box, Typography, Paper, Grid } from '@mui/material';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeBookings: 0,
    pendingTasks: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { fetchServiceRequests, serviceRequests } = useServiceStore();

  // Fetch service requests on mount
  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  // Calculate stats when serviceRequests are loaded or change
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch clients count
        const clientsData = await ClientService.list({ page_size: '1' });
        const totalClients = clientsData.count || 0;

        // Fetch all bookings
        const bookingsData = await BookingService.list({});
        const allBookings = bookingsData.results || bookingsData || [];
        
        // Active bookings (non-completed, non-cancelled)
        const activeBookings = allBookings.filter((b: any) => 
          b.status !== 'completed' && b.status !== 'cancelled'
        ).length;

        // Pending tasks from service requests
        const pendingTasks = serviceRequests.filter((r: any) => 
          r.status === 'pending' || r.status === 'assigned'
        ).length;

        // Monthly revenue - calculate from completed bookings this month
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

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e', mb: 3 }}>Dashboard</Typography>
      <Grid container spacing={3}>
        {[
          { label: 'Total Clients', value: loading ? '...' : stats.totalClients, color: '#4f46e5' },
          { label: 'Active Bookings', value: loading ? '...' : stats.activeBookings, color: '#059669' },
          { label: 'Pending Tasks', value: loading ? '...' : stats.pendingTasks, color: '#d97706' },
          { label: 'Monthly Revenue', value: loading ? '...' : `${stats.monthlyRevenue.toLocaleString()}`, color: '#dc2626' },
        ].map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Paper sx={{ p: 3, borderRadius: 2, borderLeft: `4px solid ${card.color}` }}>
              <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>{card.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>{card.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with Layout */}
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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

