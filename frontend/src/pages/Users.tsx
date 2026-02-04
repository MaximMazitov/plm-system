import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/ui';
import { UserPlus, Edit, Trash2, X } from 'lucide-react';
import { usePermissionsStore } from '../store/permissionsStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  factory_id?: number;
}

interface Factory {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

interface UserPermissions {
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
}

export const Users = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissionsStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'designer',
    is_active: true,
    factory_id: null as number | null
  });
  const [factories, setFactories] = useState<Factory[]>([]);

  const [permissions, setPermissions] = useState<UserPermissions>({
    can_view_dashboard: true,
    can_view_models: true,
    can_create_models: false,
    can_edit_models: false,
    can_delete_models: false,
    can_edit_model_status: false,
    can_view_files: true,
    can_upload_files: false,
    can_delete_files: false,
    can_view_materials: true,
    can_edit_materials: false,
    can_delete_materials: false,
    can_view_comments: true,
    can_create_comments: false,
    can_edit_own_comments: false,
    can_delete_own_comments: false,
    can_delete_any_comments: false,
    can_view_collections: true,
    can_edit_collections: false,
    can_view_seasons: true,
    can_edit_seasons: false,
    can_view_users: false,
    can_create_users: false,
    can_edit_users: false,
    can_delete_users: false
  });

  useEffect(() => {
    loadUsers();
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFactories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load factories:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: any = {
      full_name: formData.full_name,
      role: formData.role,
      is_active: formData.is_active,
      permissions
    };

    // Add factory_id for factory role
    if (formData.role === 'factory' && formData.factory_id) {
      body.factory_id = formData.factory_id;
    }

    // Always include email
    body.email = formData.email;

    if (!editingUser) {
      body.password = formData.password;
    } else if (formData.password) {
      body.password = formData.password;
    }

    // If editing user, show confirmation modal
    if (editingUser) {
      setPendingUpdate(body);
      setShowUpdateConfirmModal(true);
      return;
    }

    // For new user, save directly
    await saveUser(body);
  };

  const saveUser = async (body: any) => {
    try {
      const token = localStorage.getItem('token');
      const url = editingUser
        ? `${API_BASE_URL}/users/${editingUser.id}`
        : `${API_BASE_URL}/users`;

      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowModal(false);
        setShowUpdateConfirmModal(false);
        setEditingUser(null);
        setPendingUpdate(null);
        setFormData({
          email: '',
          password: '',
          full_name: '',
          role: 'designer',
          is_active: true,
          factory_id: null
        });
        setPermissions({
          can_view_dashboard: true,
          can_view_models: true,
          can_create_models: false,
          can_edit_models: false,
          can_delete_models: false,
          can_edit_model_status: false,
          can_view_files: true,
          can_upload_files: false,
          can_delete_files: false,
          can_view_materials: true,
          can_edit_materials: false,
          can_delete_materials: false,
          can_view_comments: true,
          can_create_comments: false,
          can_edit_own_comments: false,
          can_delete_own_comments: false,
          can_delete_any_comments: false,
          can_view_collections: true,
          can_edit_collections: false,
          can_view_seasons: true,
          can_edit_seasons: false,
          can_view_users: false,
          can_create_users: false,
          can_edit_users: false,
          can_delete_users: false
        });
        await loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || t('users.saveError'));
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert(t('users.saveError'));
    }
  };

  const handleUpdateConfirm = async () => {
    if (pendingUpdate) {
      await saveUser(pendingUpdate);
    }
  };

  const handleEdit = async (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      factory_id: user.factory_id || null
    });

    // Load user permissions
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setPermissions(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }

    setShowModal(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setUserToDelete(null);
        await loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || t('users.deleteError'));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(t('users.deleteError'));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      'buyer': 'bg-purple-100 text-purple-700',
      'designer': 'bg-blue-100 text-blue-700',
      'constructor': 'bg-green-100 text-green-700',
      'china_office': 'bg-red-100 text-red-700',
      'factory': 'bg-orange-100 text-orange-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role: string) => {
    const roleKeys: Record<string, string> = {
      'buyer': 'roles.buyer',
      'designer': 'roles.designer',
      'constructor': 'roles.constructor',
      'china_office': 'roles.china_office',
      'factory': 'roles.factory'
    };
    return roleKeys[role] ? t(roleKeys[role]) : role;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          {hasPermission('can_create_users') && (
            <Button
              onClick={() => {
              setEditingUser(null);
              setFormData({
                email: '',
                password: '',
                full_name: '',
                role: 'designer',
                is_active: true,
                factory_id: null
              });
              setPermissions({
                can_view_dashboard: true,
                can_view_models: true,
                can_create_models: false,
                can_edit_models: false,
                can_delete_models: false,
                can_edit_model_status: false,
                can_view_files: true,
                can_upload_files: false,
                can_delete_files: false,
                can_view_materials: true,
                can_edit_materials: false,
                can_delete_materials: false,
                can_view_comments: true,
                can_create_comments: false,
                can_edit_own_comments: false,
                can_delete_own_comments: false,
                can_delete_any_comments: false,
                can_view_collections: true,
                can_edit_collections: false,
                can_view_seasons: true,
                can_edit_seasons: false,
                can_view_users: false,
                can_create_users: false,
                can_edit_users: false,
                can_delete_users: false
              });
              setShowModal(true);
            }}
          >
              <UserPlus className="w-5 h-5 mr-2" />
              {t('users.createUser')}
            </Button>
          )}
        </div>

        <Card>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('users.noUsers')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.fullName')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('auth.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.role')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('common.date')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.full_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.is_active ? t('users.active') : t('users.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('can_edit_users') && (
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('can_delete_users') && (
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingUser ? t('users.editUser') : t('users.createUser')}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? t('users.passwordHint') : t('auth.password')}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('users.role')}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value, factory_id: null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="designer">{t('roles.designer')}</option>
                    <option value="constructor">{t('roles.constructor')}</option>
                    <option value="buyer">{t('roles.buyer')}</option>
                    <option value="china_office">{t('roles.china_office')}</option>
                    <option value="factory">{t('roles.factory')}</option>
                  </select>
                </div>

                {/* Factory Selection - only for factory role */}
                {formData.role === 'factory' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('users.factory')}
                    </label>
                    <select
                      value={formData.factory_id || ''}
                      onChange={(e) => setFormData({ ...formData, factory_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t('users.selectFactory')}</option>
                      {factories.map((factory) => (
                        <option key={factory.id} value={factory.id}>
                          {factory.name} ({factory.code})
                        </option>
                      ))}
                    </select>
                    {factories.length === 0 && (
                      <p className="mt-1 text-sm text-orange-600">
                        {t('users.noFactoriesAvailable')}
                      </p>
                    )}
                  </div>
                )}

                {/* Permissions Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">{t('users.permissionsSetup')}</h3>

                  {/* Dashboard */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.dashboard')}</p>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={permissions.can_view_dashboard}
                        onChange={(e) => setPermissions({ ...permissions, can_view_dashboard: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('permissions.viewDashboard')}</span>
                    </label>
                  </div>

                  {/* Models */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.modelsSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_models}
                          onChange={(e) => setPermissions({ ...permissions, can_view_models: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewModels')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_create_models}
                          onChange={(e) => setPermissions({ ...permissions, can_create_models: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.createModels')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_models}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_models: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editModels')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_models}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_models: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteModels')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_model_status}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_model_status: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editModelStatus')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Files */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.filesSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_files}
                          onChange={(e) => setPermissions({ ...permissions, can_view_files: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewFiles')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_upload_files}
                          onChange={(e) => setPermissions({ ...permissions, can_upload_files: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.uploadFiles')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_files}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_files: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteFiles')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.materialsSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_materials}
                          onChange={(e) => setPermissions({ ...permissions, can_view_materials: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewMaterials')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_materials}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_materials: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editMaterials')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_materials}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_materials: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteMaterials')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.commentsSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_comments}
                          onChange={(e) => setPermissions({ ...permissions, can_view_comments: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewComments')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_create_comments}
                          onChange={(e) => setPermissions({ ...permissions, can_create_comments: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.createComments')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_own_comments}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_own_comments: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editOwnComments')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_own_comments}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_own_comments: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteOwnComments')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_any_comments}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_any_comments: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteAnyComments')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Collections & Seasons */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.collectionsSection')} & {t('permissions.seasonsSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_collections}
                          onChange={(e) => setPermissions({ ...permissions, can_view_collections: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewCollections')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_collections}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_collections: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editCollections')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_seasons}
                          onChange={(e) => setPermissions({ ...permissions, can_view_seasons: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewSeasons')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_seasons}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_seasons: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editSeasons')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Users Management */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">{t('permissions.usersSection')}</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_view_users}
                          onChange={(e) => setPermissions({ ...permissions, can_view_users: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.viewUsers')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_create_users}
                          onChange={(e) => setPermissions({ ...permissions, can_create_users: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.createUsers')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_edit_users}
                          onChange={(e) => setPermissions({ ...permissions, can_edit_users: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.editUsers')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={permissions.can_delete_users}
                          onChange={(e) => setPermissions({ ...permissions, can_delete_users: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{t('permissions.deleteUsers')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {editingUser && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      {t('users.activeUser')}
                    </label>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                  >
                    {editingUser ? t('common.save') : t('users.createUser')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowDeleteModal(false);
              setUserToDelete(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('users.deleteUser')}</h2>
              </div>

              <p className="text-gray-600 mb-6">
                {t('users.deleteUserConfirm')} <strong>{userToDelete.full_name}</strong> ({userToDelete.email})? {t('users.deleteUserNote')}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Confirmation Modal */}
        {showUpdateConfirmModal && editingUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowUpdateConfirmModal(false);
              setPendingUpdate(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('users.confirmChanges')}</h2>
              </div>

              <p className="text-gray-600 mb-6">
                {t('users.confirmChangesMessage')} <strong>{editingUser.full_name}</strong> ({editingUser.email})?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateConfirmModal(false);
                    setPendingUpdate(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
