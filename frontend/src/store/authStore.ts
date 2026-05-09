import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const savedToken = localStorage.getItem('auth_token');
const savedUser = localStorage.getItem('auth_user');

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  user: savedUser ? JSON.parse(savedUser) : null,
  login: (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ token: null, user: null });
  },
}));
