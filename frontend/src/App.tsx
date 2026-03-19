
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import PrivateRoute from './auth/PrivateRoute';
import { useAuthStore } from './auth/authStore';
import { getDefaultRouteForUser } from './auth/roleUtils';
import { getStoredAuthData, userNeedsTenantSelection } from './auth/tenantSelection';
import Layout from './components/Layout';
import ClientListPage from './clients/ClientListPage';
import BookingListPage from './bookings/BookingListPage';
import BookingFormPage from './bookings/BookingFormPage';
import TenantListPage from './tenants/TenantListPage';
import UserListPage from './users/UserListPage';
import ServiceManagement from './services/pages/ServiceManagement';
import ServiceRequestList from './services/pages/ServiceRequestList';
import TaskQueue from './services/pages/TaskQueue';
import KanbanBoard from './tasks/pages/KanbanBoard';
import ServiceDashboard from './services/pages/ServiceDashboard';

function HomeRedirect() {
  const user = useAuthStore((state) => state.user);
  const stored = getStoredAuthData();
  const currentUser = user || stored?.user || stored || null;
  const nextRoute = userNeedsTenantSelection(currentUser, stored)
    ? '/tenants'
    : getDefaultRouteForUser(currentUser);

  return <Navigate to={nextRoute} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/dashboard" element={<ServiceDashboard />} />
            <Route path="/clients" element={<ClientListPage />} />
            <Route path="/bookings" element={<BookingListPage />} />
            <Route path="/bookings/new" element={<BookingFormPage />} />
            <Route path="/bookings/:bookingId/edit" element={<BookingFormPage />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/tenants" element={<TenantListPage />} />
            <Route path="/services" element={<ServiceManagement />} />
            <Route path="/service-requests" element={<ServiceRequestList />} />
            <Route path="/tasks" element={<TaskQueue />} />
            <Route path="/kanban" element={<KanbanBoard />} />
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
