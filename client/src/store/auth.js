import { create } from 'zustand';
import { auth } from '../api/endpoints.js';

export const useAuth = create((set, get) => ({
  user: null,
  booted: false,

  boot: async () => {
    try {
      const { user } = await auth.me();
      set({ user, booted: true });
    } catch {
      set({ user: null, booted: true });
    }
  },

  login: async (email, password) => {
    const { user } = await auth.login(email, password);
    set({ user });
    return user;
  },

  logout: async () => {
    try {
      await auth.logout();
    } finally {
      set({ user: null });
    }
  },

  isLevel: (lvl) => get().user?.level === lvl,
  setAuth: (user) => set({ user }),
}));
