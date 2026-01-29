-- Тестовые данные для деталей моделей

-- Изображения для модели 1
INSERT INTO model_images (model_id, image_url, is_primary, uploaded_at) VALUES
(1, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105', true, NOW()),
(1, 'https://images.unsplash.com/photo-1445205170230-053b83016050', false, NOW()),
(1, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c', false, NOW());

-- Изображения для модели 2
INSERT INTO model_images (model_id, image_url, is_primary, uploaded_at) VALUES
(2, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c', true, NOW()),
(2, 'https://images.unsplash.com/photo-1603252109303-2751441dd157', false, NOW());

-- Изображения для модели 3
INSERT INTO model_images (model_id, image_url, is_primary, uploaded_at) VALUES
(3, 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d', true, NOW());

-- Спецификации для модели 1
INSERT INTO model_specifications (model_id, spec_type, spec_value) VALUES
(1, 'Размерный ряд', 'XS, S, M, L, XL'),
(1, 'Тип кроя', 'Приталенный'),
(1, 'Длина рукава', 'Короткий'),
(1, 'Тип воротника', 'Круглый вырез'),
(1, 'Страна производства', 'Турция');

-- Спецификации для модели 2
INSERT INTO model_specifications (model_id, spec_type, spec_value) VALUES
(2, 'Размерный ряд', '2T, 3T, 4T, 5T, 6T'),
(2, 'Тип застежки', 'Молния'),
(2, 'Подкладка', 'Флисовая'),
(2, 'Водостойкость', '3000 мм'),
(2, 'Страна производства', 'Китай');

-- Спецификации для модели 3
INSERT INTO model_specifications (model_id, spec_type, spec_value) VALUES
(3, 'Размерный ряд', '0-3м, 3-6м, 6-12м'),
(3, 'Тип застежки', 'Кнопки'),
(3, 'Гипоаллергенный', 'Да'),
(3, 'Стирка', 'Машинная 30°C'),
(3, 'Страна производства', 'Турция');

-- Материалы к моделям
INSERT INTO model_materials (model_id, material_id, color, quantity) VALUES
(1, 1, 'Белый', '0.5 м'),
(1, 2, 'Черный', '0.3 м'),
(2, 3, 'Синий', '0.8 м'),
(3, 4, 'Розовый', '0.4 м');

-- История изменений для модели 1
INSERT INTO model_history (model_id, changed_by_user_id, change_type, description) VALUES
(1, 1, 'created', 'Модель создана'),
(1, 1, 'status_change', 'Статус изменен на "В разработке"'),
(1, 1, 'material_added', 'Добавлен материал: Хлопок 100%'),
(1, 1, 'image_uploaded', 'Загружено изображение модели');

-- История изменений для модели 2
INSERT INTO model_history (model_id, changed_by_user_id, change_type, description) VALUES
(2, 1, 'created', 'Модель создана'),
(2, 1, 'specification_added', 'Добавлены технические характеристики');

-- История изменений для модели 3
INSERT INTO model_history (model_id, changed_by_user_id, change_type, description) VALUES
(3, 1, 'created', 'Модель создана'),
(3, 1, 'status_change', 'Статус изменен на "Черновик"');
