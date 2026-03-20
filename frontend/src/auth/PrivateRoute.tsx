import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './authStore';

const PrivateRoute: React.FC = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    const hasToken = !!(stored?.access || stored?.refresh || stored?.token || stored?.user?.access);

    if (!(isAuthenticated || hasToken)) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
