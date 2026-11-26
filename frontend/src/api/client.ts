import axios from 'axios';
import type { ApiSuccess } from '../types';

let token: string | null = null;

export const setToken = (t: string | null) => {
  token = t;
};

export const getToken = () => token;

// API Error Class
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('lg:unauthorized'));
    }

    return Promise.reject(
      new ApiError(
        err.response?.data?.message ?? 'Network error',
        err.response?.status
      )
    );
  }
);

export async function get<T>(url: string): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url);
  return res.data.data;
}

export async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, body);
  return res.data.data;
}