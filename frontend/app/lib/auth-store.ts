import { create } from "zustand";
import { authApi, type AuthResponse } from "./api";

interface User {
  id: string;
  email: string;
  role: "student" | "warden";
  student?: {
    rollNumber: string;
    fullName: string;
    year: number;
    program: string;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    role: "student" | "warden";
    rollNumber?: string;
    fullName?: string;
    year?: number;
    program?: string;
  }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    const { accessToken, user } = response.data;
    localStorage.setItem("accessToken", accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const response = await authApi.register(data);
    const { accessToken, user } = response.data;
    localStorage.setItem("accessToken", accessToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await authApi.getProfile();
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("accessToken");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
