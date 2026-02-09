import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card, Badge } from '../components/ui';
import { Search, Filter, Plus, Package, Check, X, HelpCircle, Circle, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { modelsApi } from '../services/api';
import api from '../services/api';
import type { Model, ModelStatus, ApprovalStatus } from '../types';
import { usePermissionsStore } from '../store/permissionsStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function to get proper file URL (handles both R2 and local files)
const getFileUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
};

interface FilterState {
  modelNumber: string;
  modelName: string;
  collectionId: string;
  status: string;
  buyerApproval: string;
  constructorApproval: string;
  productType: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = {
  modelNumber: '',
  modelName: '',
  collectionId: '',
  status: '',
  buyerApproval: '',
  constructorApproval: '',
  productType: '',
  dateFrom: '',
  dateTo: '',
};

// Mapping between FilterState keys and URL param names
const filterParamMap: Record<keyof FilterState, string> = {
  modelNumber: 'model_number',
  modelName: 'model_name',
  collectionId: 'collection_id',
  status: 'f_status',
  buyerApproval: 'buyer_approval',
  constructorApproval: 'constructor_approval',
  productType: 'product_type',
  dateFrom: 'date_from',
  dateTo: 'date_to',
};

interface CollectionOption {
  id: number;
  name: string;
  season_code?: string;
}

// Read filters from URL search params
const readFiltersFromUrl = (sp: URLSearchParams): FilterState => {
  const f: FilterState = { ...defaultFilters };
  for (const [key, paramName] of Object.entries(filterParamMap)) {
    const value = sp.get(paramName);
    if (value) {
      f[key as keyof FilterState] = value;
    }
  }
  return f;
};

export const Models = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissionsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Read state from URL (except search input which is local for typing)
  const statusFilter = (searchParams.get('status') as ModelStatus | 'all') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const appliedFilters = readFiltersFromUrl(searchParams);
  const urlSearch = searchParams.get('search') || '';

  // Local state for search input (so typing doesn't trigger API calls)
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  // Filter panel state (local only, written to URL on "Apply")
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ ...appliedFilters });
  const [collections, setCollections] = useState<CollectionOption[]>([]);

  // Count active filters
  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([, value]) => value !== ''
  ).length;

  // Helper to update URL params
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'all') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync local search input when URL changes (e.g. browser back)
  useEffect(() => {
    const urlSearchVal = searchParams.get('search') || '';
    setSearchTerm(urlSearchVal);
    const urlFilters = readFiltersFromUrl(searchParams);
    setFilters(urlFilters);
  }, [searchParams]);

  // Load collections for dropdown
  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await api.get('/collections');
      if (response.data?.success && response.data?.data) {
        setCollections(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  // Load models whenever URL params change
  useEffect(() => {
    loadModels();
  }, [searchParams]);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const currentSearch = searchParams.get('search') || '';
      const currentStatus = searchParams.get('status') || 'all';
      const currentPage = parseInt(searchParams.get('page') || '1', 10);
      const currentFilters = readFiltersFromUrl(searchParams);

      const params: any = { page: currentPage, limit };

      if (currentStatus !== 'all') {
        params.status = currentStatus;
      }

      if (currentSearch) {
        params.search = currentSearch;
      }

      // Apply advanced filters from URL
      if (currentFilters.modelNumber) params.model_number = currentFilters.modelNumber;
      if (currentFilters.modelName) params.model_name = currentFilters.modelName;
      if (currentFilters.collectionId) params.collection_id = currentFilters.collectionId;
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.buyerApproval) params.buyer_approval = currentFilters.buyerApproval;
      if (currentFilters.constructorApproval) params.constructor_approval = currentFilters.constructorApproval;
      if (currentFilters.productType) params.product_type = currentFilters.productType;
      if (currentFilters.dateFrom) params.date_from = currentFilters.dateFrom;
      if (currentFilters.dateTo) params.date_to = currentFilters.dateTo;

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

  // Search: write to URL only on Enter / button click
  const handleSearchSubmit = () => {
    updateSearchParams({ search: searchTerm || null, page: null });
  };

  const handleStatusFilterChange = (value: string) => {
    updateSearchParams({ status: value === 'all' ? null : value, page: null });
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage > 1 ? newPage.toString() : null });
  };

  const handleApplyFilters = () => {
    const updates: Record<string, string | null> = { page: null };
    for (const [key, paramName] of Object.entries(filterParamMap)) {
      const value = filters[key as keyof FilterState];
      updates[paramName] = value || null;
    }
    updateSearchParams(updates);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const updates: Record<string, string | null> = { page: null, status: null, search: null };
    for (const paramName of Object.values(filterParamMap)) {
      updates[paramName] = null;
    }
    setFilters({ ...defaultFilters });
    setSearchTerm('');
    updateSearchParams(updates);
    setShowFilters(false);
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    const paramName = filterParamMap[key];
    const updatedFilters = { ...filters, [key]: '' };
    setFilters(updatedFilters);
    updateSearchParams({ [paramName]: null, page: null });
  };

  const getFilterLabel = (key: keyof FilterState, value: string): string => {
    switch (key) {
      case 'modelNumber':
        return `${t('models.filterByModelNumber')}: ${value}`;
      case 'modelName':
        return `${t('models.filterByModelName')}: ${value}`;
      case 'collectionId': {
        const col = collections.find(c => c.id.toString() === value);
        return `${t('models.filterByCollection')}: ${col?.name || value}`;
      }
      case 'status':
        return `${t('models.filterByStatus')}: ${t(`statuses.${value}`)}`;
      case 'buyerApproval':
        return `${t('models.filterByBuyerApproval')}: ${t(`approval.${value}`)}`;
      case 'constructorApproval':
        return `${t('models.filterByConstructorApproval')}: ${t(`approval.${value}`)}`;
      case 'productType':
        return `${t('models.filterByType')}: ${value}`;
      case 'dateFrom':
        return `${t('models.filterByDateFrom')}: ${value}`;
      case 'dateTo':
        return `${t('models.filterByDateTo')}: ${value}`;
      default:
        return value;
    }
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

  const getApprovalIcon = (approvalStatus?: ApprovalStatus) => {
    if (!approvalStatus || approvalStatus === 'pending') {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }
    if (approvalStatus === 'approved') {
      return <Check className="w-5 h-5 text-green-600" />;
    }
    if (approvalStatus === 'approved_with_comments') {
      return <HelpCircle className="w-5 h-5 text-yellow-600" />;
    }
    if (approvalStatus === 'not_approved') {
      return <X className="w-5 h-5 text-fuchsia-600" />;
    }
    return <Circle className="w-5 h-5 text-gray-400" />;
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

        {/* Search & Quick Filters */}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                />
                <button
                  className="btn btn-secondary"
                  onClick={handleSearchSubmit}
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
                onChange={(e) => handleStatusFilterChange(e.target.value)}
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

            {/* Filter Button */}
            <div className="flex items-end">
              <button
                type="button"
                className={`btn w-full flex items-center justify-center gap-2 ${
                  activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() => {
                  setFilters({ ...appliedFilters });
                  setShowFilters(prev => !prev);
                }}
              >
                <Filter className="w-5 h-5" />
                {t('common.filters')}
                {activeFilterCount > 0 && (
                  <span className="bg-white text-primary-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    {getFilterLabel(key as keyof FilterState, value)}
                    <button
                      type="button"
                      onClick={() => handleRemoveFilter(key as keyof FilterState)}
                      className="ml-1 hover:text-primary-900"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {t('models.clearFilters')}
              </button>
            </div>
          )}
        </Card>

        {/* Extended Filter Panel */}
        {showFilters && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('common.filters')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Model Number */}
                <div>
                  <label className="label">{t('models.filterByModelNumber')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('models.filterModelNumberPlaceholder')}
                    value={filters.modelNumber}
                    onChange={(e) => setFilters({ ...filters, modelNumber: e.target.value })}
                  />
                </div>

                {/* Model Name */}
                <div>
                  <label className="label">{t('models.filterByModelName')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('models.filterModelNamePlaceholder')}
                    value={filters.modelName}
                    onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
                  />
                </div>

                {/* Collection */}
                <div>
                  <label className="label">{t('models.filterByCollection')}</label>
                  <select
                    className="input"
                    value={filters.collectionId}
                    onChange={(e) => setFilters({ ...filters, collectionId: e.target.value })}
                  >
                    <option value="">{t('models.allCollections')}</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name} {col.season_code ? `(${col.season_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="label">{t('models.filterByStatus')}</label>
                  <select
                    className="input"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option value="">{t('models.allStatuses')}</option>
                    <option value="draft">{t('statuses.draft')}</option>
                    <option value="under_review">{t('statuses.under_review')}</option>
                    <option value="approved">{t('statuses.approved')}</option>
                    <option value="ds">{t('statuses.ds_stage')}</option>
                    <option value="pps">{t('statuses.pps_stage')}</option>
                    <option value="in_production">{t('statuses.in_production')}</option>
                  </select>
                </div>

                {/* Buyer Approval */}
                <div>
                  <label className="label">{t('models.filterByBuyerApproval')}</label>
                  <select
                    className="input"
                    value={filters.buyerApproval}
                    onChange={(e) => setFilters({ ...filters, buyerApproval: e.target.value })}
                  >
                    <option value="">{t('models.allApprovals')}</option>
                    <option value="pending">{t('approval.pending')}</option>
                    <option value="approved">{t('approval.approved')}</option>
                    <option value="approved_with_comments">{t('approval.approvedWithComments')}</option>
                    <option value="not_approved">{t('approval.notApproved')}</option>
                  </select>
                </div>

                {/* Constructor Approval */}
                <div>
                  <label className="label">{t('models.filterByConstructorApproval')}</label>
                  <select
                    className="input"
                    value={filters.constructorApproval}
                    onChange={(e) => setFilters({ ...filters, constructorApproval: e.target.value })}
                  >
                    <option value="">{t('models.allApprovals')}</option>
                    <option value="pending">{t('approval.pending')}</option>
                    <option value="approved">{t('approval.approved')}</option>
                    <option value="approved_with_comments">{t('approval.approvedWithComments')}</option>
                    <option value="not_approved">{t('approval.notApproved')}</option>
                  </select>
                </div>

                {/* Product Type */}
                <div>
                  <label className="label">{t('models.filterByType')}</label>
                  <select
                    className="input"
                    value={filters.productType}
                    onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
                  >
                    <option value="">{t('models.allTypes')}</option>
                    <option value="textile">Textile</option>
                    <option value="denim">Denim</option>
                    <option value="sweater">Sweater</option>
                    <option value="knitwear">Knitwear</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="label">{t('models.filterByDateFrom')}</label>
                  <input
                    type="date"
                    className="input"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{t('models.filterByDateTo')}</label>
                  <input
                    type="date"
                    className="input"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                >
                  {t('models.clearFilters')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyFilters}
                >
                  {t('models.applyFilters')}
                </button>
              </div>
            </div>
          </Card>
        )}

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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('permissions.approveAsBuyer')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('permissions.approveAsConstructor')}
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
                            {model.model_name || '\u2014'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {model.collection_name || '\u2014'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getApprovalIcon((model as any).buyer_approval)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getApprovalIcon((model as any).constructor_approval)}
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
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="btn btn-secondary"
                    >
                      {t('common.previous')}
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
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
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="btn btn-secondary"
                      >
                        {t('common.previous')}
                      </button>
                      <button
                        onClick={() => handlePageChange(page + 1)}
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
