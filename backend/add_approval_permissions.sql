-- Добавляем поля для разрешений согласования
-- Запустить: psql -U postgres -d plm_system -f add_approval_permissions.sql

-- Добавляем разрешение для согласования байером
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_approve_as_buyer BOOLEAN DEFAULT FALSE;

-- Добавляем разрешение для согласования конструктором
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS can_approve_as_constructor BOOLEAN DEFAULT FALSE;

-- Даем разрешения всем байерам
UPDATE user_permissions
SET can_approve_as_buyer = TRUE
WHERE user_id IN (SELECT id FROM users WHERE role = 'buyer');

-- Даем разрешения всем конструкторам
UPDATE user_permissions
SET can_approve_as_constructor = TRUE
WHERE user_id IN (SELECT id FROM users WHERE role = 'constructor');
