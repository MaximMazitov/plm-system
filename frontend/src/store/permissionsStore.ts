import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface Permissions {
  can_view_dashboard: boolean;
  can_view_models: boolean;
  can_create_models: boolean;
  can_edit_models: boolean;
  can_delete_models: boolean;
  can_edit_model_status: boolean;
  can_view_files: boolean;
  can_upload_files: boolean;
  can_delete_files: boolean;
  can_view_materials: boolean;
  can_edit_materials: boolean;
  can_delete_materials: boolean;
  can_view_comments: boolean;
  can_create_comments: boolean;
  can_edit_own_comments: boolean;
  can_delete_own_comments: boolean;
  can_delete_any_comments: boolean;
  can_view_collections: boolean;
  can_edit_collections: boolean;
  can_view_seasons: boolean;
  can_edit_seasons: boolean;
  can_view_users: boolean;
  can_create_users: boolean;
  can_edit_users: boolean;
  can_delete_users: boolean;
  can_approve_as_buyer: boolean;
  can_approve_as_constructor: boolean;
}

interface PermissionsStore {
  permissions: Permissions | null;
  isLoading: boolean;
  loadPermissions: () => Promise<void>;
  hasPermission: (permission: keyof Permissions) => boolean;
  clearPermissions: () => void;
}

export const usePermissionsStore = create<PermissionsStore>((set, get) => ({
  permissions: null,
  isLoading: false,

  loadPermissions: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ permissions: null, isLoading: false });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/me/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        set({ permissions: data.data, isLoading: false });
      } else {
        set({ permissions: null, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      set({ permissions: null, isLoading: false });
    }
  },

  hasPermission: (permission: keyof Permissions) => {
    const { permissions } = get();
    if (!permissions) return false;
    return permissions[permission] === true;
  },

  clearPermissions: () => {
    set({ permissions: null });
  }
}));
