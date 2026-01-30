import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ChevronLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ReferenceDataItem {
  id: number;
  category: string;
  code: string;
  value: string;
  label: string;
  sort_order: number;
}

interface Factory {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

interface ReferenceDataByCategory {
  [key: string]: ReferenceDataItem[];
}

export const AdminPanel = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categoryLabels: { [key: string]: string } = {
    product_type: t('admin.productType'),
    fit_type: t('admin.fitType'),
    product_group: t('admin.productGroup'),
    color: t('admin.color'),
    size: t('admin.size'),
    factories: t('admin.factories')
  };
  const [referenceData, setReferenceData] = useState<ReferenceDataByCategory>({});
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('product_type');
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ReferenceDataItem | null>(null);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    value: '',
    label: ''
  });
  const [newFactory, setNewFactory] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'item' | 'factory' | null;
    id: number | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: ''
  });

  useEffect(() => {
    loadReferenceData();
    loadFactories();
  }, []);

  const loadReferenceData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load reference data');
      }

      const data = await response.json();
      // API возвращает { success: true, data: {...} }
      setReferenceData(data.data || data);
    } catch (error) {
      console.error('Error loading reference data:', error);
      toast.error(t('models.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadFactories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load factories');
      }

      const data = await response.json();
      setFactories(data.data || []);
    } catch (error) {
      console.error('Error loading factories:', error);
      toast.error(t('models.loadError'));
    }
  };

  const handleCreate = async () => {
    if (!newItem.code || !newItem.value || !newItem.label) {
      toast.error(t('common.error'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: selectedCategory,
          ...newItem,
          sort_order: (referenceData[selectedCategory]?.length || 0) + 1
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create reference data');
      }

      toast.success(t('admin.recordCreated'));
      setIsCreating(false);
      setNewItem({ code: '', value: '', label: '' });
      await loadReferenceData();
    } catch (error) {
      console.error('Error creating reference data:', error);
      toast.error(t('common.error'));
    }
  };

  const handleUpdate = async (item: ReferenceDataItem) => {
    if (!item.code || !item.value || !item.label) {
      toast.error(t('common.error'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: item.code,
          value: item.value,
          label: item.label,
          sort_order: item.sort_order
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update reference data');
      }

      toast.success(t('admin.recordUpdated'));
      setEditingItem(null);
      await loadReferenceData();
    } catch (error) {
      console.error('Error updating reference data:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'item',
      id,
      name
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id || deleteConfirm.type !== 'item') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete reference data');
      }

      toast.success(t('admin.recordDeleted'));
      await loadReferenceData();
    } catch (error) {
      console.error('Error deleting reference data:', error);
      toast.error(t('common.error'));
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  // Factory CRUD operations
  const handleCreateFactory = async () => {
    if (!newFactory.name) {
      toast.error('Введите название фабрики');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newFactory)
      });

      if (!response.ok) {
        throw new Error('Failed to create factory');
      }

      toast.success(t('admin.recordCreated'));
      setIsCreating(false);
      setNewFactory({ name: '', contact_email: '', contact_phone: '', address: '' });
      await loadFactories();
    } catch (error) {
      console.error('Error creating factory:', error);
      toast.error('Не удалось создать фабрику');
    }
  };

  const handleUpdateFactory = async (factory: Factory) => {
    if (!factory.name) {
      toast.error('Введите название фабрики');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories/${factory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: factory.name,
          contact_email: factory.contact_email,
          contact_phone: factory.contact_phone,
          address: factory.address
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update factory');
      }

      toast.success(t('admin.recordUpdated'));
      setEditingFactory(null);
      await loadFactories();
    } catch (error) {
      console.error('Error updating factory:', error);
      toast.error('Не удалось обновить фабрику');
    }
  };

  const handleDeleteFactoryClick = (id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'factory',
      id,
      name
    });
  };

  const handleDeleteFactory = async () => {
    if (!deleteConfirm.id || deleteConfirm.type !== 'factory') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete factory');
      }

      toast.success(t('admin.recordDeleted'));
      await loadFactories();
    } catch (error) {
      console.error('Error deleting factory:', error);
      toast.error(t('common.error'));
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.type === 'item') {
      handleDelete();
    } else if (deleteConfirm.type === 'factory') {
      handleDeleteFactory();
    }
  };

  const currentItems = referenceData[selectedCategory] || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      {/* Модальное окно подтверждения удаления */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'factory' ? 'Удалить фабрику?' : 'Удалить запись?'}
        message={`Вы уверены, что хотите удалить "${deleteConfirm.name}"?`}
        note="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
            </div>
          </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Categories sidebar */}
          <div className="col-span-3 bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-900 mb-4">{t('admin.categories')}</h2>
            <div className="space-y-1">
              {Object.keys(categoryLabels).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setIsCreating(false);
                    setEditingItem(null);
                    setEditingFactory(null);
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {categoryLabels[category]}
                  <span className="ml-2 text-sm text-gray-500">
                    ({category === 'factories' ? factories.length : (referenceData[category]?.length || 0)})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="col-span-9 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {categoryLabels[selectedCategory]}
              </h2>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setEditingItem(null);
                  setEditingFactory(null);
                }}
                className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </button>
            </div>

            <div className="p-6">
              {/* Factories content */}
              {selectedCategory === 'factories' ? (
                <>
                  {/* Create factory form */}
                  {isCreating && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-4">{t('admin.newFactory')}</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Название *
                          </label>
                          <input
                            type="text"
                            value={newFactory.name}
                            onChange={(e) => setNewFactory({ ...newFactory, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Название фабрики"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={newFactory.contact_email}
                            onChange={(e) => setNewFactory({ ...newFactory, contact_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Телефон
                          </label>
                          <input
                            type="text"
                            value={newFactory.contact_phone}
                            onChange={(e) => setNewFactory({ ...newFactory, contact_phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+7 123 456-78-90"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Адрес
                          </label>
                          <input
                            type="text"
                            value={newFactory.address}
                            onChange={(e) => setNewFactory({ ...newFactory, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Адрес фабрики"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateFactory}
                          className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setIsCreating(false);
                            setNewFactory({ name: '', contact_email: '', contact_phone: '', address: '' });
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Factories table */}
                  {factories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Нет фабрик
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                              Название
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                              Email
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                              Телефон
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                              Адрес
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                              Статус
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                              Действия
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {factories.map((factory) => (
                            <tr key={factory.id} className="border-b border-gray-100 hover:bg-gray-50">
                              {editingFactory?.id === factory.id ? (
                                <>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      value={editingFactory.name}
                                      onChange={(e) =>
                                        setEditingFactory({ ...editingFactory, name: e.target.value })
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="email"
                                      value={editingFactory.contact_email || ''}
                                      onChange={(e) =>
                                        setEditingFactory({ ...editingFactory, contact_email: e.target.value })
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      value={editingFactory.contact_phone || ''}
                                      onChange={(e) =>
                                        setEditingFactory({ ...editingFactory, contact_phone: e.target.value })
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      value={editingFactory.address || ''}
                                      onChange={(e) =>
                                        setEditingFactory({ ...editingFactory, address: e.target.value })
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      factory.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {factory.is_active ? 'Активна' : 'Неактивна'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => handleUpdateFactory(editingFactory)}
                                      className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded mr-2"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingFactory(null)}
                                      className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-3 px-4 text-sm text-gray-900">{factory.name}</td>
                                  <td className="py-3 px-4 text-sm text-gray-600">{factory.contact_email || '—'}</td>
                                  <td className="py-3 px-4 text-sm text-gray-600">{factory.contact_phone || '—'}</td>
                                  <td className="py-3 px-4 text-sm text-gray-600">{factory.address || '—'}</td>
                                  <td className="py-3 px-4">
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      factory.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {factory.is_active ? 'Активна' : 'Неактивна'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingFactory(factory);
                                        setIsCreating(false);
                                      }}
                                      className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded mr-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFactoryClick(factory.id, factory.name)}
                                      className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Create form */}
                  {isCreating && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-4">{t('admin.newRecord')}</h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Код
                      </label>
                      <input
                        type="text"
                        value={newItem.code}
                        onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Значение (value)
                      </label>
                      <input
                        type="text"
                        value={newItem.value}
                        onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="product_value"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Название (label)
                      </label>
                      <input
                        type="text"
                        value={newItem.label}
                        onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Название продукта"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {t('common.save')}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewItem({ code: '', value: '', label: '' });
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Items table */}
              {currentItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Нет данных в этой категории
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Код
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Значение
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Название
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Порядок
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {editingItem?.id === item.id ? (
                            <>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={editingItem.code}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, code: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={editingItem.value}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, value: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={editingItem.label}
                                  onChange={(e) =>
                                    setEditingItem({ ...editingItem, label: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={editingItem.sort_order}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      sort_order: parseInt(e.target.value)
                                    })
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleUpdate(editingItem)}
                                  className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded mr-2"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingItem(null)}
                                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-4 text-sm text-gray-900">{item.code}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{item.value}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">{item.label}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{item.sort_order}</td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsCreating(false);
                                  }}
                                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded mr-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(item.id, item.label)}
                                  className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
