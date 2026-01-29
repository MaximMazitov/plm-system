-- Обновление типа статуса модели для поддержки новых статусов
-- Сначала удаляем старый ENUM тип и создаем новый

-- Добавляем временную колонку
ALTER TABLE models ADD COLUMN status_temp VARCHAR(50);

-- Копируем данные, преобразуя старые статусы в новые
UPDATE models SET status_temp = CASE
  WHEN status = 'draft' THEN 'draft'
  WHEN status = 'pending_review' THEN 'under_review'
  WHEN status = 'approved' THEN 'approved'
  WHEN status = 'ds_stage' THEN 'ds'
  WHEN status = 'pps_stage' THEN 'pps'
  WHEN status = 'in_production' THEN 'in_production'
  ELSE 'draft'
END;

-- Удаляем старую колонку
ALTER TABLE models DROP COLUMN status;

-- Переименовываем временную колонку
ALTER TABLE models RENAME COLUMN status_temp TO status;

-- Устанавливаем значение по умолчанию
ALTER TABLE models ALTER COLUMN status SET DEFAULT 'draft';

-- Добавляем NOT NULL constraint
ALTER TABLE models ALTER COLUMN status SET NOT NULL;

-- Создаем CHECK constraint для валидации значений
ALTER TABLE models ADD CONSTRAINT models_status_check
  CHECK (status IN ('draft', 'under_review', 'approved', 'ds', 'pps', 'in_production'));

-- Комментарий для документации
COMMENT ON COLUMN models.status IS 'Model status: draft, under_review, approved, ds (Development Sample), pps (Pre-Production Sample), in_production';
