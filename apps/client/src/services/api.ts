import axios from 'axios';

// ------------------------------------------------------------------
// 1. CONFIGURACIÓN DINÁMICA DE RED (Para que ande en Celular y PC)
// ------------------------------------------------------------------
const protocol = window.location.protocol;
const hostname = window.location.hostname;
const port = '3000';

const API_URL = `${protocol}//${hostname}:${port}/api`;
console.log('🔗 Conectando a API en:', API_URL);

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor para agregar el Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Interceptor para manejar errores (Logout si es 401)
api.interceptors.response.use(
    (response) => response, // Devolvemos response completo para que el service decida si usa .data
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ------------------------------------------------------------------
// 2. SERVICIOS
// ------------------------------------------------------------------

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

export const inventoryService = {
    // Auxiliares
    getCategories: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/categories', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    getUnits: async () => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/units', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    getProviders: async () => { // <--- NUEVO
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/providers', { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },

    getBranches: async () => {
        const response = await api.get('/branches'); // Reutilizamos el endpoint general
        return Array.isArray(response.data) ? response.data : (response.data.data || []);
    },

    // Productos (CRUD Completo)
    getProducts: async (page = 1, limit = 10, search = '', categoryId = '', providerId = '', withDeleted = false) => {
        const token = localStorage.getItem('token');
        const response = await api.get('/inventory/products', {
            // Axios arma la query string automáticamente con estos params
            params: { page, limit, search, categoryId, providerId, withDeleted },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },
    createProduct: async (data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.post('/inventory/products', data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    updateProduct: async (id: string, data: any) => {
        const token = localStorage.getItem('token');
        const response = await api.patch(`/inventory/products/${id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    },
    deleteProduct: async (id: string, hardDelete = false) => {
        await api.delete(`/inventory/products/${id}`, { params: { hardDelete } });
    },

    restoreProduct: async (id: string) => {
        const token = localStorage.getItem('token');
        await api.patch(`/inventory/products/${id}/restore`, {}, { headers: { Authorization: `Bearer ${token}` } });
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