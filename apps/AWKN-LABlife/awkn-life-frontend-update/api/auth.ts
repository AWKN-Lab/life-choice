/**
 * 认证 API 客户端 - 对接真实后端
 */
import apiClient from './client';

const AUTH_BASE = '/auth';

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
  };
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  nickname?: string;
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
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    return res;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${AUTH_BASE}/register`, data);
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    return res;
  },

  wxLogin: async (data: WxLoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(`${AUTH_BASE}/wx-login`, data);
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    return res;
  },

  logout: async () => {
    try {
      await apiClient.post(`${AUTH_BASE}/logout`, {});
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/user/profile');
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return apiClient.patch<UserProfile>('/user/profile', data);
  },
};