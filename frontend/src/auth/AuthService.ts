import axios from 'axios';

const API_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth` || 'http://localhost:8000/api/v1/auth';

export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await axios.post(`${API_AUTH_URL}/login`, { email, password });
        if (response.data.access) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('user');
    },
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};
