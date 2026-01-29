import { create } from 'zustand';
import type { User } from '../types';
import { usePermissionsStore } from './permissionsStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
    // Load permissions after setting auth
    usePermissionsStore.getState().loadPermissions();
  },

  clearAuth: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
    // Clear permissions when logging out
    usePermissionsStore.getState().clearPermissions();
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

// Initialize auth state from localStorage
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

if (storedUser && storedToken) {
  try {
    const user = JSON.parse(storedUser);
    useAuthStore.setState({
      user,
      token: storedToken,
      isAuthenticated: true,
    });
    // Load permissions on app initialization
    usePermissionsStore.getState().loadPermissions();
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
}
