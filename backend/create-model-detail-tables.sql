-- Создание таблиц для деталей модели

-- Таблица изображений модели
CREATE TABLE IF NOT EXISTS model_images (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица материалов модели
CREATE TABLE IF NOT EXISTS model_materials (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  color VARCHAR(100),
  quantity VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица спецификаций модели
CREATE TABLE IF NOT EXISTS model_specifications (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  spec_type VARCHAR(100) NOT NULL,
  spec_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории изменений модели
CREATE TABLE IF NOT EXISTS model_history (
  id SERIAL PRIMARY KEY,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  changed_by_user_id INTEGER NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change_type VARCHAR(50) NOT NULL,
  description TEXT
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_model_images_model_id ON model_images(model_id);
CREATE INDEX IF NOT EXISTS idx_model_materials_model_id ON model_materials(model_id);
CREATE INDEX IF NOT EXISTS idx_model_specifications_model_id ON model_specifications(model_id);
CREATE INDEX IF NOT EXISTS idx_model_history_model_id ON model_history(model_id);
CREATE INDEX IF NOT EXISTS idx_model_history_changed_at ON model_history(changed_at DESC);
