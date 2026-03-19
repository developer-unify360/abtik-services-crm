import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/auth';

export const AuthService = {
    login: async (email: string, password: string) => {
        const response = await axios.post(`${API_URL}/login`, { email, password });
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
