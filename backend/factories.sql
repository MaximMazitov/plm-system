-- Список фабрик для PLM системы
-- Запустить: psql -U postgres -d plm_system -f factories.sql

-- Очистить существующие фабрики (опционально)
-- TRUNCATE factories CASCADE;

-- Добавить фабрики
INSERT INTO factories (name, contact_email, contact_phone, address) VALUES
('Фабрика "Текстиль Мастер"', 'info@textilemaster.com', '+7 495 123-45-67', 'г. Иваново, ул. Промышленная, 15'),
('ООО "Швейная Линия"', 'sales@sewingline.ru', '+7 812 987-65-43', 'г. Санкт-Петербург, пр. Обуховской Обороны, 45'),
('Китайская фабрика "Golden Textile"', 'contact@goldentextile.cn', '+86 20 1234-5678', 'Guangzhou, China'),
('Фабрика "Урал-Текстиль"', 'info@uraltex.ru', '+7 343 555-12-34', 'г. Екатеринбург, ул. Заводская, 22'),
('Турецкая фабрика "Istanbul Textile Co"', 'export@istanbultextile.com.tr', '+90 212 444-55-66', 'Istanbul, Turkey');

-- Добавьте сюда свои фабрики по образцу выше
