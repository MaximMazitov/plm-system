-- PLM System Database Schema

-- Фабрики/Поставщики (создаем первыми, т.к. на них ссылается users)
CREATE TABLE factories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Справочники (Тип продукта, Тип посадки, Группа товара, Цвет, Размер)
CREATE TABLE reference_data (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- product_type, fit_type, product_group, color, size
    code VARCHAR(100),              -- код для внутреннего использования
    value VARCHAR(255) NOT NULL,    -- значение (уникальное в рамках категории)
    label VARCHAR(255) NOT NULL,    -- отображаемое название
    sort_order INTEGER DEFAULT 0,   -- порядок сортировки
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(category, value)
);

CREATE INDEX idx_reference_data_category ON reference_data(category);
CREATE INDEX idx_reference_data_active ON reference_data(is_active);

-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('designer', 'constructor', 'buyer', 'china_office', 'factory')),
    factory_id INTEGER REFERENCES factories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Сезоны разработки
CREATE TABLE seasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- SS26, AW26
    name VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    season_type VARCHAR(50) CHECK (season_type IN ('spring_summer', 'autumn_winter')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Коллекции
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('kids', 'men', 'women')),
    age_group VARCHAR(100), -- возрастная группа
    name VARCHAR(255) NOT NULL, -- название коллекции
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Модели одежды
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER REFERENCES collections(id),
    model_number VARCHAR(100) NOT NULL, -- номер модели
    model_name VARCHAR(255), -- название модели

    -- Основные параметры
    product_type VARCHAR(50) CHECK (product_type IN ('textile', 'denim', 'sweater', 'knitwear')),
    category VARCHAR(100), -- футболка, худи, брюки
    fit_type VARCHAR(50), -- оверсайз, база, slim

    -- Статус
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',              -- Технический эскиз
        'pending_review',     -- На проверке
        'approved',           -- Утверждено
        'ds_stage',          -- DS
        'pps_stage',         -- PPS
        'in_production',     -- В производстве
        'shipped'            -- Отгружено
    )),

    -- Назначенная фабрика
    assigned_factory_id INTEGER REFERENCES factories(id),

    -- Метаданные
    designer_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    date_created DATE DEFAULT CURRENT_DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(collection_id, model_number)
);

-- Библиотека тканей
CREATE TABLE fabrics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    composition TEXT, -- состав ткани
    supplier VARCHAR(255),
    code VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Граммажи тканей
CREATE TABLE fabric_weights (
    id SERIAL PRIMARY KEY,
    fabric_id INTEGER REFERENCES fabrics(id),
    weight INTEGER NOT NULL, -- граммаж в г/м²
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Библиотека фурнитуры
CREATE TABLE accessories (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- metal_eyelet, cords, tips, zipper, button
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    image_url TEXT,
    supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Библиотека элементов одежды (манжеты, горловины и т.д.)
CREATE TABLE garment_elements (
    id SERIAL PRIMARY KEY,
    element_type VARCHAR(100) NOT NULL, -- cuff, neckline, hem, pocket
    name VARCHAR(255) NOT NULL,
    sketch_url TEXT, -- SVG или изображение элемента
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Библиотека базовых эскизов
CREATE TABLE base_sketches (
    id SERIAL PRIMARY KEY,
    product_type VARCHAR(50),
    category VARCHAR(100),
    fit_type VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    front_view_url TEXT, -- URL векторного файла
    back_view_url TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Библиотека табелей мер
CREATE TABLE measurement_tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50),
    category VARCHAR(100),
    fit_type VARCHAR(50),
    age_group VARCHAR(100),
    file_url TEXT, -- URL Excel файла
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Принты для модели
CREATE TABLE model_prints (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    print_name VARCHAR(255),
    file_url TEXT NOT NULL, -- AI, SVG, PDF, EPS
    file_format VARCHAR(10),
    position VARCHAR(100), -- front, back, sleeve
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Цвета модели (Pantone)
CREATE TABLE model_colors (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    pantone_code VARCHAR(50) NOT NULL,
    color_name VARCHAR(255),
    zone VARCHAR(100), -- основная_ткань, манжета, капюшон и т.д.
    hex_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь модели с тканями
CREATE TABLE model_fabrics (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    fabric_id INTEGER REFERENCES fabrics(id),
    fabric_weight_id INTEGER REFERENCES fabric_weights(id),
    fabric_type VARCHAR(50), -- fabric_1, fabric_2, lining, binding
    color_pantone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь модели с фурнитурой
CREATE TABLE model_accessories (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    accessory_id INTEGER REFERENCES accessories(id),
    quantity INTEGER DEFAULT 1,
    color_option VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь модели с элементами одежды
CREATE TABLE model_garment_elements (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    element_id INTEGER REFERENCES garment_elements(id),
    color_pantone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Комментарии на стадиях
CREATE TABLE stage_comments (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
    user_id INTEGER REFERENCES users(id),
    user_role VARCHAR(50), -- buyer, constructor
    comment_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Файлы к комментариям (фото, документы)
CREATE TABLE comment_attachments (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES stage_comments(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Загрузки China Office на стадиях DS/PPS
CREATE TABLE china_office_uploads (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
    upload_type VARCHAR(50), -- photo, measurement_table, document
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Согласования на стадии PPS
CREATE TABLE pps_approvals (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    approver_role VARCHAR(50) CHECK (approver_role IN ('buyer', 'constructor')),
    approver_id INTEGER REFERENCES users(id),
    is_approved BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Файлы к согласованиям
CREATE TABLE approval_attachments (
    id SERIAL PRIMARY KEY,
    approval_id INTEGER REFERENCES pps_approvals(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Цены от поставщиков
CREATE TABLE factory_prices (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    factory_id INTEGER REFERENCES factories(id),
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    moq INTEGER, -- минимальный заказ
    lead_time_days INTEGER, -- время производства в днях
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(model_id, factory_id)
);

-- История изменений статуса
CREATE TABLE status_history (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    changed_by INTEGER REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Сгенерированные технические документы
CREATE TABLE tech_docs (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    pdf_url TEXT,
    ai_url TEXT, -- Adobe Illustrator файл
    generated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_models_collection ON models(collection_id);
CREATE INDEX idx_models_factory ON models(assigned_factory_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_stage_comments_model ON stage_comments(model_id);
CREATE INDEX idx_factory_prices_model ON factory_prices(model_id);
CREATE INDEX idx_factory_prices_factory ON factory_prices(factory_id);
