import { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';

export async function seedDemoUsers(client: PoolClient) {
  console.log('Checking demo users...');

  // Hash password "password123"
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const demoUsers = [
    { email: 'buyer@example.com', full_name: 'Admin Buyer', role: 'buyer' },
    { email: 'designer@example.com', full_name: 'Demo Designer', role: 'designer' },
    { email: 'constructor@example.com', full_name: 'Demo Constructor', role: 'constructor' },
  ];

  let createdCount = 0;
  for (const user of demoUsers) {
    // Check if user exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        [user.email, passwordHash, user.full_name, user.role]
      );
      console.log(`Created demo user: ${user.email}`);
      createdCount++;
    } else {
      console.log(`Demo user already exists: ${user.email}`);
    }
  }

  if (createdCount > 0) {
    console.log(`Created ${createdCount} new demo users`);
  } else {
    console.log('All demo users already exist');
  }
}

export async function seedReferenceData(client: PoolClient) {
  // Check if already seeded
  const count = await client.query('SELECT COUNT(*) FROM reference_data');
  if (parseInt(count.rows[0].count) > 0) {
    console.log('Reference data already seeded');
    return;
  }

  console.log('Seeding reference data...');

  const referenceData = [
    // Product types
    { category: 'product_type', code: null, value: 'woven', label: 'Woven', sort_order: 1 },
    { category: 'product_type', code: null, value: 'denim', label: 'Denim', sort_order: 2 },
    { category: 'product_type', code: null, value: 'knit', label: 'Knit', sort_order: 3 },
    { category: 'product_type', code: null, value: 'sweater', label: 'Sweater', sort_order: 4 },

    // Fit types
    { category: 'fit_type', code: null, value: 'regular', label: 'Regular', sort_order: 1 },
    { category: 'fit_type', code: null, value: 'oversize', label: 'Oversize', sort_order: 2 },
    { category: 'fit_type', code: null, value: 'oversize_maxi', label: 'Oversize Maxi', sort_order: 3 },
    { category: 'fit_type', code: null, value: 'slim', label: 'Slim', sort_order: 4 },
    { category: 'fit_type', code: null, value: 'custom', label: '— (Нестандартная)', sort_order: 5 },

    // Categories
    { category: 'category', code: null, value: 'футболка', label: 'Футболка', sort_order: 1 },
    { category: 'category', code: null, value: 'худи', label: 'Худи', sort_order: 2 },
    { category: 'category', code: null, value: 'брюки', label: 'Брюки', sort_order: 3 },
    { category: 'category', code: null, value: 'куртка', label: 'Куртка', sort_order: 4 },
    { category: 'category', code: null, value: 'джинсы', label: 'Джинсы', sort_order: 5 },
    { category: 'category', code: null, value: 'свитер', label: 'Свитер', sort_order: 6 },

    // Colors
    { category: 'color', code: 'BLK', value: 'black', label: 'Черный', sort_order: 1 },
    { category: 'color', code: 'WHT', value: 'white', label: 'Белый', sort_order: 2 },
    { category: 'color', code: 'GRY', value: 'gray', label: 'Серый', sort_order: 3 },
    { category: 'color', code: 'NVY', value: 'navy', label: 'Темно-синий', sort_order: 4 },
    { category: 'color', code: 'BLU', value: 'blue', label: 'Синий', sort_order: 5 },
    { category: 'color', code: 'RED', value: 'red', label: 'Красный', sort_order: 6 },
    { category: 'color', code: 'GRN', value: 'green', label: 'Зеленый', sort_order: 7 },
    { category: 'color', code: 'YLW', value: 'yellow', label: 'Желтый', sort_order: 8 },
    { category: 'color', code: 'ORG', value: 'orange', label: 'Оранжевый', sort_order: 9 },
    { category: 'color', code: 'PNK', value: 'pink', label: 'Розовый', sort_order: 10 },
    { category: 'color', code: 'PPL', value: 'purple', label: 'Фиолетовый', sort_order: 11 },
    { category: 'color', code: 'BRN', value: 'brown', label: 'Коричневый', sort_order: 12 },
    { category: 'color', code: 'BGE', value: 'beige', label: 'Бежевый', sort_order: 13 },
    { category: 'color', code: 'KHK', value: 'khaki', label: 'Хаки', sort_order: 14 },
    { category: 'color', code: 'BRG', value: 'burgundy', label: 'Бордовый', sort_order: 15 },
    { category: 'color', code: 'TRQ', value: 'turquoise', label: 'Бирюзовый', sort_order: 16 },
    { category: 'color', code: 'MLT', value: 'multicolor', label: 'Мультиколор', sort_order: 17 },

    // Sizes
    { category: 'size', code: null, value: '50', label: '50', sort_order: 1 },
    { category: 'size', code: null, value: '56', label: '56', sort_order: 2 },
    { category: 'size', code: null, value: '62', label: '62', sort_order: 3 },
    { category: 'size', code: null, value: '68', label: '68', sort_order: 4 },
    { category: 'size', code: null, value: '74', label: '74', sort_order: 5 },
    { category: 'size', code: null, value: '80', label: '80', sort_order: 6 },
    { category: 'size', code: null, value: '86', label: '86', sort_order: 7 },
    { category: 'size', code: null, value: '92', label: '92', sort_order: 8 },
    { category: 'size', code: null, value: '98', label: '98', sort_order: 9 },
    { category: 'size', code: null, value: '104', label: '104', sort_order: 10 },
    { category: 'size', code: null, value: '110', label: '110', sort_order: 11 },
    { category: 'size', code: null, value: '116', label: '116', sort_order: 12 },
    { category: 'size', code: null, value: '122', label: '122', sort_order: 13 },
    { category: 'size', code: null, value: '128', label: '128', sort_order: 14 },
    { category: 'size', code: null, value: '134', label: '134', sort_order: 15 },
    { category: 'size', code: null, value: '140', label: '140', sort_order: 16 },
    { category: 'size', code: null, value: '146', label: '146', sort_order: 17 },
    { category: 'size', code: null, value: '152', label: '152', sort_order: 18 },
    { category: 'size', code: null, value: '158', label: '158', sort_order: 19 },
    { category: 'size', code: null, value: '164', label: '164', sort_order: 20 },
    { category: 'size', code: null, value: '170', label: '170', sort_order: 21 },

    // Product groups (sample)
    { category: 'product_group', code: '201', value: 'beysbolka_detskaya_devochki', label: 'Бейсболка детская для девочек', sort_order: 1 },
    { category: 'product_group', code: '202', value: 'beysbolka_detskaya_malchiki', label: 'Бейсболка детская для мальчиков', sort_order: 2 },
    { category: 'product_group', code: '307', value: 'bluzka_detskaya_devochki', label: 'Блузка детская для девочек', sort_order: 3 },
    { category: 'product_group', code: '527', value: 'bryuki_detskie_devochki', label: 'Брюки детские для девочек', sort_order: 4 },
    { category: 'product_group', code: '553', value: 'bryuki_detskie_malchiki', label: 'Брюки детские для мальчиков', sort_order: 5 },
    { category: 'product_group', code: '181', value: 'dzhinsy_detskie_devochki', label: 'Джинсы детские для девочек', sort_order: 6 },
    { category: 'product_group', code: '182', value: 'dzhinsy_detskie_malchiki', label: 'Джинсы детские для мальчиков', sort_order: 7 },
    { category: 'product_group', code: '190', value: 'dzhemper_detskiy_devochki', label: 'Джемпер детский для девочек', sort_order: 8 },
    { category: 'product_group', code: '189', value: 'dzhemper_detskiy_malchiki', label: 'Джемпер детский для мальчиков', sort_order: 9 },
    { category: 'product_group', code: '954', value: 'vetrovka_detskaya_devochki', label: 'Ветровка детская для девочек', sort_order: 10 },
    { category: 'product_group', code: '952', value: 'vetrovka_detskaya_malchiki', label: 'Ветровка детская для мальчиков', sort_order: 11 },
    { category: 'product_group', code: '535', value: 'vodolazka_detskaya_devochki', label: 'Водолазка детская для девочек', sort_order: 12 },
    { category: 'product_group', code: '558', value: 'vodolazka_detskaya_malchiki', label: 'Водолазка детская для мальчиков', sort_order: 13 },
    { category: 'product_group', code: '886', value: 'zhilet_uteplennyy_devochki', label: 'Жилет утепленный детский для девочек', sort_order: 14 },
    { category: 'product_group', code: '877', value: 'zhilet_uteplennyy_malchiki', label: 'Жилет утепленный детский для мальчиков', sort_order: 15 },
    { category: 'product_group', code: '234', value: 'kolgotki_detskie_devochki', label: 'Колготки детские для девочек', sort_order: 16 },
    { category: 'product_group', code: '235', value: 'kolgotki_detskie_malchiki', label: 'Колготки детские для мальчиков', sort_order: 17 },
    { category: 'product_group', code: '888', value: 'kardigan_detskiy_devochki', label: 'Кардиган детский для девочек', sort_order: 18 },
    { category: 'product_group', code: '953', value: 'kardigan_detskiy_malchiki', label: 'Кардиган детский для мальчиков', sort_order: 19 },
  ];

  for (const item of referenceData) {
    await client.query(
      `INSERT INTO reference_data (category, code, value, label, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (category, value) DO NOTHING`,
      [item.category, item.code, item.value, item.label, item.sort_order]
    );
  }

  console.log(`Seeded ${referenceData.length} reference data items`);
}
