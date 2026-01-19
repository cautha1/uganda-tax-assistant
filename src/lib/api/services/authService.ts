import { apiClient } from '../client';

// Types for Auth endpoints
export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: 'sme_owner' | 'accountant' | 'admin';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
    };
    token: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
  };
}

export const authService = {
  // POST /api/v1/auth/register
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', payload);
    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response;
  },

  // POST /api/v1/auth/login
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response;
  },

  // GET /api/v1/auth/me
  getProfile: async (): Promise<ProfileResponse> => {
    return apiClient.get<ProfileResponse>('/auth/me');
  },

  // POST /api/v1/auth/logout
  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    localStorage.removeItem('auth_token');
    return response;
  },

  // Helper to check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  },

  // Get stored token
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
};
