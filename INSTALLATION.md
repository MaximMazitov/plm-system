# Установка и запуск PLM системы

## Требования

- Node.js v18 или выше
- PostgreSQL 14 или выше
- npm или yarn

## Установка

### 1. Настройка базы данных

Создайте базу данных PostgreSQL:

```bash
# Войдите в PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE plm_system;

# Выйдите из PostgreSQL
\q
```

Примените схему базы данных:

```bash
psql -U postgres -d plm_system -f database/schema.sql
```

### 2. Настройка Backend

```bash
cd backend

# Установите зависимости
npm install

# Создайте файл .env на основе .env.example
cp .env.example .env

# Отредактируйте .env и укажите настройки базы данных
nano .env
```

Пример .env файла:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=plm_system
DB_USER=postgres
DB_PASSWORD=ваш_пароль

JWT_SECRET=ваш_секретный_ключ_для_jwt
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:5173
```

Запустите backend в режиме разработки:

```bash
npm run dev
```

Backend будет доступен на http://localhost:3000

### 3. Настройка Frontend

```bash
cd ../frontend

# Установите зависимости
npm install

# Запустите в режиме разработки
npm run dev
```

Frontend будет доступен на http://localhost:5173

## Структура проекта

```
plm-system/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Контроллеры API
│   │   ├── routes/           # Маршруты API
│   │   ├── middleware/       # Middleware (авторизация и т.д.)
│   │   ├── database/         # Подключение к БД
│   │   ├── types/            # TypeScript типы
│   │   └── server.ts         # Основной файл сервера
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React компоненты
│   │   ├── pages/            # Страницы
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API сервисы
│   │   ├── store/            # State management
│   │   └── App.tsx           # Основной компонент
│   └── package.json
│
├── database/
│   └── schema.sql            # Схема базы данных
│
└── README.md                 # Документация
```

## API Endpoints

### Авторизация

- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/profile` - Получение профиля (требуется токен)
- `PUT /api/auth/profile` - Обновление профиля
- `PUT /api/auth/password` - Изменение пароля

### Модели

- `POST /api/models` - Создание модели
- `GET /api/models` - Получение списка моделей
- `GET /api/models/:id` - Получение модели по ID
- `PUT /api/models/:id` - Обновление модели
- `DELETE /api/models/:id` - Удаление модели (только buyer)
- `PUT /api/models/:id/assign-factory` - Назначение фабрики (только buyer)

### Комментарии и согласования

- `POST /api/comments/stage` - Добавить комментарий на стадии DS/PPS
- `GET /api/comments/stage?model_id=X&stage=ds` - Получить комментарии
- `POST /api/comments/attachments` - Добавить файл к комментарию
- `POST /api/comments/china-office-uploads` - Загрузка от China Office
- `GET /api/comments/china-office-uploads?model_id=X` - Получить загрузки
- `POST /api/comments/pps-approvals` - Добавить согласование PPS
- `GET /api/comments/pps-approvals?model_id=X` - Получить согласования

## Создание первого пользователя

Используйте API для создания первого пользователя-байера:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "password123",
    "full_name": "Main Buyer",
    "role": "buyer"
  }'
```

Затем используйте полученный токен для создания других пользователей и данных.

## Роли пользователей

- **buyer** - полный доступ ко всем функциям
- **designer** - создание моделей, комментарии на DS
- **constructor** - создание моделей, управление мерками, комментарии на DS/PPS
- **china_office** - просмотр, загрузка фото/документов
- **factory** - только просмотр своих моделей, заполнение цен

## Статусы моделей

1. **draft** - Технический эскиз (начальное создание)
2. **pending_review** - На проверке
3. **approved** - Утверждено (назначена фабрика)
4. **ds_stage** - Стадия DS
5. **pps_stage** - Стадия PPS
6. **in_production** - В производстве (после двух согласований на PPS)
7. **shipped** - Отгружено

## Разработка

### Backend

Для разработки backend:

```bash
cd backend
npm run dev  # Автоматический перезапуск при изменениях
```

### Frontend

Для разработки frontend:

```bash
cd frontend
npm run dev  # Hot reload
```

### Сборка для production

Backend:
```bash
cd backend
npm run build
npm start
```

Frontend:
```bash
cd frontend
npm run build
# Файлы будут в папке dist/
```

## Troubleshooting

### Проблемы с подключением к базе данных

Убедитесь, что:
- PostgreSQL запущен
- Настройки в .env правильные
- База данных создана
- Схема применена

### Ошибки CORS

Убедитесь, что в .env файле backend указан правильный ALLOWED_ORIGINS:
```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Порты заняты

Если порты 3000 или 5173 заняты, измените их в настройках или освободите порты.

## Следующие шаги

После установки вы можете:
1. Создать пользователей с разными ролями
2. Создать сезоны и коллекции
3. Загрузить библиотеки тканей, фурнитуры и эскизов
4. Начать создавать модели одежды

## Поддержка

Для вопросов и проблем создайте issue в репозитории проекта.
