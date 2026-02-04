import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/Layout';
import { Card, Button } from '../components/ui';
import { ModelComments } from '../components/ModelComments';
import { ApprovalCard } from '../components/ApprovalCard';
import { ArrowLeft, Edit, Download, Upload, FileText, Image as ImageIcon, Trash2, Pencil } from 'lucide-react';
import { modelsApi } from '../services/api';
import type { Model, ApprovalStatus } from '../types';
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

interface TechnicalFile {
  id: number;
  file_name: string;
  file_url: string;
  file_type: 'sketch' | 'tech_pack' | 'print' | 'pattern' | 'size_spec';
  uploaded_at: string;
}

interface Material {
  id: number;
  material_type: 'main' | 'upper' | 'lining' | 'hood_lining' | 'insulation';
  name: string;
  fabric_type: string;
  fabric_weight_gsm?: string;
}

interface ModelColor {
  id: number;
  pantone_code: string;
  color_name: string;
  zone?: string;
  hex_color?: string;
  sort_order: number;
}

interface Factory {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}

export const ModelDetail = () => {
  const { t } = useTranslation();
  const { hasPermission, loadPermissions } = usePermissionsStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [model, setModel] = useState<Model | null>(null);
  const [technicalFiles, setTechnicalFiles] = useState<TechnicalFile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [colors, setColors] = useState<ModelColor[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [productGroups, setProductGroups] = useState<Array<{value: string, label: string, code?: string}>>([]);
  const [isEditingProductGroup, setIsEditingProductGroup] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<{ type: string; name: string; fabric_type: string; fabric_weight_gsm: string } | null>(null);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteMaterialModal, setShowDeleteMaterialModal] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isEditingFactory, setIsEditingFactory] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [isSavingFactory, setIsSavingFactory] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedModel, setEditedModel] = useState<Partial<Model>>({});
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingFitType, setEditingFitType] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFitType, setSelectedFitType] = useState('');
  const [categories, setCategories] = useState<Array<{value: string, label: string}>>([]);
  const [fitTypes, setFitTypes] = useState<Array<{value: string, label: string}>>([]);
  const [isEditingColors, setIsEditingColors] = useState(false);
  const [editingColor, setEditingColor] = useState<ModelColor | null>(null);
  const [newColor, setNewColor] = useState({ pantone_code: '', color_name: '', hex_color: '' });
  const [showDeleteColorModal, setShowDeleteColorModal] = useState(false);
  const [colorToDelete, setColorToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteModelModal, setShowDeleteModelModal] = useState(false);
  const [isDeletingModel, setIsDeletingModel] = useState(false);

  useEffect(() => {
    // CRITICAL: Clear all model data when navigating to a different model
    setModel(null);
    setTechnicalFiles([]);
    setMaterials([]);
    setColors([]);

    loadPermissions(); // Ensure permissions are loaded
    if (id) {
      loadModelData();
      loadProductGroups();
      loadFactories();
      loadCategories();
      loadFitTypes();
    }
  }, [id]);

  const loadFactories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/factories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFactories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load factories:', error);
    }
  };

  const loadProductGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data/product_group`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // Sort by label alphabetically
        const sorted = [...data.data].sort((a, b) =>
          (a.label || '').localeCompare(b.label || '', 'ru')
        );
        setProductGroups(sorted);
      }
    } catch (error) {
      console.error('Failed to load product groups:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data/product_type`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadFitTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data/fit_type`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFitTypes(data.data);
      }
    } catch (error) {
      console.error('Failed to load fit types:', error);
    }
  };

  const loadModelData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Загружаем основную информацию о модели
      const modelResponse = await modelsApi.getModelById(parseInt(id!));

      if (modelResponse.success && modelResponse.data) {
        const loadedModel = modelResponse.data;
        setModel(loadedModel);
        setSelectedStatus(loadedModel.status);
      }

      // Загружаем технические файлы
      const filesResponse = await fetch(`${API_BASE_URL}/models/${id}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const filesData = await filesResponse.json();
      if (filesData.success) {
        setTechnicalFiles(filesData.data || []);
      }

      // Загружаем материалы
      const materialsResponse = await fetch(`${API_BASE_URL}/models/${id}/materials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const materialsData = await materialsResponse.json();
      if (materialsData.success) {
        setMaterials(materialsData.data || []);
      }

      // Загружаем цвета
      const colorsResponse = await fetch(`${API_BASE_URL}/models/${id}/colors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const colorsData = await colorsResponse.json();
      if (colorsData.success) {
        setColors(colorsData.data || []);
      }

    } catch (error) {
      console.error('Failed to load model data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const token = localStorage.getItem('token');

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);

        const response = await fetch(`${API_BASE_URL}/models/${id}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error_ru || result.error || 'Ошибка загрузки файла';
          alert(`Ошибка: ${errorMessage}`);
          console.error('Upload failed:', result);
          return;
        }
      }

      // Перезагружаем список файлов
      await loadModelData();
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Ошибка сети при загрузке файла');
    } finally {
      setIsUploading(false);
      // Сбрасываем input, чтобы можно было загрузить тот же файл повторно
      event.target.value = '';
    }
  };

  const updateProductGroup = async () => {
    try {
      const token = localStorage.getItem('token');
      // Find the selected group to get both label (name) and code
      const selectedGroup = productGroups.find(g => g.value === selectedProductGroup);
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // Save label (name) to product_group, code to product_group_code
          product_group: selectedGroup?.label || null,
          product_group_code: selectedGroup?.code || null
        })
      });

      if (response.ok) {
        setIsEditingProductGroup(false);
        await loadModelData();
      }
    } catch (error) {
      console.error('Failed to update product group:', error);
    }
  };

  const updateFactory = async () => {
    if (selectedFactory === model?.assigned_factory_id) {
      setIsEditingFactory(false);
      return;
    }

    setIsSavingFactory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/assign-factory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          factory_id: selectedFactory
        })
      });

      if (response.ok) {
        await loadModelData();
        setIsEditingFactory(false);
      } else {
        console.error('Failed to update factory');
        alert(t('modelDetail.updateSupplierError'));
      }
    } catch (error) {
      console.error('Failed to update factory:', error);
      alert(t('modelDetail.updateSupplierError'));
    } finally {
      setIsSavingFactory(false);
    }
  };

  const updateStatus = async () => {
    if (!selectedStatus || selectedStatus === model?.status) {
      setIsEditingStatus(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: selectedStatus
        })
      });

      if (response.ok) {
        setIsEditingStatus(false);
        await loadModelData();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const saveMaterial = async () => {
    if (!editingMaterial) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          material_type: editingMaterial.type,
          name: editingMaterial.name,
          fabric_type: editingMaterial.fabric_type,
          fabric_weight_gsm: editingMaterial.fabric_weight_gsm
        })
      });

      if (response.ok) {
        setEditingMaterial(null);
        await loadModelData();
      }
    } catch (error) {
      console.error('Failed to save material:', error);
    }
  };

  const handleDeleteMaterialClick = (materialId: number, materialName: string) => {
    setMaterialToDelete({ id: materialId, name: materialName });
    setShowDeleteMaterialModal(true);
  };

  const handleDeleteMaterialConfirm = async () => {
    if (!materialToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/models/${id}/materials/${materialToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowDeleteMaterialModal(false);
      setMaterialToDelete(null);
      await loadModelData();
    } catch (error) {
      console.error('Failed to delete material:', error);
      setShowDeleteMaterialModal(false);
      setMaterialToDelete(null);
    }
  };

  const handleDeleteFileClick = (fileId: number, fileName: string) => {
    setFileToDelete({ id: fileId, name: fileName });
    setShowDeleteFileModal(true);
  };

  const handleDeleteFileConfirm = async () => {
    if (!fileToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/models/${id}/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowDeleteFileModal(false);
      setFileToDelete(null);
      await loadModelData();
    } catch (error) {
      console.error('Failed to delete file:', error);
      setShowDeleteFileModal(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteModel = async () => {
    if (!id) return;

    setIsDeletingModel(true);
    try {
      await modelsApi.deleteModel(parseInt(id));
      setShowDeleteModelModal(false);
      navigate('/models');
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert(t('modelDetail.deleteModelError') || 'Ошибка при удалении модели');
    } finally {
      setIsDeletingModel(false);
    }
  };

  const handleExportFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/files/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Не удалось экспортировать файлы');
        return;
      }

      // Получаем blob из ответа
      const blob = await response.blob();

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Очищаем имя файла от недопустимых символов
      const sanitizedModelNumber = model?.model_number?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'model';
      a.download = `${sanitizedModelNumber}_files.zip`;
      document.body.appendChild(a);
      a.click();

      // Очищаем
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export files:', error);
      alert('Ошибка при экспорте файлов');
    }
  };

  const handleEditMode = () => {
    setIsEditMode(true);
    setEditedModel({
      model_name: model?.model_name,
      brand: model?.brand,
      prototype_number: model?.prototype_number
    });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedModel)
      });

      if (response.ok) {
        await loadModelData();
        setIsEditMode(false);
        setEditedModel({});
      } else {
        alert('Не удалось сохранить изменения');
      }
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedModel({});
  };

  const updateCategory = async () => {
    if (!selectedCategory || selectedCategory === model?.category) {
      setEditingCategory(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: selectedCategory })
      });

      if (response.ok) {
        await loadModelData();
        setEditingCategory(false);
      } else {
        alert(t('modelDetail.updateCategoryError'));
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      alert(t('modelDetail.updateCategoryError'));
    }
  };

  const updateFitType = async () => {
    if (!selectedFitType || selectedFitType === model?.fit_type) {
      setEditingFitType(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fit_type: selectedFitType })
      });

      if (response.ok) {
        await loadModelData();
        setEditingFitType(false);
      } else {
        alert(t('modelDetail.updateFitTypeError'));
      }
    } catch (error) {
      console.error('Failed to update fit type:', error);
      alert(t('modelDetail.updateFitTypeError'));
    }
  };

  const addColor = async () => {
    if (!newColor.pantone_code) {
      alert(t('modelDetail.enterPantoneCode'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newColor)
      });

      if (response.ok) {
        await loadModelData();
        setNewColor({ pantone_code: '', color_name: '', hex_color: '' });
      } else {
        alert(t('modelDetail.addColorError'));
      }
    } catch (error) {
      console.error('Failed to add color:', error);
      alert(t('modelDetail.addColorError'));
    }
  };

  const updateColor = async (colorId: number, updatedData: Partial<ModelColor>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/colors/${colorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        await loadModelData();
        setEditingColor(null);
      } else {
        alert(t('modelDetail.updateColorError'));
      }
    } catch (error) {
      console.error('Failed to update color:', error);
      alert(t('modelDetail.updateColorError'));
    }
  };

  const confirmDeleteColor = async () => {
    if (!colorToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/colors/${colorToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadModelData();
        setShowDeleteColorModal(false);
        setColorToDelete(null);
      } else {
        alert(t('modelDetail.deleteColorError'));
      }
    } catch (error) {
      console.error('Failed to delete color:', error);
      alert(t('modelDetail.deleteColorError'));
    }
  };

  const updateBuyerApproval = async (approvalStatus: ApprovalStatus, comment?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/buyer-approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approval_status: approvalStatus, comment })
      });

      if (response.ok) {
        await loadModelData();
      } else {
        throw new Error('Failed to update buyer approval');
      }
    } catch (error) {
      console.error('Failed to update buyer approval:', error);
      throw error;
    }
  };

  const updateConstructorApproval = async (approvalStatus: ApprovalStatus, comment?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/models/${id}/constructor-approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approval_status: approvalStatus, comment })
      });

      if (response.ok) {
        await loadModelData();
      } else {
        throw new Error('Failed to update constructor approval');
      }
    } catch (error) {
      console.error('Failed to update constructor approval:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-600',
      'under_review': 'bg-yellow-100 text-yellow-600',
      'approved': 'bg-green-100 text-green-600',
      'ds': 'bg-blue-100 text-blue-600',
      'pps': 'bg-orange-100 text-orange-600',
      'in_production': 'bg-purple-100 text-purple-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const statusKeys: Record<string, string> = {
      'draft': 'statuses.draft',
      'under_review': 'statuses.under_review',
      'approved': 'statuses.approved',
      'ds_stage': 'statuses.ds_stage',
      'pps_stage': 'statuses.pps_stage',
      'in_production': 'statuses.in_production',
    };
    return statusKeys[status] ? t(statusKeys[status]) : status;
  };

  const getMaterialTypeLabel = (materialType: string) => {
    const materialKeys: Record<string, string> = {
      'main': 'modelDetail.mainMaterial',
      'upper': 'modelDetail.upperMaterial',
      'lining': 'modelDetail.liningMaterial',
      'hood_lining': 'modelDetail.hoodLiningMaterial',
      'insulation': 'modelDetail.insulation'
    };
    return materialKeys[materialType] ? t(materialKeys[materialType]) : materialType;
  };

  const getFilesByType = (fileType: string) => {
    return technicalFiles.filter(f => f.file_type === fileType);
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  if (!model) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">{t('modelDetail.modelNotFound')}</p>
          <Button onClick={() => navigate('/models-hierarchy')} className="mt-4">
            {t('modelDetail.returnToList')}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{model.model_number}</h1>
              <p className="text-gray-600 mt-1">{model.model_name || t('modelDetail.noName')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportFiles}>
              <Download className="w-4 h-4 mr-2" />
              {t('common.export')}
            </Button>
            {hasPermission('can_delete_models') && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteModelModal(true)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
            {hasPermission('can_edit_models') && (
              <>
                {isEditMode ? (
                  <>
                    <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                      <Edit className="w-4 h-4 mr-2" />
                      {t('common.save')}
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      {t('common.cancel')}
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEditMode}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка - Финальный скетч и документы */}
          <div className="lg:col-span-2 space-y-6">
            {/* Финальный скетч */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{t('modelDetail.finalSketch')}</h2>
                {hasPermission('can_upload_files') && (
                  <label>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'sketch')}
                      disabled={isUploading}
                    />
                    <span className={`inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('common.upload')}
                    </span>
                  </label>
                )}
              </div>

              {getFilesByType('sketch').length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {getFilesByType('sketch').map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={`${getFileUrl(file.file_url)}`}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load image:', file.file_url);
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`${getFileUrl(file.file_url)}`}
                          download
                          className="bg-white p-2 rounded-lg shadow hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </a>
                        {hasPermission('can_delete_files') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFileClick(file.id, file.file_name);
                            }}
                            className="bg-white p-2 rounded-lg shadow hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{file.file_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-16 h-16 mx-auto mb-2" />
                    <p>{t('modelDetail.noUploadedFiles')}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Техническая документация */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('modelDetail.techDocs')}</h2>
              <div className="space-y-4">
                {/* Artwork */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Artwork</h3>
                    {hasPermission('can_upload_files') && (
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => handleFileUpload(e, 'tech_pack')}
                          disabled={isUploading}
                        />
                        <span className={`inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          {t('common.upload')}
                        </span>
                      </label>
                    )}
                  </div>
                  {getFilesByType('tech_pack').length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {getFilesByType('tech_pack').map((file) => (
                        <div key={file.id} className="relative group">
                          {isImageFile(file.file_name) ? (
                            <>
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={`${getFileUrl(file.file_url)}`}
                                  alt={file.file_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Failed to load image:', file.file_url);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></div>';
                                  }}
                                />
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="bg-white p-2 rounded-lg shadow hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="bg-white p-2 rounded-lg shadow hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">{file.file_name}</p>
                            </>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-900 truncate">{file.file_name}</span>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="inline-flex items-center justify-center px-2 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="inline-flex items-center justify-center px-2 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">{t('modelDetail.filesNotUploaded')}</p>
                  )}
                </div>

                {/* Print */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Print (AI формат)</h3>
                    {hasPermission('can_upload_files') && (
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          accept=".ai,.eps"
                          multiple
                          onChange={(e) => handleFileUpload(e, 'print')}
                          disabled={isUploading}
                        />
                        <span className={`inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          {t('common.upload')}
                        </span>
                      </label>
                    )}
                  </div>
                  {getFilesByType('print').length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {getFilesByType('print').map((file) => (
                        <div key={file.id} className="relative group">
                          {isImageFile(file.file_name) ? (
                            <>
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={`${getFileUrl(file.file_url)}`}
                                  alt={file.file_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Failed to load image:', file.file_url);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></div>';
                                  }}
                                />
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="bg-white p-2 rounded-lg shadow hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="bg-white p-2 rounded-lg shadow hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">{file.file_name}</p>
                            </>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-900 truncate">{file.file_name}</span>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="inline-flex items-center justify-center px-2 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="inline-flex items-center justify-center px-2 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">{t('modelDetail.filesNotUploaded')}</p>
                  )}
                </div>

                {/* Паттерн */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{t('modelDetail.pattern') || 'Pattern'}</h3>
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) => handleFileUpload(e, 'pattern')}
                        disabled={isUploading}
                      />
                      <span className={`inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('common.upload')}
                      </span>
                    </label>
                  </div>
                  {getFilesByType('pattern').length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {getFilesByType('pattern').map((file) => (
                        <div key={file.id} className="relative group">
                          {isImageFile(file.file_name) ? (
                            <>
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={`${getFileUrl(file.file_url)}`}
                                  alt={file.file_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Failed to load image:', file.file_url);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></div>';
                                  }}
                                />
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="bg-white p-2 rounded-lg shadow hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="bg-white p-2 rounded-lg shadow hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">{file.file_name}</p>
                            </>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-900 truncate">{file.file_name}</span>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={`${getFileUrl(file.file_url)}`}
                                  download
                                  className="inline-flex items-center justify-center px-2 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                {hasPermission('can_delete_files') && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFileClick(file.id, file.file_name);
                                    }}
                                    className="inline-flex items-center justify-center px-2 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">{t('modelDetail.filesNotUploaded')}</p>
                  )}
                </div>

                {/* Табель мер */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">{t('modelDetail.sizeSpec')}</h3>
                    {hasPermission('can_upload_files') && (
                      <label>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'size_spec')}
                          disabled={isUploading}
                        />
                        <span className={`inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <Upload className="w-4 h-4 mr-2" />
                          {t('common.upload')}
                        </span>
                      </label>
                    )}
                  </div>
                  {getFilesByType('size_spec').length > 0 ? (
                    <div className="space-y-2">
                      {getFilesByType('size_spec').map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-900">{file.file_name}</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`${getFileUrl(file.file_url)}`}
                              download
                              className="inline-flex items-center justify-center px-2 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            {hasPermission('can_delete_files') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFileClick(file.id, file.file_name);
                                }}
                                className="inline-flex items-center justify-center px-2 py-2 text-sm border border-red-300 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">{t('modelDetail.fileNotUploaded')}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Approvals Section */}
            {model && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ApprovalCard
                  key={`buyer-${model.id}`}
                  title={t('modelDetail.buyer')}
                  status={model.buyer_approval || 'pending'}
                  comment={model.buyer_approval_comment || undefined}
                  approvedAt={model.buyer_approved_at}
                  canEdit={hasPermission('can_approve_as_buyer')}
                  onUpdate={updateBuyerApproval}
                />

                <ApprovalCard
                  key={`constructor-${model.id}`}
                  title={t('modelDetail.constructor')}
                  status={model.constructor_approval || 'pending'}
                  comment={model.constructor_approval_comment || undefined}
                  approvedAt={model.constructor_approved_at}
                  canEdit={hasPermission('can_approve_as_constructor')}
                  onUpdate={updateConstructorApproval}
                />
              </div>
            )}
          </div>

          {/* Правая колонка - Основная информация и материалы */}
          <div className="space-y-6">
            {/* Основная информация */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('modelDetail.basicInfo')}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">{t('common.status')}</label>
                  {isEditingStatus ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approved</option>
                        <option value="ds">DS / Development Sample</option>
                        <option value="pps">PPS / Pre-Production Sample</option>
                        <option value="in_production">In Production</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={updateStatus}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          ✓ {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingStatus(false);
                            setSelectedStatus(model.status);
                          }}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(model.status)}`}>
                        {getStatusLabel(model.status)}
                      </span>
                      {hasPermission('can_edit_model_status') && !isEditMode && (
                        <button
                          onClick={() => {
                            setSelectedStatus(model.status);
                            setIsEditingStatus(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          {t('common.change')}
                        </button>
                      )}
                      {isEditMode && hasPermission('can_edit_model_status') && (
                        <button
                          onClick={() => {
                            setSelectedStatus(model.status);
                            setIsEditingStatus(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('modelDetail.productType')}</label>
                  <p className="text-sm font-medium text-gray-900">{model.product_type || '—'}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.category')}</label>
                  {editingCategory ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{t('modelDetail.selectCategory')}</option>
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={updateCategory}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          ✓ {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategory(false);
                            setSelectedCategory(model.category || '');
                          }}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">{model.category}</p>
                      {isEditMode && (
                        <button
                          onClick={() => {
                            setSelectedCategory(model.category || '');
                            setEditingCategory(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.brand')}</label>
                  {isEditMode ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editedModel.brand || ''}
                        onChange={(e) => setEditedModel({ ...editedModel, brand: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Бренд"
                      />
                      <Pencil className="w-4 h-4 text-primary-600" />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{model.brand || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.prototypeNumber')}</label>
                  {isEditMode ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editedModel.prototype_number || ''}
                        onChange={(e) => setEditedModel({ ...editedModel, prototype_number: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Номер прототипа"
                      />
                      <Pencil className="w-4 h-4 text-primary-600" />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{model.prototype_number || '—'}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.productGroup')}</label>
                  {isEditingProductGroup ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedProductGroup}
                        onChange={(e) => setSelectedProductGroup(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{t('modelDetail.notSelected')}</option>
                        {productGroups.map((group) => (
                          <option key={group.value} value={group.value}>
                            {group.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={updateProductGroup}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          ✓ {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingProductGroup(false);
                            // Find group by label (name) to restore the value for select
                            const currentGroup = productGroups.find(g => g.label === model.product_group);
                            setSelectedProductGroup(currentGroup?.value || '');
                          }}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">
                        {model.product_group || '—'}
                      </p>
                      {hasPermission('can_edit_models') && !isEditMode && (
                        <button
                          onClick={() => {
                            // Find group by label (name) to get the value for select
                            const currentGroup = productGroups.find(g => g.label === model.product_group);
                            setSelectedProductGroup(currentGroup?.value || '');
                            setIsEditingProductGroup(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          Изменить
                        </button>
                      )}
                      {isEditMode && (
                        <button
                          onClick={() => {
                            // Find group by label (name) to get the value for select
                            const currentGroup = productGroups.find(g => g.label === model.product_group);
                            setSelectedProductGroup(currentGroup?.value || '');
                            setIsEditingProductGroup(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.productGroupCode')}</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {model.product_group_code || '—'}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Дата создания</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(model.date_created).toLocaleDateString('ru-RU')}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.fitType')}</label>
                  {editingFitType ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedFitType}
                        onChange={(e) => setSelectedFitType(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{t('modelDetail.selectFitType')}</option>
                        {fitTypes.map((fit) => (
                          <option key={fit.value} value={fit.value}>
                            {fit.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={updateFitType}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          ✓ {t('common.save')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingFitType(false);
                            setSelectedFitType(model.fit_type || '');
                          }}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">{model.fit_type || '—'}</p>
                      {isEditMode && (
                        <button
                          onClick={() => {
                            setSelectedFitType(model.fit_type || '');
                            setEditingFitType(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">{t('models.supplier')}</label>
                  {isEditingFactory ? (
                    <div className="mt-1 space-y-2">
                      <select
                        value={selectedFactory || ''}
                        onChange={(e) => setSelectedFactory(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{t('modelDetail.notSelected')}</option>
                        {factories.map((factory) => (
                          <option key={factory.id} value={factory.id}>
                            {factory.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={updateFactory}
                          disabled={isSavingFactory}
                          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingFactory ? '⏳ Сохранение...' : '✓ Сохранить'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingFactory(false);
                            setSelectedFactory(model.assigned_factory_id || null);
                          }}
                          disabled={isSavingFactory}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✕ {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">
                        {factories.find(f => f.id === model.assigned_factory_id)?.name || '—'}
                      </p>
                      {hasPermission('can_edit_models') && !isEditMode && (
                        <button
                          onClick={() => {
                            setSelectedFactory(model.assigned_factory_id || null);
                            setIsEditingFactory(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          Изменить
                        </button>
                      )}
                      {isEditMode && (
                        <button
                          onClick={() => {
                            setSelectedFactory(model.assigned_factory_id || null);
                            setIsEditingFactory(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-600">{t('modelDetail.colors')}</label>
                    {isEditMode && (
                      <button
                        onClick={() => setIsEditingColors(!isEditingColors)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isEditingColors && isEditMode ? (
                    <div className="mt-2 space-y-3">
                      {/* Existing colors */}
                      {colors.map((color) => (
                        <div key={color.id}>
                          {editingColor?.id === color.id ? (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                              <input
                                type="text"
                                value={editingColor.pantone_code}
                                onChange={(e) => setEditingColor({ ...editingColor, pantone_code: e.target.value })}
                                placeholder="Код Pantone"
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                value={editingColor.color_name || ''}
                                onChange={(e) => setEditingColor({ ...editingColor, color_name: e.target.value })}
                                placeholder="Название цвета"
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                value={editingColor.hex_color || ''}
                                onChange={(e) => setEditingColor({ ...editingColor, hex_color: e.target.value })}
                                placeholder="HEX цвет (например, #FF0000)"
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateColor(color.id, editingColor)}
                                  className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                >
                                  ✓ {t('common.save')}
                                </button>
                                <button
                                  onClick={() => setEditingColor(null)}
                                  className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                  ✕ {t('common.cancel')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                              {color.hex_color && (
                                <div
                                  className="w-8 h-8 rounded border border-gray-300"
                                  style={{ backgroundColor: color.hex_color }}
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{color.pantone_code}</p>
                                {color.color_name && (
                                  <p className="text-xs text-gray-600">{color.color_name}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingColor(color)}
                                  className="text-primary-600 hover:text-primary-700"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setColorToDelete({ id: color.id, name: color.color_name || color.pantone_code });
                                    setShowDeleteColorModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add new color form */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
                        <p className="text-sm font-medium text-gray-900">{t('modelDetail.addColor')}</p>
                        <input
                          type="text"
                          value={newColor.pantone_code}
                          onChange={(e) => setNewColor({ ...newColor, pantone_code: e.target.value })}
                          placeholder="Код Pantone *"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={newColor.color_name}
                          onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value })}
                          placeholder="Название цвета"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={newColor.hex_color}
                          onChange={(e) => setNewColor({ ...newColor, hex_color: e.target.value })}
                          placeholder="HEX цвет (например, #FF0000)"
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                          onClick={addColor}
                          className="w-full px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          {t('modelDetail.addColorBtn')}
                        </button>
                      </div>
                    </div>
                  ) : colors.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {colors.map((color) => (
                        <div key={color.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          {color.hex_color && (
                            <div
                              className="w-8 h-8 rounded border border-gray-300"
                              style={{ backgroundColor: color.hex_color }}
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{color.pantone_code}</p>
                            {color.color_name && (
                              <p className="text-xs text-gray-600">{color.color_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">{t('modelDetail.noColorsAdded')}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Материалы */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Материалы</h2>
              <div className="space-y-3">
                {['main', 'upper', 'lining', 'hood_lining', 'insulation'].map((type) => {
                  const material = materials.find(m => m.material_type === type);
                  const isEditing = editingMaterial?.type === type;

                  return (
                    <div key={type} className="p-3 bg-gray-50 rounded-lg">
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        {getMaterialTypeLabel(type)}
                      </label>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingMaterial.name}
                            onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                            placeholder={t('modelDetail.materialName')}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={editingMaterial.fabric_type}
                            onChange={(e) => setEditingMaterial({...editingMaterial, fabric_type: e.target.value})}
                            placeholder={t('modelDetail.fabricType')}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={editingMaterial.fabric_weight_gsm}
                            onChange={(e) => setEditingMaterial({...editingMaterial, fabric_weight_gsm: e.target.value})}
                            placeholder={t('modelDetail.fabricWeightGsm')}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveMaterial}
                              className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              ✓ {t('common.save')}
                            </button>
                            <button
                              onClick={() => setEditingMaterial(null)}
                              className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              ✕ {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            {material ? (
                              <>
                                <p className="text-sm font-medium text-gray-900">
                                  {material.name}
                                </p>
                                {material.fabric_type && (
                                  <p className="text-xs text-gray-500 mt-1">{t('modelDetail.fabricType')}: {material.fabric_type}</p>
                                )}
                                {material.fabric_weight_gsm && (
                                  <p className="text-xs text-gray-500 mt-1">{t('modelDetail.fabricWeightGsm')}: {material.fabric_weight_gsm}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-gray-400">{t('modelDetail.notSelected')}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {hasPermission('can_edit_materials') && (
                              <button
                                onClick={() => setEditingMaterial({
                                  type,
                                  name: material?.name || '',
                                  fabric_type: material?.fabric_type || '',
                                  fabric_weight_gsm: material?.fabric_weight_gsm || ''
                                })}
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                              >
                                {material ? t('common.change') : t('common.add')}
                              </button>
                            )}
                            {material && hasPermission('can_delete_materials') && (
                              <button
                                onClick={() => handleDeleteMaterialClick(material.id, material.name)}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                              >
                                {t('common.delete')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6">
          <ModelComments modelId={parseInt(id!)} />
        </div>
      </div>

      {/* Delete File Modal */}
      {showDeleteFileModal && fileToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteFileModal(false);
            setFileToDelete(null);
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
              <h2 className="text-xl font-bold text-gray-900">{t('modelDetail.deleteFileTitle')}</h2>
            </div>

            <p className="text-gray-600 mb-6">
              {t('modelDetail.deleteFileMessage')} <strong>{fileToDelete.name}</strong>? {t('modelDetail.cannotUndo')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteFileModal(false);
                  setFileToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteFileConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Material Modal */}
      {showDeleteMaterialModal && materialToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteMaterialModal(false);
            setMaterialToDelete(null);
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
              <h2 className="text-xl font-bold text-gray-900">Удалить материал</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Вы действительно хотите удалить материал <strong>{materialToDelete.name}</strong>? Это действие невозможно отменить.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteMaterialModal(false);
                  setMaterialToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteMaterialConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Color Modal */}
      {showDeleteColorModal && colorToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteColorModal(false);
            setColorToDelete(null);
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
              <h2 className="text-xl font-bold text-gray-900">Удалить цвет</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Вы действительно хотите удалить цвет <strong>{colorToDelete.name}</strong>? Это действие невозможно отменить.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteColorModal(false);
                  setColorToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDeleteColor}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Model Modal */}
      {showDeleteModelModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModelModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{t('modelDetail.deleteModelTitle')}</h2>
            </div>

            <p className="text-gray-600 mb-6">
              {t('modelDetail.deleteModelMessage')} <strong>{model?.model_number}</strong>? {t('modelDetail.cannotUndo')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModelModal(false)}
                disabled={isDeletingModel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteModel}
                disabled={isDeletingModel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {isDeletingModel ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
