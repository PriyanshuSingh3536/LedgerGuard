import { get } from './client';
import type { Me } from '../types';

export const getMe = () => get<Me>('/auth/me');

// Login endpoint abhi backend mein nahi hai, isliye mock use ho raha hai
export async function login(email: string, password: string): Promise<string> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    if (!email || !password) throw new Error('Email aur password daalo');
    return 'mock-token';
  }
  throw new Error('Login endpoint abhi connect nahi hua');
}