import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import Layout from './components/Layout';
import ClientListPage from './clients/ClientListPage';
import BookingListPage from './bookings/BookingListPage';
import TenantListPage from './tenants/TenantListPage';
import { Box, Typography, Paper, Grid } from '@mui/material';

const DashboardPage: React.FC = () => (
  <Box>
    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a2e', mb: 3 }}>Dashboard</Typography>
    <Grid container spacing={3}>
      {[
        { label: 'Total Clients', value: '—', color: '#4f46e5' },
        { label: 'Active Bookings', value: '—', color: '#059669' },
        { label: 'Pending Tasks', value: '—', color: '#d97706' },
        { label: 'Monthly Revenue', value: '—', color: '#dc2626' },
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
            <Route path="/tenants" element={<TenantListPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

