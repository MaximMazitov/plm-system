# 🚀 Быстрый запуск PLM системы

## Что уже готово ✅

**Backend:**
- API для авторизации
- API для моделей
- API для комментариев
- База данных (схема)

**Frontend:**
- Страница Login с валидацией
- Dashboard с статистикой
- Навигация и layout
- UI компоненты (Button, Input, Card, Badge)

## Шаг 1: Установка зависимостей

```bash
# Backend
cd backend
npm install

# Frontend (в новом терминале)
cd frontend
npm install
```

## Шаг 2: Настройка базы данных

```bash
# Создать базу данных
createdb plm_system

# Применить схему
cd "/Users/maximmazitov/Desktop/PLM sistem/plm-system"
psql -U postgres -d plm_system -f database/schema.sql
```

## Шаг 3: Настройка .env файлов

### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Откройте `backend/.env` и укажите:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=plm_system
DB_USER=postgres
DB_PASSWORD=ваш_пароль_postgres

JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```bash
cd ../frontend
echo "VITE_API_BASE_URL=http://localhost:3000/api" > .env
```

## Шаг 4: Запуск

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Должно появиться:
```
╔═══════════════════════════════════════╗
║   PLM System Backend Server           ║
║   Running on port 3000               ║
║   Environment: development           ║
╚═══════════════════════════════════════╝
Database connected successfully
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Откройте: http://localhost:5173

## Шаг 5: Создание тестовых пользователей

```bash
# Buyer (полный доступ)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "password123",
    "full_name": "Главный Байер",
    "role": "buyer"
  }'

# Designer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "designer@example.com",
    "password": "password123",
    "full_name": "Дизайнер Иван",
    "role": "designer"
  }'

# Constructor
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "constructor@example.com",
    "password": "password123",
    "full_name": "Конструктор Мария",
    "role": "constructor"
  }'
```

## Шаг 6: Войдите в систему

1. Откройте http://localhost:5173
2. Войдите как buyer:
   - Email: `buyer@example.com`
   - Password: `password123`

Вы увидите Dashboard! 🎉

---

## 🐛 Troubleshooting

### Ошибка подключения к БД
```bash
# Проверьте, запущен ли PostgreSQL
brew services list  # macOS

# Если не запущен:
brew services start postgresql
```

### Ошибка порта занят
```bash
# Найдите процесс на порту 3000
lsof -i :3000

# Завершите его
kill -9 PID
```

### Frontend не запускается
```bash
# Удалите node_modules и установите заново
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Что дальше?

**Следующие задачи:**

1. Добавить API для библиотек (сезоны, коллекции, ткани)
2. Создать страницу списка моделей
3. Создать форму создания модели
4. Добавить загрузку файлов

См. полный план в `NEXT_STEPS.md`

---

## 💡 Нужна помощь?

Если что-то не работает:
1. Проверьте логи в терминалах
2. Проверьте .env файлы
3. Убедитесь, что PostgreSQL запущен
4. Проверьте, что порты 3000 и 5173 свободны

Готово к работе! 🚀
