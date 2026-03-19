import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { canAccessPath, getDefaultRouteForUser } from './roleUtils';
import { userNeedsTenantSelection } from './tenantSelection';

const PrivateRoute: React.FC = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const user = useAuthStore(state => state.user);
    const location = useLocation();
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    const hasToken = !!(stored?.access || stored?.refresh || stored?.token || stored?.user?.access);
    const currentUser = user || stored?.user || stored || null;

    if (!(isAuthenticated || hasToken)) {
        return <Navigate to="/login" replace />;
    }

    if (userNeedsTenantSelection(currentUser, stored) && location.pathname !== '/tenants') {
        return <Navigate to="/tenants" replace />;
    }

    if (!canAccessPath(location.pathname, currentUser)) {
        return <Navigate to={getDefaultRouteForUser(currentUser)} replace />;
    }

    return <Outlet />;
};

export default PrivateRoute;
