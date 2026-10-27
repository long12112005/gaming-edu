import { create } from 'zustand';
import Cookies from 'js-cookie';

export interface UserQuota {
  aiGenerationLimit: number;
  aiUsedToday: number;
  maxRoomCapacity: number;
  resetDate?: string | null;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  avatarUrl?: string;
  avatar_frame?: string;
  avatarFrame?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  status?: string;
  quota?: UserQuota;
  ai_generation_limit?: number;
  ai_used_today?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  setUser: (updatedUser: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // initial load from cookies if available
  const token = Cookies.get('token') || null;
  const userStr = Cookies.get('user');
  let user: User | null = null;
  
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      console.error('Failed to parse user cookie');
    }
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    login: (user, token) => {
      Cookies.set('token', token, { expires: 7 }); // 7 days
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      set({ user, token, isAuthenticated: true });
    },
    setUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        Cookies.set('user', JSON.stringify(newUser), { expires: 7 });
        return { user: newUser };
      });
    },
    logout: () => {
      Cookies.remove('token');
      Cookies.remove('user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  };
});
