import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance for uploads
const uploadApi = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
uploadApi.interceptors.request.use(
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

export type FileCategory = 'sketches' | 'techpacks' | 'photos' | 'documents' | 'prints' | 'other';

export interface UploadedFile {
  key: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface UploadResponse {
  success: boolean;
  data: UploadedFile;
  error?: string;
}

export interface MultipleUploadResponse {
  success: boolean;
  data: UploadedFile[];
  error?: string;
}

export interface SignedUrlResponse {
  success: boolean;
  data: {
    url: string;
    expiresIn: number;
  };
  error?: string;
}

export interface StorageStatusResponse {
  success: boolean;
  data: {
    storageConfigured: boolean;
    provider: string;
  };
}

// Check if storage is configured
export const checkStorageStatus = async (): Promise<StorageStatusResponse> => {
  const response = await uploadApi.get<StorageStatusResponse>('/uploads/status');
  return response.data;
};

// Upload single file
export const uploadFile = async (
  file: File,
  category: FileCategory = 'other',
  modelId?: number,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (modelId) {
    formData.append('modelId', modelId.toString());
  }

  const response = await uploadApi.post<UploadResponse>('/uploads/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};

// Upload multiple files
export const uploadMultipleFiles = async (
  files: File[],
  category: FileCategory = 'other',
  modelId?: number,
  onProgress?: (progress: number) => void
): Promise<MultipleUploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('category', category);
  if (modelId) {
    formData.append('modelId', modelId.toString());
  }

  const response = await uploadApi.post<MultipleUploadResponse>('/uploads/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};

// Get signed URL for file access
export const getSignedUrl = async (key: string): Promise<SignedUrlResponse> => {
  const response = await uploadApi.get<SignedUrlResponse>(`/uploads/signed-url/${encodeURIComponent(key)}`);
  return response.data;
};

// Delete file
export const deleteFile = async (key: string): Promise<{ success: boolean }> => {
  const response = await uploadApi.delete<{ success: boolean }>(`/uploads/file/${encodeURIComponent(key)}`);
  return response.data;
};

// List files by prefix
export const listFiles = async (prefix: string): Promise<{ success: boolean; data: string[] }> => {
  const response = await uploadApi.get<{ success: boolean; data: string[] }>(`/uploads/list/${encodeURIComponent(prefix)}`);
  return response.data;
};

export default {
  checkStorageStatus,
  uploadFile,
  uploadMultipleFiles,
  getSignedUrl,
  deleteFile,
  listFiles,
};
