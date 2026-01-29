// Build: 2026-01-28 v4 - Create Season button always visible
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card, Badge, Button } from '../components/ui';
import { ChevronRight, FolderOpen, Package, Plus, Trash2, Edit2 } from 'lucide-react';
import { modelsApi } from '../services/api';
import type { Model } from '../types';
import { CreateModelModal } from '../components/CreateModelModal';
import { useAuthStore } from '../store/authStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { toast } from 'react-toastify';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function to get proper file URL (handles both R2 and local files)
const getFileUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
};

interface Season {
  id: number;
  code: string;
  name: string;
}

interface Collection {
  id: number;
  type: string;
  gender: string | null;
  age_group: string | null;
  name: string;
  model_count: number;
}

type CollectionType = 'kids' | 'men' | 'women';
type Gender = 'boys' | 'girls' | 'babies';
type AgeGroup = '0-2' | '2-7' | '7-14';

export const ModelsHierarchy = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: _user } = useAuthStore();
  const { hasPermission, loadPermissions } = usePermissionsStore();

  // Параметры из URL
  const seasonId = searchParams.get('season');
  const collectionType = searchParams.get('type') as CollectionType | null;
  const gender = searchParams.get('gender') as Gender | null;
  const ageGroup = searchParams.get('age') as AgeGroup | null;
  const collectionId = searchParams.get('collection');

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [newSeason, setNewSeason] = useState({
    code: '',
    name: '',
    year: new Date().getFullYear(),
    season_type: 'spring_summer' as 'spring_summer' | 'autumn_winter'
  });
  const [showCreateModelModal, setShowCreateModelModal] = useState(false);
  const [refreshKey, _setRefreshKey] = useState(0);
  const [showDeleteSeasonModal, setShowDeleteSeasonModal] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<{ id: number; name: string } | null>(null);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [showDeleteModelModal, setShowDeleteModelModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<{ id: number; model_number: string } | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    loadData();
  }, [seasonId, collectionType, gender, ageGroup, collectionId, refreshKey]);

  const loadData = async () => {
    setIsLoading(true);

    try {
      if (!seasonId) {
        // Уровень 1: Загружаем сезоны
        await loadSeasons();
        setBreadcrumbs(['Сезоны']);
      } else if (!collectionType) {
        // Уровень 2: Загружаем типы коллекций
        setBreadcrumbs(['Сезоны', 'Выбор типа']);
      } else if (collectionType === 'kids' && !gender) {
        // Уровень 3: Для детей - выбираем гендер
        setBreadcrumbs(['Сезоны', 'Детская коллекция', 'Выбор гендера']);
      } else if (collectionType === 'kids' && gender && !ageGroup) {
        // Уровень 4: Для детей - выбираем возраст
        const genderName = gender === 'boys' ? 'Мальчики' : gender === 'girls' ? 'Девочки' : 'Новорожденные';
        setBreadcrumbs(['Сезоны', 'Детская коллекция', genderName, 'Выбор возраста']);
      } else if (!collectionId) {
        // Уровень 5: Загружаем коллекции по фильтрам
        await loadCollections();
        setBreadcrumbs(['Сезоны', 'Коллекции']);
      } else {
        // Уровень 6: Загружаем модели коллекции
        await loadModels();
        setBreadcrumbs(['Сезоны', 'Коллекции', 'Модели']);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSeasons = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/seasons`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSeasons(data.data || []);
      } else {
        toast.error('Не удалось загрузить сезоны');
        setSeasons([]);
      }
    } catch (error) {
      console.error('loadSeasons: Error occurred:', error);
      toast.error('Ошибка при загрузке сезонов');
      setSeasons([]);
    }
  };

  const loadCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (seasonId) params.append('season_id', seasonId);
      if (collectionType) params.append('type', collectionType);
      if (gender) params.append('gender', gender);
      if (ageGroup) params.append('age_group', ageGroup);

      const response = await fetch(`${API_BASE_URL}/collections?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCollections(data.data || []);
      } else {
        console.error('Failed to load collections:', data);
        toast.error('Не удалось загрузить коллекции');
        setCollections([]);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Ошибка при загрузке коллекций');
      setCollections([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'info', label: 'Draft' },
      under_review: { variant: 'warning', label: 'Under Review' },
      approved: { variant: 'success', label: 'Approved' },
      ds: { variant: 'info', label: 'DS' },
      pps: { variant: 'warning', label: 'PPS' },
      in_production: { variant: 'success', label: 'In Production' },
    };

    const config = statusMap[status] || { variant: 'info', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const loadModels = async () => {
    if (!collectionId) return;

    const response = await modelsApi.getModels({
      collection_id: parseInt(collectionId),
      limit: 100
    });

    if (response.success && response.data) {
      setModels(response.data.items);
    }
  };

  const buildUrl = (params: Record<string, string>) => {
    const url = new URLSearchParams(params);
    return `/models-hierarchy?${url.toString()}`;
  };

  const handleDeleteCollectionClick = (collectionId: number, collectionName: string) => {
    setCollectionToDelete({ id: collectionId, name: collectionName });
    setShowDeleteCollectionModal(true);
  };

  const handleDeleteCollectionConfirm = async () => {
    if (!collectionToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/collections/${collectionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Коллекция успешно удалена');
        setShowDeleteCollectionModal(false);
        setCollectionToDelete(null);
        await loadCollections();
      } else {
        toast.error(data.error || 'Не удалось удалить коллекцию');
        setShowDeleteCollectionModal(false);
        setCollectionToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Произошла ошибка при удалении коллекции');
      setShowDeleteCollectionModal(false);
      setCollectionToDelete(null);
    }
  };

  const handleEditCollectionClick = (collectionId: number, collectionName: string) => {
    setCollectionToEdit({ id: collectionId, name: collectionName });
    setEditCollectionName(collectionName);
    setShowEditCollectionModal(true);
  };

  const handleEditCollectionConfirm = async () => {
    if (!collectionToEdit || !editCollectionName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/collections/${collectionToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editCollectionName
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Коллекция успешно обновлена');
        setShowEditCollectionModal(false);
        setCollectionToEdit(null);
        setEditCollectionName('');
        await loadCollections();
      } else {
        toast.error(data.error || 'Не удалось обновить коллекцию');
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Произошла ошибка при обновлении коллекции');
    }
  };

  const handleDeleteModelClick = (modelId: number, modelNumber: string) => {
    setModelToDelete({ id: modelId, model_number: modelNumber });
    setShowDeleteModelModal(true);
  };

  const handleDeleteModelConfirm = async () => {
    if (!modelToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${modelToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Модель успешно удалена');
        setShowDeleteModelModal(false);
        setModelToDelete(null);
        await loadModels();
      } else {
        toast.error(data.error || 'Не удалось удалить модель');
        setShowDeleteModelModal(false);
        setModelToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Произошла ошибка при удалении модели');
      setShowDeleteModelModal(false);
      setModelToDelete(null);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          season_id: parseInt(seasonId!),
          type: collectionType,
          gender: gender,
          age_group: ageGroup,
          name: newCollectionName
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewCollectionName('');
        await loadCollections();
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeason.code.trim() || !newSeason.name.trim()) return;

    try {
      const token = localStorage.getItem('token');
      console.log('Creating season:', newSeason);

      const response = await fetch(`${API_BASE_URL}/seasons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSeason)
      });

      console.log('Create season response status:', response.status);
      const data = await response.json();
      console.log('Create season response data:', data);

      if (response.ok) {
        console.log('Season created successfully!');

        // Закрываем модальное окно
        setShowCreateSeasonModal(false);

        // Показываем уведомление
        toast.success('Сезон успешно создан');

        // Небольшая задержка для отображения toast, затем перезагружаем страницу
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        console.error('Failed to create season:', data);
        toast.error(data.error || 'Не удалось создать сезон');
      }
    } catch (error) {
      console.error('Failed to create season:', error);
      toast.error('Произошла ошибка при создании сезона');
    }
  };

  const handleDeleteSeasonClick = (seasonId: number, seasonName: string) => {
    setSeasonToDelete({ id: seasonId, name: seasonName });
    setShowDeleteSeasonModal(true);
  };

  const handleDeleteSeasonConfirm = async () => {
    if (!seasonToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/seasons/${seasonToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Сезон успешно удалён');
        setShowDeleteSeasonModal(false);
        setSeasonToDelete(null);
        await loadSeasons();
      } else {
        toast.error(data.error || 'Не удалось удалить сезон');
        setShowDeleteSeasonModal(false);
        setSeasonToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting season:', error);
      toast.error('Произошла ошибка при удалении сезона');
      setShowDeleteSeasonModal(false);
      setSeasonToDelete(null);
    }
  };


  // Рендер уровней иерархии
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Загрузка...</p>
        </div>
      );
    }

    // Уровень 1: Выбор сезона
    if (!seasonId) {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateSeasonModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать сезон
            </Button>
          </div>

          {seasons.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет сезонов</h3>
                <p className="text-gray-600 mb-4">Создайте первый сезон для начала работы</p>
                <Button onClick={() => setShowCreateSeasonModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать сезон
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {seasons.map((season) => (
                <div key={season.id} className="relative group">
                  <Card className="hover:shadow-lg transition-shadow">
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => navigate(buildUrl({ season: season.id.toString() }))}
                    >
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{season.code}</h3>
                        <p className="text-sm text-gray-600">{season.name}</p>
                      </div>
                      {hasPermission('can_edit_seasons') && (
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSeasonClick(season.id, season.name);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="Удалить сезон"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Уровень 2: Выбор типа коллекции
    if (!collectionType) {
      const types = [
        { value: 'kids', label: 'Детская коллекция', color: 'bg-blue-100 text-blue-600' },
        { value: 'men', label: 'Мужская коллекция', color: 'bg-purple-100 text-purple-600' },
        { value: 'women', label: 'Женская коллекция', color: 'bg-pink-100 text-pink-600' },
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {types.map((type) => (
            <div
              key={type.value}
              className="cursor-pointer"
              onClick={() => navigate(buildUrl({ season: seasonId, type: type.value }))}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type.color}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{type.label}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </div>
              </Card>
            </div>
          ))}
        </div>
      );
    }

    // Уровень 3: Для детей - выбор гендера
    if (collectionType === 'kids' && !gender) {
      const genders = [
        { value: 'boys', label: 'Мальчики', color: 'bg-blue-100 text-blue-600' },
        { value: 'girls', label: 'Девочки', color: 'bg-pink-100 text-pink-600' },
        { value: 'babies', label: 'Новорожденные', color: 'bg-green-100 text-green-600' },
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {genders.map((g) => (
            <div
              key={g.value}
              className="cursor-pointer"
              onClick={() => navigate(buildUrl({ season: seasonId, type: collectionType, gender: g.value }))}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${g.color}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{g.label}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </div>
              </Card>
            </div>
          ))}
        </div>
      );
    }

    // Уровень 4: Для детей - выбор возраста
    if (collectionType === 'kids' && gender && !ageGroup) {
      // Возрастные группы зависят от гендера
      const agesByGender: Record<Gender, Array<{ value: AgeGroup; label: string; color: string }>> = {
        'boys': [
          { value: '2-7', label: '2-7 лет', color: 'bg-orange-100 text-orange-600' },
          { value: '7-14', label: '7-14 лет', color: 'bg-red-100 text-red-600' },
        ],
        'girls': [
          { value: '2-7', label: '2-7 лет', color: 'bg-orange-100 text-orange-600' },
          { value: '7-14', label: '7-14 лет', color: 'bg-red-100 text-red-600' },
        ],
        'babies': [
          { value: '0-2', label: '0-2 года', color: 'bg-yellow-100 text-yellow-600' },
        ],
      };

      const ages = agesByGender[gender];

      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ages.map((age) => (
            <div
              key={age.value}
              className="cursor-pointer"
              onClick={() => navigate(buildUrl({
                season: seasonId,
                type: collectionType,
                gender: gender,
                age: age.value
              }))}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${age.color}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{age.label}</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </div>
              </Card>
            </div>
          ))}
        </div>
      );
    }

    // Уровень 5: Список коллекций
    if (!collectionId) {
      return (
        <div className="space-y-4">
          {/* Кнопка создания коллекции */}
          {hasPermission('can_edit_collections') && (
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Создать коллекцию
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map((collection) => (
            <div
              key={collection.id}
              className="cursor-pointer"
              onClick={() => {
                const params: Record<string, string> = {
                  season: seasonId,
                  type: collectionType,
                  collection: collection.id.toString()
                };
                if (gender) params.gender = gender;
                if (ageGroup) params.age = ageGroup;
                navigate(buildUrl(params));
              }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {collection.type === 'kids' && `${collection.gender} • ${collection.age_group}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="info">{collection.model_count || 0} моделей</Badge>
                    {hasPermission('can_edit_collections') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCollectionClick(collection.id, collection.name);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать коллекцию"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('can_edit_collections') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollectionClick(collection.id, collection.name);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить коллекцию"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            </div>
          ))}
          </div>
        </div>
      );
    }

    // Уровень 6: Список моделей
    return (
      <div className="space-y-4">
        {hasPermission('can_create_models') && (
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateModelModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать модель
            </Button>
          </div>
        )}

        {models.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-600">
              В этой коллекции пока нет моделей
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Номер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Название
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Дата
                    </th>
                    {hasPermission('can_delete_models') && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Действия
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {models.map((model) => (
                    <tr
                      key={model.id}
                      onClick={() => navigate(`/models/${model.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Миниатюра скетча */}
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            {(model as any).sketch_url ? (
                              <img
                                src={getFileUrl((model as any).sketch_url)}
                                alt={model.model_number}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {model.model_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{model.model_name || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{model.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(model.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(model.date_created).toLocaleDateString('ru-RU')}
                      </td>
                      {hasPermission('can_delete_models') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModelClick(model.id, model.model_number);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить модель"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Модели</h1>
          <p className="text-gray-600 mt-1">Иерархическая навигация по коллекциям</p>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              <span className={index === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : ''}>
                {crumb}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Модальное окно создания сезона */}
      {showCreateSeasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Создать сезон</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Код сезона
                </label>
                <input
                  type="text"
                  value={newSeason.code}
                  onChange={(e) => setNewSeason({ ...newSeason, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: SS26, AW26"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название сезона
                </label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: Spring/Summer 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Год
                  </label>
                  <input
                    type="number"
                    value={newSeason.year}
                    onChange={(e) => setNewSeason({ ...newSeason, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min={2024}
                    max={2030}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип сезона
                  </label>
                  <select
                    value={newSeason.season_type}
                    onChange={(e) => setNewSeason({ ...newSeason, season_type: e.target.value as 'spring_summer' | 'autumn_winter' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="spring_summer">SS (Весна/Лето)</option>
                    <option value="autumn_winter">AW (Осень/Зима)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateSeasonModal(false);
                  setNewSeason({
                    code: '',
                    name: '',
                    year: new Date().getFullYear(),
                    season_type: 'spring_summer'
                  });
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={() => {
                  console.log('Create season clicked', newSeason);
                  handleCreateSeason();
                }}
                disabled={!newSeason.code.trim() || !newSeason.name.trim()}
                className="flex-1"
              >
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания модели */}
      {showCreateModelModal && (
        <CreateModelModal
          collectionId={collectionId!}
          collectionName={collections.find(c => c.id === parseInt(collectionId!))?.name || ''}
          onClose={() => setShowCreateModelModal(false)}
          onSuccess={loadModels}
        />
      )}

      {/* Модальное окно создания коллекции */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Создать коллекцию</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название коллекции
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Введите название коллекции"
                  autoFocus
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p><strong>Сезон:</strong> {seasons.find(s => s.id === parseInt(seasonId!))?.code || '—'}</p>
                <p><strong>Тип:</strong> {collectionType === 'kids' ? 'Детская' : collectionType === 'men' ? 'Мужская' : 'Женская'}</p>
                {gender && <p><strong>Гендер:</strong> {gender === 'boys' ? 'Мальчики' : gender === 'girls' ? 'Девочки' : 'Новорожденные'}</p>}
                {ageGroup && <p><strong>Возраст:</strong> {ageGroup}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCollectionName('');
                }}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1"
              >
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления сезона */}
      {showDeleteSeasonModal && seasonToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteSeasonModal(false);
              setSeasonToDelete(null);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Удалить сезон?</h2>
                <p className="text-gray-600 mb-2">
                  Вы уверены, что хотите удалить сезон <strong>"{seasonToDelete.name}"</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  Примечание: Сезон можно удалить только если в нём нет коллекций. Сначала удалите все коллекции в этом сезоне.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteSeasonModal(false);
                  setSeasonToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSeasonConfirm()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления коллекции */}
      {showDeleteCollectionModal && collectionToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteCollectionModal(false);
              setCollectionToDelete(null);
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Удалить коллекцию?</h2>
                <p className="text-gray-600 mb-2">
                  Вы уверены, что хотите удалить коллекцию <strong>"{collectionToDelete.name}"</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  Примечание: Коллекцию можно удалить только если в ней нет моделей.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteCollectionModal(false);
                  setCollectionToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCollectionConfirm()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования коллекции */}
      {showEditCollectionModal && collectionToEdit && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditCollectionModal(false);
              setCollectionToEdit(null);
              setEditCollectionName('');
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Редактировать коллекцию</h2>
                <p className="text-gray-600 text-sm">
                  Измените название коллекции
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название коллекции
              </label>
              <input
                type="text"
                value={editCollectionName}
                onChange={(e) => setEditCollectionName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Введите название коллекции"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditCollectionModal(false);
                  setCollectionToEdit(null);
                  setEditCollectionName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleEditCollectionConfirm()}
                disabled={!editCollectionName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Model Modal */}
      {showDeleteModelModal && modelToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteModelModal(false);
            setModelToDelete(null);
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
              <h2 className="text-xl font-bold text-gray-900">Удалить модель</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Вы действительно хотите удалить модель <strong>{modelToDelete.model_number}</strong>? Это действие невозможно отменить.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModelModal(false);
                  setModelToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteModelConfirm()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
