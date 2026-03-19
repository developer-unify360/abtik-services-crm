
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
import ServiceDashboard from './services/pages/ServiceDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<ServiceDashboard />} />
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
