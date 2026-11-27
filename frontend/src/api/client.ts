import axios from 'axios';

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };
export const getToken = () => token;

export class ApiError extends Error {
  status?: number; // undefined = server se koi response nahi aaya
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof msg === 'string' && msg) return msg;
    if (err.code === 'ECONNABORTED') return 'The request timed out.';
    if (!err.response) return 'Cannot reach the server.';
    return `Request failed (${err.response.status}).`;
  }
  return 'Unexpected error.';
}

// timeout zaroori hai, warna atka hua request kabhi khatam nahi hota
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('lg:unauthorized'));
    }
    return Promise.reject(
      new ApiError(errorMessage(err), axios.isAxiosError(err) ? err.response?.status : undefined)
    );
  }
);

// Backend { success, data } bhejta hai; agar wrapper na ho toh poori body wapas
export function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) return (body as { data: T }).data;
  return body as T;
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get(url, { params });
  return unwrap<T>(res.data);
}

export async function getBody(url: string, params?: Record<string, unknown>): Promise<unknown> {
  const res = await api.get(url, { params });
  return res.data;
}

export async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await api.post(url, body);
  return unwrap<T>(res.data);
}