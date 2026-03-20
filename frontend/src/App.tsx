import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import Layout from './components/Layout';
import AdminDashboard from './dashboard/AdminDashboard';
import ClientListPage from './clients/ClientListPage';
import BookingListPage from './bookings/BookingListPage';
import BookingFormPage from './bookings/BookingFormPage';
import BanksPage from './bookings/BanksPage';
import ServiceManagement from './services/pages/ServiceManagement';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/bookings/new" element={<BookingFormPage />} />

        {/* Admin-only private routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/bookings" element={<BookingListPage />} />
            <Route path="/bookings/:bookingId/edit" element={<BookingFormPage />} />
            <Route path="/banks" element={<BanksPage />} />
            <Route path="/services" element={<ServiceManagement />} />
            {/* Catch-all: redirect unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Unauthenticated catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
