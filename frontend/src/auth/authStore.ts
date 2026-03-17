import { create } from 'zustand';

interface AuthState {
    user: any | null;
    isAuthenticated: boolean;
    login: (userData: any) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    const initialUser = stored?.user || stored || null;
    const initialIsAuthenticated = !!(stored?.access || stored?.token || stored?.refresh || stored);

    return {
      user: initialUser,
      isAuthenticated: initialIsAuthenticated,
      login: (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData.user || userData, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('user');
        set({ user: null, isAuthenticated: false });
      }
    };
});
