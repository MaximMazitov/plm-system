import { useState, useEffect } from 'react';
import { Button } from './ui';
import { Plus, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface Color {
  pantone_code: string;
  color_name: string;
}

interface Collection {
  id: number;
  name: string;
  season_code: string;
}

interface CreateModelModalProps {
  isOpen?: boolean;
  collectionId?: string;
  collectionName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateModelModal = ({
  isOpen = true,
  collectionId,
  collectionName,
  onClose,
  onSuccess
}: CreateModelModalProps) => {
  const [formData, setFormData] = useState({
    model_number: '',
    model_name: '',
    product_type: '',
    category: '',
    fit_type: '',
    product_group: '',
    prototype_number: '',
    brand: ''
  });

  const [colors, setColors] = useState<Color[]>([{ pantone_code: '', color_name: '' }]);
  const [referenceData, setReferenceData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionId || '');

  const userRole = localStorage.getItem('role');

  useEffect(() => {
    if (isOpen) {
      loadReferenceData();
      if (!collectionId) {
        loadCollections();
      }
    }
  }, [isOpen, collectionId]);

  const loadCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCollections(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadReferenceData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/reference-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setReferenceData(data.data);
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  const addColor = () => {
    setColors([...colors, { pantone_code: '', color_name: '' }]);
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, field: keyof Color, value: string) => {
    const updated = [...colors];
    updated[index][field] = value;
    setColors(updated);
  };

  const handleSubmit = async () => {
    const finalCollectionId = collectionId || selectedCollectionId;
    if (!formData.model_number.trim() || (!formData.category && !customCategory) || !finalCollectionId) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const finalCategory = useCustomCategory ? customCategory : formData.category;

      // Filter out empty colors
      const validColors = colors.filter(c => c.pantone_code.trim());

      const response = await fetch(`${API_BASE_URL}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          collection_id: parseInt(finalCollectionId),
          model_number: formData.model_number,
          model_name: formData.model_name || null,
          product_type: formData.product_type || null,
          category: finalCategory,
          fit_type: formData.fit_type || null,
          product_group: formData.product_group || null,
          prototype_number: formData.prototype_number || null,
          brand: formData.brand || null,
          colors: validColors.length > 0 ? validColors : null
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при создании модели');
      }
    } catch (error) {
      console.error('Failed to create model:', error);
      alert('Ошибка при создании модели');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const hasCollection = collectionId || selectedCollectionId;
    return formData.model_number.trim() && (formData.category || customCategory.trim()) && hasCollection;
  };

  if (!isOpen) return null;

  const selectedCollection = collections.find(c => c.id.toString() === selectedCollectionId);
  const displayCollectionName = collectionName || (selectedCollection ? `${selectedCollection.name} (${selectedCollection.season_code})` : '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Создать модель</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Выбор коллекции (если не передана) */}
          {!collectionId && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Коллекция</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите коллекцию <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Выберите коллекцию</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({collection.season_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Основная информация */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Основная информация</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер модели <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model_number}
                  onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: M001"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название модели
                </label>
                <input
                  type="text"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Опционально"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Бренд
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: Kari"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер прототипа
                </label>
                <input
                  type="text"
                  value={formData.prototype_number}
                  onChange={(e) => setFormData({ ...formData, prototype_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Если есть"
                />
              </div>
            </div>
          </div>

          {/* Характеристики продукта */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Характеристики продукта</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип продукта
                </label>
                <select
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Выберите тип</option>
                  {referenceData.product_type?.map((item: any) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория <span className="text-red-500">*</span>
                </label>
                {!useCustomCategory ? (
                  <div className="relative">
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setUseCustomCategory(true);
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Выберите категорию</option>
                      {referenceData.category?.map((item: any) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                      <option value="__custom__">+ Ввести вручную</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Введите категорию"
                    />
                    <button
                      onClick={() => {
                        setUseCustomCategory(false);
                        setCustomCategory('');
                      }}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип посадки
                </label>
                <select
                  value={formData.fit_type}
                  onChange={(e) => setFormData({ ...formData, fit_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Выберите посадку</option>
                  {referenceData.fit_type?.map((item: any) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              {userRole === 'buyer' && (
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Группа товара <span className="text-xs text-gray-500">(только для байера)</span>
                  </label>
                  <select
                    value={formData.product_group}
                    onChange={(e) => setFormData({ ...formData, product_group: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Выберите группу</option>
                    {referenceData.product_group?.map((item: any) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Цвета */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Цвета (Pantone)</h3>
              <Button onClick={addColor} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Добавить цвет
              </Button>
            </div>
            <div className="space-y-3">
              {colors.map((color, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={color.pantone_code}
                    onChange={(e) => updateColor(index, 'pantone_code', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Код Pantone (например: 19-4052 TCX)"
                  />
                  <input
                    type="text"
                    value={color.color_name}
                    onChange={(e) => updateColor(index, 'color_name', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Название цвета (опционально)"
                  />
                  {colors.length > 1 && (
                    <button
                      onClick={() => removeColor(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Информация о коллекции */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {displayCollectionName && (
              <p className="text-sm text-gray-600">
                <strong>Коллекция:</strong> {displayCollectionName}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Модель будет создана со статусом "Черновик". Файлы и материалы можно будет добавить после создания.
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isLoading}
            isLoading={isLoading}
            className="flex-1"
          >
            Создать
          </Button>
        </div>
      </div>
    </div>
  );
};
