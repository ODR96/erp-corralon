import axios from 'axios';

// 1. Creamos una instancia de Axios configurada
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Lee la variable del .env
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Definimos los servicios de Autenticación
export const authService = {
    login: async (email: string, password: string) => {
        // Hace POST a /auth/login enviando email y password
        const response = await api.post('/auth/login', { email, password });
        return response.data; // Devuelve { access_token, user }
    },
};

export const usersService = {
    // Ahora acepta el parámetro opcional
    getAll: async (withDeleted: boolean = false, page: number = 1, limit: number = 10, search: string = '') => {
        const token = localStorage.getItem('token');
        const response = await api.get(`/users`, {
            params: { withDeleted, page, limit, search }, // Axios arma la URL solo
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data; // Devolverá { data: [], total: 100 }
    },

    // NUEVOS MÉTODOS
    getRoles: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/users/roles', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    getBranches: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/users/branches', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    create: async (user: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/users', user, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    update: async (id: string, user: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/users/${id}`, user, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    delete: async (id: string, hard: boolean = false) => {
        const token = localStorage.getItem('token');
        await api.delete(`/users/${id}?hard=${hard}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // Nuevo método restaurar
    restore: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/users/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

export const branchesService = {
    getAll: async (withDeleted: boolean = false, page: number = 1, limit: number = 10, search: string = '') => {
        const token = localStorage.getItem('token');
        const response = await api.get(`/branches`, {
            params: { withDeleted, page, limit, search },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data; // { data: [], total: N }
    },
    create: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/branches', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    update: async (id: string, data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/branches/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    delete: async (id: string, hard: boolean = false) => {
        const token = localStorage.getItem('token');
        await api.delete(`/branches/${id}?hard=${hard}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
    restore: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/branches/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

export const settingsService = {
    get: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/settings', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    update: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch('/settings', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    }
};

export default api;