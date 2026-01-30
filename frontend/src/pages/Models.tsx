import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card, Badge } from '../components/ui';
import { Search, Filter, Plus, Package } from 'lucide-react';
import { modelsApi } from '../services/api';
import type { Model, ModelStatus } from '../types';
import { usePermissionsStore } from '../store/permissionsStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function to get proper file URL (handles both R2 and local files)
const getFileUrl = (fileUrl: string): string => {
  // If URL is already absolute (starts with http:// or https://), use it as is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  // Otherwise, prepend the API base URL (for local files like /uploads/...)
  return `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
};

export const Models = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissionsStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModelStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Читаем статус из URL при загрузке
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl && statusFromUrl !== 'all') {
      setStatusFilter(statusFromUrl as ModelStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    loadModels();
  }, [page, statusFilter]);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await modelsApi.getModels(params);

      if (response.success && response.data) {
        setModels(response.data.items);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadModels();
  };

  const getStatusBadge = (status: ModelStatus) => {
    const statusMap = {
      draft: { label: 'Draft', variant: 'info' as const },
      under_review: { label: 'Under Review', variant: 'warning' as const },
      approved: { label: 'Approved', variant: 'success' as const },
      ds: { label: 'DS', variant: 'info' as const },
      pps: { label: 'PPS', variant: 'warning' as const },
      in_production: { label: 'In Production', variant: 'success' as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap];
    if (!statusInfo) {
      return <Badge variant="info">{status}</Badge>;
    }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('models.title')}</h1>
            <p className="text-gray-600 mt-1">{t('models.manageClothingModels')}</p>
          </div>
          {hasPermission('can_create_models') && (
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={() => navigate('/models-hierarchy?action=create')}
            >
              <Plus className="w-5 h-5" />
              {t('models.createModel')}
            </button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="label">{t('common.search')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={t('models.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleSearch}
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="label">{t('models.status')}</label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ModelStatus | 'all');
                  setPage(1);
                }}
              >
                <option value="all">{t('models.allStatuses')}</option>
                <option value="draft">{t('statuses.draft')}</option>
                <option value="under_review">{t('statuses.under_review')}</option>
                <option value="approved">{t('statuses.approved')}</option>
                <option value="ds">{t('statuses.ds_stage')}</option>
                <option value="pps">{t('statuses.pps_stage')}</option>
                <option value="in_production">{t('statuses.in_production')}</option>
              </select>
            </div>

            {/* Additional Filter Button */}
            <div className="flex items-end">
              <button className="btn btn-secondary w-full flex items-center justify-center gap-2">
                <Filter className="w-5 h-5" />
                {t('common.filters')}
              </button>
            </div>
          </div>
        </Card>

        {/* Models Table */}
        <Card>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-4">{t('models.loadingModels')}</p>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t('models.noModelsFound')}</p>
              <button className="btn btn-primary mt-4">
                {t('models.createFirstModel')}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.modelNumber')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.modelName')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.collection')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.designer')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('models.date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {models.map((model) => (
                      <tr
                        key={model.id}
                        onClick={() => navigate(`/models/${model.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {model.model_name || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {model.collection_name || '—'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {model.season_code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {model.product_type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {model.category}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(model.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {model.designer_name || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(model.date_created).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="btn btn-secondary"
                    >
                      {t('common.previous')}
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="btn btn-secondary"
                    >
                      {t('common.next')}
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {t('common.page')} <span className="font-medium">{page}</span> {t('common.of')}{' '}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="btn btn-secondary"
                      >
                        {t('common.previous')}
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="btn btn-secondary"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};
