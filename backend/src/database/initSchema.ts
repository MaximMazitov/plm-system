import pool from './connection';
import { seedReferenceData, seedDemoUsers } from './seedData';
import { seedProductGroups } from './seedProductGroups';

export async function initializeSchema() {
  const client = await pool.connect();

  try {
    console.log('Checking and creating database schema...');

    // Check if tables exist
    const tablesExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (tablesExist.rows[0].exists) {
      console.log('Database schema already exists, checking for migrations...');

      // Run migrations for existing schema
      await client.query(`
        -- ============================================
        -- СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ (в правильном порядке)
        -- ============================================

        -- 1. Фабрики/Поставщики (базовая таблица, нет зависимостей)
        CREATE TABLE IF NOT EXISTS factories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          contact_email VARCHAR(255),
          contact_phone VARCHAR(50),
          address TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Справочники (базовая таблица, нет зависимостей)
        CREATE TABLE IF NOT EXISTS reference_data (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          code VARCHAR(100),
          value VARCHAR(255) NOT NULL,
          label VARCHAR(255) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category, value)
        );

        -- 3. Сезоны (базовая таблица, нет зависимостей)
        CREATE TABLE IF NOT EXISTS seasons (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          year INTEGER NOT NULL,
          season_type VARCHAR(50) CHECK (season_type IN ('spring_summer', 'autumn_winter')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Коллекции (зависит от seasons)
        CREATE TABLE IF NOT EXISTS collections (
          id SERIAL PRIMARY KEY,
          season_id INTEGER REFERENCES seasons(id),
          type VARCHAR(50) NOT NULL CHECK (type IN ('kids', 'men', 'women')),
          gender VARCHAR(50),
          age_group VARCHAR(100),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Модели (зависит от collections, factories, users)
        CREATE TABLE IF NOT EXISTS models (
          id SERIAL PRIMARY KEY,
          collection_id INTEGER REFERENCES collections(id),
          model_number VARCHAR(100) NOT NULL,
          model_name VARCHAR(255),
          product_type VARCHAR(50),
          category VARCHAR(100),
          fit_type VARCHAR(50),
          status VARCHAR(50) DEFAULT 'draft',
          assigned_factory_id INTEGER REFERENCES factories(id),
          designer_id INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          date_created DATE DEFAULT CURRENT_DATE,
          product_group VARCHAR(100),
          product_group_code VARCHAR(50),
          prototype_number VARCHAR(100),
          brand VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Библиотека тканей (базовая таблица)
        CREATE TABLE IF NOT EXISTS fabrics (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          composition TEXT,
          supplier VARCHAR(255),
          code VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. Граммажи тканей (зависит от fabrics)
        CREATE TABLE IF NOT EXISTS fabric_weights (
          id SERIAL PRIMARY KEY,
          fabric_id INTEGER REFERENCES fabrics(id),
          weight INTEGER NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. Библиотека фурнитуры (базовая таблица)
        CREATE TABLE IF NOT EXISTS accessories (
          id SERIAL PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(100),
          image_url TEXT,
          supplier VARCHAR(255),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 9. Библиотека элементов одежды (базовая таблица)
        CREATE TABLE IF NOT EXISTS garment_elements (
          id SERIAL PRIMARY KEY,
          element_type VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          sketch_url TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 10. Библиотека базовых эскизов (зависит от users)
        CREATE TABLE IF NOT EXISTS base_sketches (
          id SERIAL PRIMARY KEY,
          product_type VARCHAR(50),
          category VARCHAR(100),
          fit_type VARCHAR(50),
          name VARCHAR(255) NOT NULL,
          front_view_url TEXT,
          back_view_url TEXT,
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 11. Библиотека табелей мер (зависит от users)
        CREATE TABLE IF NOT EXISTS measurement_tables (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          product_type VARCHAR(50),
          category VARCHAR(100),
          fit_type VARCHAR(50),
          age_group VARCHAR(100),
          file_url TEXT,
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 12. Принты для модели (зависит от models, users)
        CREATE TABLE IF NOT EXISTS model_prints (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          print_name VARCHAR(255),
          file_url TEXT NOT NULL,
          file_format VARCHAR(10),
          position VARCHAR(100),
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 13. Цвета модели (зависит от models)
        CREATE TABLE IF NOT EXISTS model_colors (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          pantone_code VARCHAR(50) NOT NULL,
          color_name VARCHAR(255),
          zone VARCHAR(100),
          hex_color VARCHAR(7),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 14. Связь модели с тканями (зависит от models, fabrics, fabric_weights)
        CREATE TABLE IF NOT EXISTS model_fabrics (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          fabric_id INTEGER REFERENCES fabrics(id),
          fabric_weight_id INTEGER REFERENCES fabric_weights(id),
          fabric_type VARCHAR(50),
          color_pantone VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 15. Связь модели с фурнитурой (зависит от models, accessories)
        CREATE TABLE IF NOT EXISTS model_accessories (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          accessory_id INTEGER REFERENCES accessories(id),
          quantity INTEGER DEFAULT 1,
          color_option VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 16. Связь модели с элементами одежды (зависит от models, garment_elements)
        CREATE TABLE IF NOT EXISTS model_garment_elements (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          element_id INTEGER REFERENCES garment_elements(id),
          color_pantone VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 17. Комментарии на стадиях (зависит от models, users)
        CREATE TABLE IF NOT EXISTS stage_comments (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
          user_id INTEGER REFERENCES users(id),
          user_role VARCHAR(50),
          comment_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 18. Файлы к комментариям на стадиях (зависит от stage_comments, users)
        CREATE TABLE IF NOT EXISTS comment_attachments (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER REFERENCES stage_comments(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_name VARCHAR(255),
          file_type VARCHAR(50),
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 19. Загрузки China Office (зависит от models, users)
        CREATE TABLE IF NOT EXISTS china_office_uploads (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
          upload_type VARCHAR(50),
          file_url TEXT NOT NULL,
          file_name VARCHAR(255),
          description TEXT,
          uploaded_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 20. Согласования PPS (зависит от models, users)
        CREATE TABLE IF NOT EXISTS pps_approvals (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          approver_role VARCHAR(50) CHECK (approver_role IN ('buyer', 'constructor')),
          approver_id INTEGER REFERENCES users(id),
          is_approved BOOLEAN NOT NULL,
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 21. Файлы к согласованиям (зависит от pps_approvals)
        CREATE TABLE IF NOT EXISTS approval_attachments (
          id SERIAL PRIMARY KEY,
          approval_id INTEGER REFERENCES pps_approvals(id) ON DELETE CASCADE,
          file_url TEXT NOT NULL,
          file_name VARCHAR(255),
          file_type VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 22. Цены от поставщиков (зависит от models, factories)
        CREATE TABLE IF NOT EXISTS factory_prices (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          factory_id INTEGER REFERENCES factories(id),
          price DECIMAL(10, 2),
          currency VARCHAR(10) DEFAULT 'USD',
          moq INTEGER,
          lead_time_days INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(model_id, factory_id)
        );

        -- 23. История статусов (зависит от models, users)
        CREATE TABLE IF NOT EXISTS status_history (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          from_status VARCHAR(50),
          to_status VARCHAR(50),
          changed_by INTEGER REFERENCES users(id),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 24. Технические документы (зависит от models, users)
        CREATE TABLE IF NOT EXISTS tech_docs (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          pdf_url TEXT,
          ai_url TEXT,
          generated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 25. Файлы модели (зависит от models)
        CREATE TABLE IF NOT EXISTS model_files (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          file_name VARCHAR(500) NOT NULL,
          file_url TEXT NOT NULL,
          file_type VARCHAR(50),
          r2_key TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 26. Комментарии (зависит от models, users)
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
          comment_text TEXT NOT NULL,
          image_url TEXT,
          r2_key TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 27. Права пользователей (зависит от users)
        CREATE TABLE IF NOT EXISTS user_permissions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          can_view_dashboard BOOLEAN DEFAULT true,
          can_view_models BOOLEAN DEFAULT true,
          can_create_models BOOLEAN DEFAULT false,
          can_edit_models BOOLEAN DEFAULT false,
          can_delete_models BOOLEAN DEFAULT false,
          can_edit_model_status BOOLEAN DEFAULT false,
          can_view_files BOOLEAN DEFAULT true,
          can_upload_files BOOLEAN DEFAULT false,
          can_delete_files BOOLEAN DEFAULT false,
          can_view_materials BOOLEAN DEFAULT true,
          can_edit_materials BOOLEAN DEFAULT false,
          can_delete_materials BOOLEAN DEFAULT false,
          can_view_comments BOOLEAN DEFAULT true,
          can_create_comments BOOLEAN DEFAULT false,
          can_edit_own_comments BOOLEAN DEFAULT false,
          can_delete_own_comments BOOLEAN DEFAULT false,
          can_delete_any_comments BOOLEAN DEFAULT false,
          can_view_collections BOOLEAN DEFAULT true,
          can_edit_collections BOOLEAN DEFAULT false,
          can_view_seasons BOOLEAN DEFAULT true,
          can_edit_seasons BOOLEAN DEFAULT false,
          can_view_users BOOLEAN DEFAULT false,
          can_create_users BOOLEAN DEFAULT false,
          can_edit_users BOOLEAN DEFAULT false,
          can_delete_users BOOLEAN DEFAULT false,
          can_approve_as_buyer BOOLEAN DEFAULT false,
          can_approve_as_constructor BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        );

        -- ============================================
        -- СОЗДАНИЕ ИНДЕКСОВ
        -- ============================================
        CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
        CREATE INDEX IF NOT EXISTS idx_models_collection ON models(collection_id);
        CREATE INDEX IF NOT EXISTS idx_models_factory ON models(assigned_factory_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_reference_data_category ON reference_data(category);
        CREATE INDEX IF NOT EXISTS idx_model_files_model ON model_files(model_id);
        CREATE INDEX IF NOT EXISTS idx_model_files_type ON model_files(file_type);
        CREATE INDEX IF NOT EXISTS idx_comments_model ON comments(model_id);
        CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
        CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

        -- ============================================
        -- СОЗДАНИЕ ПРАВ ДЛЯ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
        -- ============================================
        INSERT INTO user_permissions (
          user_id,
          can_view_dashboard,
          can_view_models,
          can_create_models,
          can_edit_models,
          can_delete_models,
          can_edit_model_status,
          can_view_files,
          can_upload_files,
          can_delete_files,
          can_view_materials,
          can_edit_materials,
          can_delete_materials,
          can_view_comments,
          can_create_comments,
          can_edit_own_comments,
          can_delete_own_comments,
          can_delete_any_comments,
          can_view_collections,
          can_edit_collections,
          can_view_seasons,
          can_edit_seasons,
          can_view_users,
          can_create_users,
          can_edit_users,
          can_delete_users,
          can_approve_as_buyer,
          can_approve_as_constructor
        )
        SELECT
          id,
          true, -- can_view_dashboard
          true, -- can_view_models
          CASE WHEN role IN ('designer', 'buyer') THEN true ELSE false END,
          CASE WHEN role IN ('designer', 'constructor', 'buyer') THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          true, -- can_view_files
          CASE WHEN role IN ('designer', 'constructor', 'china_office', 'buyer') THEN true ELSE false END,
          CASE WHEN role IN ('buyer', 'designer') THEN true ELSE false END,
          true, -- can_view_materials
          CASE WHEN role IN ('designer', 'constructor', 'buyer') THEN true ELSE false END,
          CASE WHEN role IN ('buyer', 'designer') THEN true ELSE false END,
          true, -- can_view_comments
          true, -- can_create_comments
          true, -- can_edit_own_comments
          true, -- can_delete_own_comments
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          true, -- can_view_collections
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          true, -- can_view_seasons
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'buyer' THEN true ELSE false END,
          CASE WHEN role = 'constructor' THEN true ELSE false END
        FROM users
        ON CONFLICT (user_id) DO NOTHING;

        -- ============================================
        -- ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ КОЛОНОК (миграции)
        -- ============================================

        -- Добавляем колонку gender в collections если её нет
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='gender') THEN
            ALTER TABLE collections ADD COLUMN gender VARCHAR(50);
          END IF;
        END $$;

        -- Добавляем колонки в models если их нет
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='product_group') THEN
            ALTER TABLE models ADD COLUMN product_group VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='product_group_code') THEN
            ALTER TABLE models ADD COLUMN product_group_code VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='prototype_number') THEN
            ALTER TABLE models ADD COLUMN prototype_number VARCHAR(100);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='brand') THEN
            ALTER TABLE models ADD COLUMN brand VARCHAR(255);
          END IF;
        END $$;

        -- Добавляем колонку sort_order в model_colors если её нет
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='model_colors' AND column_name='sort_order') THEN
            ALTER TABLE model_colors ADD COLUMN sort_order INTEGER DEFAULT 0;
          END IF;
        END $$;

        -- Убираем ограничение product_type чтобы разрешить любые значения
        ALTER TABLE models DROP CONSTRAINT IF EXISTS models_product_type_check;

        -- Добавляем колонку r2_key в comments если её нет
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='r2_key') THEN
            ALTER TABLE comments ADD COLUMN r2_key TEXT;
          END IF;
        END $$;

        -- Добавляем колонку r2_key в model_files если её нет
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='model_files' AND column_name='r2_key') THEN
            ALTER TABLE model_files ADD COLUMN r2_key TEXT;
          END IF;
        END $$;
      `);
      // Seed reference data if empty
      await seedReferenceData(client);
      // Seed demo users if empty
      await seedDemoUsers(client);
      // Seed product groups from Excel file
      await seedProductGroups(client);
      console.log('Migrations completed');
      return;
    }

    console.log('Creating database schema...');

    // Create all tables
    await client.query(`
      -- Фабрики/Поставщики
      CREATE TABLE IF NOT EXISTS factories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Справочники
      CREATE TABLE IF NOT EXISTS reference_data (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        code VARCHAR(100),
        value VARCHAR(255) NOT NULL,
        label VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, value)
      );

      -- Пользователи
      CREATE TABLE IF NOT EXISTS users (
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

      -- Сезоны
      CREATE TABLE IF NOT EXISTS seasons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        season_type VARCHAR(50) CHECK (season_type IN ('spring_summer', 'autumn_winter')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Коллекции
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        season_id INTEGER REFERENCES seasons(id),
        type VARCHAR(50) NOT NULL CHECK (type IN ('kids', 'men', 'women')),
        gender VARCHAR(50),
        age_group VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Модели
      CREATE TABLE IF NOT EXISTS models (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER REFERENCES collections(id),
        model_number VARCHAR(100) NOT NULL,
        model_name VARCHAR(255),
        product_type VARCHAR(50) CHECK (product_type IN ('textile', 'denim', 'sweater', 'knitwear')),
        category VARCHAR(100),
        fit_type VARCHAR(50),
        status VARCHAR(50) DEFAULT 'draft',
        assigned_factory_id INTEGER REFERENCES factories(id),
        designer_id INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        date_created DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Библиотека тканей
      CREATE TABLE IF NOT EXISTS fabrics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        composition TEXT,
        supplier VARCHAR(255),
        code VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Граммажи тканей
      CREATE TABLE IF NOT EXISTS fabric_weights (
        id SERIAL PRIMARY KEY,
        fabric_id INTEGER REFERENCES fabrics(id),
        weight INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Библиотека фурнитуры
      CREATE TABLE IF NOT EXISTS accessories (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        image_url TEXT,
        supplier VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Библиотека элементов одежды
      CREATE TABLE IF NOT EXISTS garment_elements (
        id SERIAL PRIMARY KEY,
        element_type VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sketch_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Библиотека базовых эскизов
      CREATE TABLE IF NOT EXISTS base_sketches (
        id SERIAL PRIMARY KEY,
        product_type VARCHAR(50),
        category VARCHAR(100),
        fit_type VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        front_view_url TEXT,
        back_view_url TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Библиотека табелей мер
      CREATE TABLE IF NOT EXISTS measurement_tables (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        product_type VARCHAR(50),
        category VARCHAR(100),
        fit_type VARCHAR(50),
        age_group VARCHAR(100),
        file_url TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Принты для модели
      CREATE TABLE IF NOT EXISTS model_prints (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        print_name VARCHAR(255),
        file_url TEXT NOT NULL,
        file_format VARCHAR(10),
        position VARCHAR(100),
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Цвета модели
      CREATE TABLE IF NOT EXISTS model_colors (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        pantone_code VARCHAR(50) NOT NULL,
        color_name VARCHAR(255),
        zone VARCHAR(100),
        hex_color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Связь модели с тканями
      CREATE TABLE IF NOT EXISTS model_fabrics (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        fabric_id INTEGER REFERENCES fabrics(id),
        fabric_weight_id INTEGER REFERENCES fabric_weights(id),
        fabric_type VARCHAR(50),
        color_pantone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Связь модели с фурнитурой
      CREATE TABLE IF NOT EXISTS model_accessories (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        accessory_id INTEGER REFERENCES accessories(id),
        quantity INTEGER DEFAULT 1,
        color_option VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Связь модели с элементами одежды
      CREATE TABLE IF NOT EXISTS model_garment_elements (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        element_id INTEGER REFERENCES garment_elements(id),
        color_pantone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Комментарии на стадиях
      CREATE TABLE IF NOT EXISTS stage_comments (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
        user_id INTEGER REFERENCES users(id),
        user_role VARCHAR(50),
        comment_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Файлы к комментариям
      CREATE TABLE IF NOT EXISTS comment_attachments (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER REFERENCES stage_comments(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(50),
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Загрузки China Office
      CREATE TABLE IF NOT EXISTS china_office_uploads (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        stage VARCHAR(50) CHECK (stage IN ('ds', 'pps')),
        upload_type VARCHAR(50),
        file_url TEXT NOT NULL,
        file_name VARCHAR(255),
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Согласования PPS
      CREATE TABLE IF NOT EXISTS pps_approvals (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        approver_role VARCHAR(50) CHECK (approver_role IN ('buyer', 'constructor')),
        approver_id INTEGER REFERENCES users(id),
        is_approved BOOLEAN NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Файлы к согласованиям
      CREATE TABLE IF NOT EXISTS approval_attachments (
        id SERIAL PRIMARY KEY,
        approval_id INTEGER REFERENCES pps_approvals(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255),
        file_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Цены от поставщиков
      CREATE TABLE IF NOT EXISTS factory_prices (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        factory_id INTEGER REFERENCES factories(id),
        price DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'USD',
        moq INTEGER,
        lead_time_days INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(model_id, factory_id)
      );

      -- История статусов
      CREATE TABLE IF NOT EXISTS status_history (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        changed_by INTEGER REFERENCES users(id),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Технические документы
      CREATE TABLE IF NOT EXISTS tech_docs (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        pdf_url TEXT,
        ai_url TEXT,
        generated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Файлы модели
      CREATE TABLE IF NOT EXISTS model_files (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        file_name VARCHAR(500) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50),
        r2_key TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Комментарии
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        image_url TEXT,
        r2_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Права пользователей
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        can_view_dashboard BOOLEAN DEFAULT true,
        can_view_models BOOLEAN DEFAULT true,
        can_create_models BOOLEAN DEFAULT false,
        can_edit_models BOOLEAN DEFAULT false,
        can_delete_models BOOLEAN DEFAULT false,
        can_edit_model_status BOOLEAN DEFAULT false,
        can_view_files BOOLEAN DEFAULT true,
        can_upload_files BOOLEAN DEFAULT false,
        can_delete_files BOOLEAN DEFAULT false,
        can_view_materials BOOLEAN DEFAULT true,
        can_edit_materials BOOLEAN DEFAULT false,
        can_delete_materials BOOLEAN DEFAULT false,
        can_view_comments BOOLEAN DEFAULT true,
        can_create_comments BOOLEAN DEFAULT false,
        can_edit_own_comments BOOLEAN DEFAULT false,
        can_delete_own_comments BOOLEAN DEFAULT false,
        can_delete_any_comments BOOLEAN DEFAULT false,
        can_view_collections BOOLEAN DEFAULT true,
        can_edit_collections BOOLEAN DEFAULT false,
        can_view_seasons BOOLEAN DEFAULT true,
        can_edit_seasons BOOLEAN DEFAULT false,
        can_view_users BOOLEAN DEFAULT false,
        can_create_users BOOLEAN DEFAULT false,
        can_edit_users BOOLEAN DEFAULT false,
        can_delete_users BOOLEAN DEFAULT false,
        can_approve_as_buyer BOOLEAN DEFAULT false,
        can_approve_as_constructor BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );

      -- Индексы
      CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
      CREATE INDEX IF NOT EXISTS idx_models_collection ON models(collection_id);
      CREATE INDEX IF NOT EXISTS idx_models_factory ON models(assigned_factory_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reference_data_category ON reference_data(category);
      CREATE INDEX IF NOT EXISTS idx_model_files_model ON model_files(model_id);
      CREATE INDEX IF NOT EXISTS idx_model_files_type ON model_files(file_type);
      CREATE INDEX IF NOT EXISTS idx_comments_model ON comments(model_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

      -- Добавляем колонку gender если её нет
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='gender') THEN
          ALTER TABLE collections ADD COLUMN gender VARCHAR(50);
        END IF;
      END $$;
    `);

    console.log('Database schema created successfully!');

    // Seed reference data
    await seedReferenceData(client);

    // Seed demo users
    await seedDemoUsers(client);

    // Seed product groups from Excel file
    await seedProductGroups(client);

  } catch (error) {
    console.error('Error creating schema:', error);
    throw error;
  } finally {
    client.release();
  }
}
