-- Удаляем старые группы товаров
DELETE FROM reference_data WHERE category = 'product_group';

-- Вставляем правильные группы товаров из списка
INSERT INTO reference_data (category, code, value, label, sort_order) VALUES
('product_group', '001', 'nizhnee_belye_dlya_muzhchin', 'Нижнее белье для мужчин', 1),
('product_group', '002', 'nizhnee_belye_dlya_zhenshchin', 'Нижнее белье для женщин', 2),
('product_group', '003', 'pizhamy_halaty', 'Пижамы, халаты', 3),
('product_group', '004', 'kolgotki_noski_chulki', 'Колготки, носки, чулки', 4),
('product_group', '005', 'futbolki_topy_mayki_polo', 'Футболки, топы, майки, поло', 5),
('product_group', '006', 'rubashki_sorochki_bluzki', 'Рубашки, сорочки, блузки', 6),
('product_group', '007', 'bryki_shorty_bryuchi_kapri', 'Брюки, шорты, брючи, капри', 7),
('product_group', '008', 'dzhemper_sviter_tolstovka_kardig', 'Джемпер, свитер, толстовка, кардиган', 8),
('product_group', '009', 'kostyum_kombinezon', 'Костюм, комбинезон', 9),
('product_group', '010', 'hudi_svitshot', 'Худи, свитшот', 10),
('product_group', '011', 'sportivnye_bryuki_lосины', 'Спортивные брюки, лосины', 11),
('product_group', '012', 'platya_sarafany_yubki', 'Платья, сарафаны, юбки', 12),
('product_group', '013', 'verkhnyaya_odezhda', 'Верхняя одежда', 13),
('product_group', '014', 'tovary_dlya_plazhа', 'Товары для пляжа', 14),
('product_group', '015', 'aksessuary', 'Аксессуары', 15),
('product_group', '016', 'obuv', 'Обувь', 16)
ON CONFLICT (category, value) DO UPDATE SET
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
