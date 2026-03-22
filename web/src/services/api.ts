import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Auto-refresh on 401 (token expired)
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config) & { _retry?: boolean };
    if (error.response?.status === 401 && !original?._retry && original?.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers!.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        setAccessToken(data.accessToken);
        refreshQueue.forEach((cb) => cb(data.accessToken));
        refreshQueue = [];
        original.headers!.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Typed API helpers
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; role: string }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ id: string; role: string; hasBiometric: boolean; lastLoginAt: string }>('/auth/me'),
};

export const patientApi = {
  list: (params?: { page?: number; limit?: number }) => api.get('/patients', { params }),
  get: (id: string) => api.get(`/patients/${id}`),
  search: (q: string) => api.get('/patients/search', { params: { q } }),
  create: (data: unknown) => api.post('/patients', data),
  update: (id: string, data: unknown) => api.put(`/patients/${id}`, data),
};

export const sessionApi = {
  list: (params?: Record<string, unknown>) => api.get('/sessions', { params }),
  get: (id: string) => api.get(`/sessions/${id}`),
  create: (data: unknown) => api.post('/sessions', data),
  update: (id: string, data: unknown) => api.put(`/sessions/${id}`, data),
  sign: (id: string, data: { signatureData: string; biometricVerified: boolean }) =>
    api.post(`/sessions/${id}/sign`, data),
};

export const userApi = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  toggle: (id: string) => api.patch(`/users/${id}/toggle`),
  changePassword: (data: unknown) => api.post('/users/change-password', data),
  auditLogs: (params?: unknown) => api.get('/audit-logs', { params }),
};
