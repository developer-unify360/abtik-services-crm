import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import { useAuthStore } from './auth/authStore';
import { getDefaultRouteForUser, hasPayrollAccess, isAdminUser, isHrUser, isBdeUser, isSalesManager } from './auth/roleUtils';
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
import PayrollAttendanceRulesPage from './payroll/PayrollAttendanceRulesPage';
import PayrollCompanySetupPage from './payroll/PayrollCompanySetupPage';
import PayrollEmployeeFormPage from './payroll/PayrollEmployeeFormPage';
import PayrollEmployeesPage from './payroll/PayrollEmployeesPage';
import PayrollPayslipGeneratorPage from './payroll/PayrollPayslipGeneratorPage';
import PayrollSalaryRulesPage from './payroll/PayrollSalaryRulesPage';
import ITDeliveryPage from './delivery/ITDeliveryPage';
import ITDeliveryDetailPage from './delivery/ITDeliveryDetailPage';
import ClientDocumentsPage from './delivery/ClientDocumentsPage';
import DocumentPortalsPage from './delivery/DocumentPortalsPage';
import PublicDocumentUploadPage from './delivery/PublicDocumentUploadPage';

function DefaultRouteRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultRouteForUser(user)} replace />;
}

function RouteAccessGuard({ allow }: { allow: (user: any) => boolean }) {
  const user = useAuthStore((state) => state.user);

  if (!allow(user)) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return <Outlet />;
}

function getAdminBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  const { protocol, hostname } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000`;
  }

  if (hostname.startsWith('crm.')) {
    return `${protocol}//${hostname.replace(/^crm\./, 'api.')}`;
  }

  return window.location.origin;
}

function AdminRedirect() {
  const location = useLocation();

  useEffect(() => {
    const adminBaseUrl = getAdminBaseUrl();
    const adminPath = location.pathname.startsWith('/admin/')
      ? location.pathname
      : '/admin/';
    const targetUrl = `${adminBaseUrl}${adminPath}${location.search}${location.hash}`;

    window.location.replace(targetUrl);
  }, [location.hash, location.pathname, location.search]);

  return null;
}

function BookingFormRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const stored = JSON.parse(localStorage.getItem('user') || 'null');
  const hasToken = !!(stored?.access || stored?.refresh || stored?.token || stored?.user?.access);

  if (isAuthenticated || hasToken) {
    return (
      <Layout>
        <BookingFormPage />
      </Layout>
    );
  }

  return <BookingFormPage />;
}

function App() {
  return (
    <>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/admin/*" element={<AdminRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/bookings/new" element={<BookingFormRoute />} />
          <Route path="/leads/new" element={<PublicLeadFormPage />} />
          <Route path="/documents/upload/:token" element={<PublicDocumentUploadPage />} />

          {/* Private routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DefaultRouteRedirect />} />

              {/* General Staff / BDE Access */}
              <Route element={<RouteAccessGuard allow={(user) => !isHrUser(user) && !isBdeUser(user) && !isSalesManager(user)} />}>
                <Route path="/dashboard" element={<AdminDashboard />} />
              </Route>
              <Route element={<RouteAccessGuard allow={(user) => !isHrUser(user)} />}>
                <Route path="/clients" element={<ClientListPage />} />
                <Route path="/bookings" element={<BookingListPage />} />
                <Route path="/bookings/:bookingId/edit" element={<BookingFormPage />} />
                <Route path="/payments" element={<PaymentListPage />} />
                <Route path="/payments/new" element={<PaymentFormPage />} />
                <Route path="/payments/:paymentId/edit" element={<PaymentFormPage />} />
                <Route path="/leads" element={<LeadListPage />} />
                <Route path="/it-delivery" element={<ITDeliveryPage />} />
                <Route path="/it-delivery/:requestId" element={<ITDeliveryDetailPage />} />
                <Route path="/client-documents" element={<ClientDocumentsPage />} />
                <Route path="/document-portals" element={<DocumentPortalsPage />} />
              </Route>

              {/* Admin-only sections */}
              <Route element={<RouteAccessGuard allow={isAdminUser} />}>
                <Route path="/attributes" element={<AttributesPage />} />
                <Route path="/leads/assignment-rules" element={<LeadAssignmentRulesPage />} />
              </Route>

              {/* Payroll sections */}
              <Route element={<RouteAccessGuard allow={hasPayrollAccess} />}>
                <Route path="/payroll" element={<Navigate to="/payroll/company-setup" replace />} />
                <Route path="/payroll/company-setup" element={<PayrollCompanySetupPage />} />
                <Route path="/payroll/salary-rules" element={<PayrollSalaryRulesPage />} />
                <Route path="/payroll/attendance-rules" element={<PayrollAttendanceRulesPage />} />
                <Route path="/payroll/employees" element={<PayrollEmployeesPage />} />
                <Route path="/payroll/employees/new" element={<PayrollEmployeeFormPage />} />
                <Route path="/payroll/employees/:employeeId/edit" element={<PayrollEmployeeFormPage />} />
                <Route path="/payroll/payslip-generator" element={<PayrollPayslipGeneratorPage />} />
              </Route>

              <Route path="*" element={<DefaultRouteRedirect />} />
            </Route>
          </Route>

          {/* Unauthenticated catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          className: 'text-sm font-medium',
          style: {
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}

export default App;
