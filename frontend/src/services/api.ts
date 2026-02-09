import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';
import type { ApiResponse, AuthResponse, User, Model, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    factory_id?: number;
  }) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: { full_name?: string; email?: string }) => {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data);
    return response.data;
  },

  changePassword: async (current_password: string, new_password: string) => {
    const response = await api.put<ApiResponse>('/auth/password', {
      current_password,
      new_password,
    });
    return response.data;
  },
};

// Models API
export const modelsApi = {
  getModels: async (params?: {
    collection_id?: number;
    status?: string;
    product_type?: string;
    search?: string;
    buyer_approval?: string;
    constructor_approval?: string;
    date_from?: string;
    date_to?: string;
    model_name?: string;
    model_number?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Model>>>('/models', {
      params,
    });
    return response.data;
  },

  getModelById: async (id: number) => {
    const response = await api.get<ApiResponse<Model>>(`/models/${id}`);
    return response.data;
  },

  createModel: async (data: {
    collection_id: number;
    model_number: string;
    model_name?: string;
    product_type: string;
    category?: string;
    fit_type?: string;
  }) => {
    const response = await api.post<ApiResponse<Model>>('/models', data);
    return response.data;
  },

  updateModel: async (
    id: number,
    data: {
      model_name?: string;
      product_type?: string;
      category?: string;
      fit_type?: string;
      status?: string;
    }
  ) => {
    const response = await api.put<ApiResponse<Model>>(`/models/${id}`, data);
    return response.data;
  },

  deleteModel: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/models/${id}`);
    return response.data;
  },

  assignFactory: async (id: number, factory_id: number) => {
    const response = await api.put<ApiResponse<Model>>(
      `/models/${id}/assign-factory`,
      { factory_id }
    );
    return response.data;
  },
};

// Comments API
export const commentsApi = {
  getStageComments: async (model_id: number, stage?: string) => {
    const response = await api.get<ApiResponse<any[]>>('/comments/stage', {
      params: { model_id, stage },
    });
    return response.data;
  },

  addStageComment: async (data: {
    model_id: number;
    stage: string;
    comment_text?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/comments/stage', data);
    return response.data;
  },

  addCommentAttachment: async (data: {
    comment_id: number;
    file_url: string;
    file_name?: string;
    file_type?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/comments/attachments', data);
    return response.data;
  },

  getChinaOfficeUploads: async (model_id: number, stage?: string) => {
    const response = await api.get<ApiResponse<any[]>>('/comments/china-office-uploads', {
      params: { model_id, stage },
    });
    return response.data;
  },

  addChinaOfficeUpload: async (data: {
    model_id: number;
    stage: string;
    upload_type: string;
    file_url: string;
    file_name?: string;
    description?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>(
      '/comments/china-office-uploads',
      data
    );
    return response.data;
  },

  getPPSApprovals: async (model_id: number) => {
    const response = await api.get<ApiResponse<any[]>>('/comments/pps-approvals', {
      params: { model_id },
    });
    return response.data;
  },

  addPPSApproval: async (data: {
    model_id: number;
    is_approved: boolean;
    comment?: string;
  }) => {
    const response = await api.post<ApiResponse<any>>('/comments/pps-approvals', data);
    return response.data;
  },
};

export default api;
