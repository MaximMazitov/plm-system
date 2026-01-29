-- Добавляем поля согласования в таблицу models
-- Запустить: psql -U postgres -d plm_system -f add_approval_fields.sql

-- Добавляем статус согласования байером
ALTER TABLE models ADD COLUMN IF NOT EXISTS buyer_approval VARCHAR(50) DEFAULT 'not_approved';

-- Добавляем статус согласования конструктором
ALTER TABLE models ADD COLUMN IF NOT EXISTS constructor_approval VARCHAR(50) DEFAULT 'not_approved';

-- Добавляем комментарий к согласованию байера
ALTER TABLE models ADD COLUMN IF NOT EXISTS buyer_approval_comment TEXT;

-- Добавляем комментарий к согласованию конструктора
ALTER TABLE models ADD COLUMN IF NOT EXISTS constructor_approval_comment TEXT;

-- Добавляем дату согласования байером
ALTER TABLE models ADD COLUMN IF NOT EXISTS buyer_approved_at TIMESTAMP;

-- Добавляем дату согласования конструктором
ALTER TABLE models ADD COLUMN IF NOT EXISTS constructor_approved_at TIMESTAMP;

-- Возможные значения для статусов согласования:
-- 'not_approved' - не согласовано (по умолчанию)
-- 'approved' - согласовано
-- 'approved_with_comments' - согласовано с комментариями
