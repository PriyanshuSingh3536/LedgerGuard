import axios from 'axios';
import type { ApiSuccess } from '../types';

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };
export const getToken = () => token;

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('lg:unauthorized')); // AuthContext sun kar logout karega
    }
    return Promise.reject(new Error(err.response?.data?.message ?? 'Network error'));
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