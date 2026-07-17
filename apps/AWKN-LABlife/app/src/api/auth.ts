/**
 * 认证 API 客户端 - 对接真实后端
 */
import apiClient, { setUserId } from './client';
import { setAuthToken, removeAuthToken } from '@/lib/tokenStorage';

const AUTH_BASE = '/auth';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface WxLoginRequest {
  wxOpenId: string;
  nickname?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname?: string;
    isAdmin?: boolean;
    creditBalance?: number;
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
  isAdmin?: boolean;
  creditBalance?: number;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  timezone?: string;
  membership?: {
    planId: string;
    planName: string;
    status: string;
    expireDate?: string;
  };
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${AUTH_BASE}/login`, data);
    setAuthToken(res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setUserId(res.user.id);
    return res;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${AUTH_BASE}/register`, data);
    setAuthToken(res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setUserId(res.user.id);
    return res;
  },

  wxLogin: async (data: WxLoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${AUTH_BASE}/wx-login`, data);
    setAuthToken(res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setUserId(res.user.id);
    return res;
  },

  logout: async () => {
    try {
      await apiClient.post(`${AUTH_BASE}/logout`, {});
    } finally {
      removeAuthToken();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem('auth_user_id');
    }
  },

  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/user/profile');
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return apiClient.patch<UserProfile>('/user/profile', data);
  },
};
