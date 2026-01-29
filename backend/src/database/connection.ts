import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL (Railway/Heroku style) and individual env vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'plm_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Database connected successfully');
});

// Auto-create missing tables on startup
const ensureTables = async () => {
  try {
    // Create model_files table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_files (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50) CHECK (file_type IN ('sketch', 'tech_pack', 'print', 'pattern', 'size_spec')),
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create model_materials table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_materials (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        material_type VARCHAR(50) CHECK (material_type IN ('main', 'upper', 'lining', 'insulation')),
        name VARCHAR(255),
        color VARCHAR(100),
        brand VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_model_files_model ON model_files(model_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_model_materials_model ON model_materials(model_id)');

    // Create model_history table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_history (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
        changed_by_user_id INTEGER REFERENCES users(id),
        change_type VARCHAR(100),
        description TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add approval columns to models if not exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='buyer_approval') THEN
          ALTER TABLE models ADD COLUMN buyer_approval VARCHAR(50) DEFAULT 'not_approved';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='buyer_approval_comment') THEN
          ALTER TABLE models ADD COLUMN buyer_approval_comment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='buyer_approved_at') THEN
          ALTER TABLE models ADD COLUMN buyer_approved_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='constructor_approval') THEN
          ALTER TABLE models ADD COLUMN constructor_approval VARCHAR(50) DEFAULT 'not_approved';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='constructor_approval_comment') THEN
          ALTER TABLE models ADD COLUMN constructor_approval_comment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='constructor_approved_at') THEN
          ALTER TABLE models ADD COLUMN constructor_approved_at TIMESTAMP;
        END IF;
      END $$;
    `);

    console.log('Database tables verified/created');
  } catch (error) {
    console.error('Error ensuring tables:', error);
  }
};

// Не запускаем ensureTables автоматически - вызываем только при необходимости
// ensureTables();

pool.on('error', (err: Error) => {
  console.error('Unexpected database error:', err);
  // Не завершаем процесс - даём возможность переподключиться
});

export default pool;

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the release method
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};
