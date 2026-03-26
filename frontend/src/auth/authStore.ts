import { create } from 'zustand';

export const normalizeRole = (role: unknown): string | null => {
    if (typeof role !== 'string') {
        return null;
    }

    const normalizedRole = role.trim().toLowerCase();
    return normalizedRole || null;
};

export const normalizeAuthUser = (user: any | null) => {
    if (!user) {
        return null;
    }

    const role = normalizeRole(user.role);
    const isAdmin = Boolean(
        role === 'admin' ||
        user.is_admin ||
        user.is_staff ||
        user.is_superuser
    );

    return {
        ...user,
        role,
        is_admin: isAdmin,
        is_staff: Boolean(user.is_staff || user.is_superuser),
        is_superuser: Boolean(user.is_superuser),
    };
};

const normalizeStoredAuth = (stored: any) => {
    if (!stored) {
        return null;
    }

    const normalizedUser = normalizeAuthUser(stored.user || stored);

    if (stored.user || stored.access || stored.refresh || stored.token) {
        return {
            ...stored,
            user: normalizedUser,
        };
    }

    return normalizedUser;
};

export const hasAdminAccess = (user: any | null) => Boolean(normalizeAuthUser(user)?.is_admin);

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    login: (userData: any) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
    const stored = normalizeStoredAuth(JSON.parse(localStorage.getItem('user') || 'null'));
    const initialUser = stored?.user || stored || null;
    const initialIsAuthenticated = !!(stored?.access || stored?.token || stored?.refresh || stored);

    return {
        user: initialUser,
        isAuthenticated: initialIsAuthenticated,
        login: (userData) => {
            const normalizedAuth = normalizeStoredAuth(userData);
            localStorage.setItem('user', JSON.stringify(normalizedAuth));
            set({ user: normalizedAuth?.user || normalizedAuth, isAuthenticated: true });
        },
        logout: () => {
            localStorage.removeItem('user');
            set({ user: null, isAuthenticated: false });
        }
    };
});
