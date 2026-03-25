import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import Layout from './components/Layout';
import AdminDashboard from './dashboard/AdminDashboard';
import ClientListPage from './clients/ClientListPage';
import BookingListPage from './bookings/BookingListPage';
import BookingFormPage from './bookings/BookingFormPage';
import LeadListPage from './leads/LeadListPage';
import LeadAssignmentRulesPage from './leads/LeadAssignmentRulesPage';
import PublicLeadFormPage from './leads/PublicLeadFormPage';
import AttributesPage from './attributes/AttributesPage';
import PaymentListPage from './payments/PaymentListPage';
import PaymentFormPage from './payments/PaymentFormPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/bookings/new" element={<BookingFormPage />} />
        <Route path="/leads/new" element={<PublicLeadFormPage />} />

        {/* Admin-only private routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/bookings" element={<BookingListPage />} />
            <Route path="/bookings/:bookingId/edit" element={<BookingFormPage />} />
            <Route path="/payments" element={<PaymentListPage />} />
            <Route path="/payments/new" element={<PaymentFormPage />} />
            <Route path="/payments/:paymentId/edit" element={<PaymentFormPage />} />
            <Route path="/attributes" element={<AttributesPage />} />
            <Route path="/leads" element={<LeadListPage />} />
            <Route path="/leads/assignment-rules" element={<LeadAssignmentRulesPage />} />
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
