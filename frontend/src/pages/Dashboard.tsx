import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card, Badge } from '../components/ui';
import { Package, Clock, CheckCircle, TrendingUp, Settings, Check, X, HelpCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { modelsApi } from '../services/api';
import type { Model, ApprovalStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper function to get proper file URL (handles both R2 and local files)
const getFileUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
};

interface Stats {
  total: number;
  draft: number;
  under_review: number;
  approved: number;
  ds: number;
  pps: number;
  in_production: number;
}

export const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    under_review: 0,
    approved: 0,
    ds: 0,
    pps: 0,
    in_production: 0,
  });
  const [recentModels, setRecentModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadRecentModels();
  }, [selectedStatus]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Загружаем последние модели
      await loadRecentModels();

      // Загружаем все модели для подсчета статистики
      const allModelsResponse = await modelsApi.getModels({ limit: 10000, page: 1 });
      if (allModelsResponse.success && allModelsResponse.data) {
        const models = allModelsResponse.data.items;

        // Подсчитываем модели по статусам
        const statsByStatus = models.reduce((acc: Stats, model: Model) => {
          acc.total++;
          if (model.status === 'draft') acc.draft++;
          else if (model.status === 'under_review') acc.under_review++;
          else if (model.status === 'approved') acc.approved++;
          else if (model.status === 'ds') acc.ds++;
          else if (model.status === 'pps') acc.pps++;
          else if (model.status === 'in_production') acc.in_production++;
          return acc;
        }, {
          total: 0,
          draft: 0,
          under_review: 0,
          approved: 0,
          ds: 0,
          pps: 0,
          in_production: 0,
        });

        setStats(statsByStatus);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentModels = async () => {
    try {
      const params: any = { limit: 5, page: 1 };

      // Если выбран статус, добавляем фильтр
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const recentResponse = await modelsApi.getModels(params);
      if (recentResponse.success && recentResponse.data) {
        setRecentModels(recentResponse.data.items);
      }
    } catch (error) {
      console.error('Failed to load recent models:', error);
    }
  };

  const handleStatusClick = (status: string | null) => {
    setSelectedStatus(status);
  };

  const statCards = [
    {
      title: t('dashboard.totalModels'),
      value: stats.total,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      status: null,
    },
    {
      title: t('statuses.draft'),
      value: stats.draft,
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      status: 'draft',
    },
    {
      title: t('statuses.under_review'),
      value: stats.under_review,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      status: 'under_review',
    },
    {
      title: t('statuses.approved'),
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      status: 'approved',
    },
    {
      title: t('statuses.ds_stage'),
      value: stats.ds,
      icon: Settings,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      status: 'ds',
    },
    {
      title: t('statuses.pps_stage'),
      value: stats.pps,
      icon: Settings,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      status: 'pps',
    },
    {
      title: t('statuses.in_production'),
      value: stats.in_production,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      status: 'in_production',
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'info', label: t('statuses.draft') },
      under_review: { variant: 'warning', label: t('statuses.under_review') },
      approved: { variant: 'success', label: t('statuses.approved') },
      ds: { variant: 'info', label: t('statuses.ds_stage') },
      pps: { variant: 'warning', label: t('statuses.pps_stage') },
      in_production: { variant: 'success', label: t('statuses.in_production') },
    };

    const config = statusMap[status] || { variant: 'info', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getApprovalIcon = (approvalStatus?: ApprovalStatus) => {
    if (!approvalStatus || approvalStatus === 'not_approved') {
      return <X className="w-5 h-5 text-fuchsia-600" />;
    }
    if (approvalStatus === 'approved') {
      return <Check className="w-5 h-5 text-green-600" />;
    }
    if (approvalStatus === 'approved_with_comments') {
      return <HelpCircle className="w-5 h-5 text-yellow-600" />;
    }
    return <X className="w-5 h-5 text-fuchsia-600" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('auth.welcomeBack')}, {user?.full_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            {t('dashboard.title')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const isActive = selectedStatus === stat.status;
            return (
              <Card
                key={stat.title}
                className={`p-4 cursor-pointer transition-all ${
                  isActive
                    ? 'ring-2 ring-primary-500 shadow-lg'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleStatusClick(stat.status)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor} mb-3`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? '...' : stat.value}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Models */}
        <Card
          title={
            selectedStatus
              ? `${t('models.title')} (${
                  statCards.find((s) => s.status === selectedStatus)?.title ||
                  t('common.filter')
                })`
              : t('dashboard.recentModels')
          }
        >
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
          ) : recentModels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>{t('dashboard.noRecentModels')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('models.title')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('models.collections')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('permissions.approveAsBuyer')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('permissions.approveAsConstructor')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentModels.map((model: any) => (
                    <tr
                      key={model.id}
                      onClick={() => navigate(`/models/${model.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Миниатюра скетча */}
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            {model.sketch_url ? (
                              <img
                                src={getFileUrl(model.sketch_url)}
                                alt={model.model_number}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {model.model_number}
                            </span>
                            <span className="text-sm text-gray-500">
                              {model.model_name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {model.collection_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(model.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getApprovalIcon(model.buyer_approval)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getApprovalIcon(model.constructor_approval)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(model.created_at).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Admin Panel Access (buyer only) */}
        {user?.role === 'buyer' && (
          <Card title={t('nav.admin')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-900">
                  {t('dashboard.manageReferences')}
                </p>
              </button>
              <button
                onClick={() => navigate('/users')}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-900">
                  {t('nav.users')}
                </p>
              </button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
