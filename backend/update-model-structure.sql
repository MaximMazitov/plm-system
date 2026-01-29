-- Обновление структуры моделей для расширенного функционала

-- 1. Создаем таблицу для справочников (динамические списки)
CREATE TABLE IF NOT EXISTS reference_data (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'product_type', 'fit_type', 'category', 'product_group'
  value VARCHAR(200) NOT NULL,
  label VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, value)
);

-- 2. Создаем таблицу для цветов моделей (множественные цвета с пантоном)
CREATE TABLE IF NOT EXISTS model_colors (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  pantone_code VARCHAR(50) NOT NULL, -- например "PANTONE 19-4052 TCX"
  color_name VARCHAR(100), -- опциональное название цвета
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Обновляем таблицу models - добавляем новые поля
ALTER TABLE models
  ADD COLUMN IF NOT EXISTS product_group VARCHAR(100), -- группа товара (только для байера)
  ADD COLUMN IF NOT EXISTS prototype_number VARCHAR(100), -- номер прототипа
  ADD COLUMN IF NOT EXISTS has_pattern BOOLEAN DEFAULT false; -- есть ли паттерн

-- 4. Создаем/обновляем таблицу model_files
CREATE TABLE IF NOT EXISTS model_files (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('sketch', 'tech_pack', 'print', 'size_spec', 'pattern')),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Обновляем product_type - теперь это справочник
ALTER TABLE models
  DROP CONSTRAINT IF EXISTS models_product_type_check;

-- Теперь product_type может быть любым значением из справочника

-- 6. Вставляем начальные данные в справочники

-- Типы продуктов
INSERT INTO reference_data (category, value, label, sort_order) VALUES
  ('product_type', 'woven', 'Woven', 1),
  ('product_type', 'denim', 'Denim', 2),
  ('product_type', 'knit', 'Knit', 3),
  ('product_type', 'sweater', 'Sweater', 4)
ON CONFLICT (category, value) DO NOTHING;

-- Типы посадки
INSERT INTO reference_data (category, value, label, sort_order) VALUES
  ('fit_type', 'regular', 'Regular', 1),
  ('fit_type', 'oversize', 'Oversize', 2),
  ('fit_type', 'oversize_maxi', 'Oversize Maxi', 3),
  ('fit_type', 'slim', 'Slim', 4),
  ('fit_type', 'custom', '— (Нестандартная)', 5)
ON CONFLICT (category, value) DO NOTHING;

-- Примеры категорий (можно добавить больше)
INSERT INTO reference_data (category, value, label, sort_order) VALUES
  ('category', 'футболка', 'Футболка', 1),
  ('category', 'худи', 'Худи', 2),
  ('category', 'брюки', 'Брюки', 3),
  ('category', 'куртка', 'Куртка', 4),
  ('category', 'джинсы', 'Джинсы', 5),
  ('category', 'свитер', 'Свитер', 6)
ON CONFLICT (category, value) DO NOTHING;

-- Примеры групп товаров
INSERT INTO reference_data (category, value, label, sort_order) VALUES
  ('product_group', 'outerwear', 'Верхняя одежда', 1),
  ('product_group', 'tops', 'Верх', 2),
  ('product_group', 'bottoms', 'Низ', 3),
  ('product_group', 'accessories', 'Аксессуары', 4)
ON CONFLICT (category, value) DO NOTHING;

-- 7. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_model_colors_model_id ON model_colors(model_id);
CREATE INDEX IF NOT EXISTS idx_reference_data_category ON reference_data(category, is_active);
