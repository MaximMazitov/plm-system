# Архитектура PLM системы

## Обзор системы

PLM (Product Lifecycle Management) система для разработки одежды представляет собой full-stack веб-приложение, построенное на следующих технологиях:

- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Real-time**: Socket.IO для синхронизации
- **Аутентификация**: JWT tokens
- **Хранилище файлов**: Cloud storage (AWS S3 или аналог)

## Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Components │ Pages │ Services │ Store (Zustand) │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API + WebSocket
                     │
┌────────────────────▼────────────────────────────────────┐
│                Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Routes │ Controllers │ Middleware │ Services   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬────────────────┐
        │                         │                 │
┌───────▼────────┐      ┌────────▼──────┐   ┌─────▼──────┐
│   PostgreSQL   │      │  File Storage │   │  Socket.IO │
│    Database    │      │   (AWS S3)    │   │   Server   │
└────────────────┘      └───────────────┘   └────────────┘
```

## Backend архитектура

### Слои приложения

#### 1. Routes Layer (Маршруты)
Определяет API endpoints и связывает их с контроллерами:

- `/api/auth` - авторизация и аутентификация
- `/api/models` - управление моделями одежды
- `/api/comments` - комментарии и согласования
- `/api/collections` - управление коллекциями
- `/api/seasons` - управление сезонами
- `/api/libraries` - библиотеки (ткани, фурнитура, эскизы)

#### 2. Controllers Layer (Контроллеры)
Обработка бизнес-логики для каждого endpoint:

```typescript
// Пример структуры контроллера
export const createModel = async (req: AuthRequest, res: Response) => {
  // 1. Валидация входных данных
  // 2. Проверка прав доступа
  // 3. Бизнес-логика
  // 4. Взаимодействие с БД
  // 5. Возврат ответа
};
```

#### 3. Middleware Layer
- **auth.ts** - проверка JWT токенов и прав доступа
- **validation.ts** - валидация входных данных
- **error.ts** - обработка ошибок
- **upload.ts** - обработка загрузки файлов

#### 4. Database Layer
- **connection.ts** - пул соединений с PostgreSQL
- **migrations** - миграции схемы БД
- **queries** - SQL запросы

### Модель данных

Основные таблицы:

1. **users** - пользователи системы
2. **factories** - фабрики/поставщики
3. **seasons** - сезоны разработки (SS26, AW26)
4. **collections** - коллекции одежды
5. **models** - модели одежды (главная таблица)
6. **fabrics** - библиотека тканей
7. **accessories** - библиотека фурнитуры
8. **model_colors** - цвета модели (Pantone)
9. **model_fabrics** - связь модели с тканями
10. **model_accessories** - связь модели с фурнитурой
11. **model_prints** - принты для модели
12. **stage_comments** - комментарии на стадиях DS/PPS
13. **pps_approvals** - согласования PPS
14. **factory_prices** - цены от поставщиков
15. **status_history** - история изменения статусов

### Система прав доступа (RBAC)

#### Роли и их права:

**Buyer (Байер)**
- Полный доступ ко всем функциям
- Создание/редактирование/удаление моделей
- Назначение фабрик
- Утверждение моделей
- Просмотр всех цен
- Согласование на DS и PPS

**Constructor (Конструктор/Технолог)**
- Создание/редактирование моделей
- Управление библиотекой табелей мер
- Загрузка базовых эскизов
- Комментарии на DS и PPS
- Согласование на PPS
- Нет доступа к ценам

**Designer (Дизайнер)**
- Создание моделей
- Редактирование своих моделей
- Загрузка принтов
- Комментарии на DS
- Загрузка базовых эскизов
- Нет доступа к ценам

**China Office (Китайский офис)**
- Просмотр всех утвержденных моделей
- Скачивание материалов
- Загрузка фото/документов на DS и PPS
- Просмотр комментариев
- Видит назначенные фабрики
- Видит цены

**Factory (Фабрика/Поставщик)**
- Просмотр только своих назначенных моделей
- Скачивание материалов
- Заполнение цен на модели
- Не видит цены других поставщиков
- Только чтение, без редактирования

## Frontend архитектура

### Структура приложения

```
src/
├── components/          # Переиспользуемые компоненты
│   ├── layout/         # Layout компоненты
│   ├── ui/             # UI компоненты (кнопки, инпуты и т.д.)
│   ├── model/          # Компоненты для работы с моделями
│   └── comments/       # Компоненты комментариев
│
├── pages/              # Страницы приложения
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Models.tsx
│   ├── ModelDetail.tsx
│   ├── ModelConstructor.tsx
│   └── Collections.tsx
│
├── services/           # API сервисы
│   ├── api.ts          # Axios instance и общие функции
│   ├── auth.ts         # Авторизация
│   ├── models.ts       # Модели
│   └── comments.ts     # Комментарии
│
├── store/              # State management (Zustand)
│   ├── authStore.ts    # Состояние авторизации
│   ├── modelStore.ts   # Состояние моделей
│   └── uiStore.ts      # UI состояние
│
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useModels.ts
│   └── useWebSocket.ts
│
├── types/              # TypeScript типы
│   └── index.ts
│
└── utils/              # Утилиты
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

### State Management

Используется **Zustand** для управления глобальным состоянием:

```typescript
// Пример store
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => { /* ... */ },
  clearAuth: () => { /* ... */ },
}));
```

### API интеграция

Все API запросы проходят через axios instance с interceptors:

```typescript
// Request interceptor - добавляет JWT токен
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - обрабатывает 401 ошибки
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

## Workflow моделей

### Жизненный цикл модели

```
1. Draft (Черновик)
   ↓ Дизайнер создает модель

2. Pending Review (На проверке)
   ↓ Байер/Конструктор проверяют

3. Approved (Утверждено)
   ↓ Байер назначает фабрику

4. DS Stage (Стадия DS)
   ↓ Комментарии от байера и конструктора

5. PPS Stage (Стадия PPS)
   ↓ China Office загружает образец
   ↓ Байер и конструктор согласовывают

6. In Production (В производстве)
   ↓ Оба согласовали PPS

7. Shipped (Отгружено)
```

### Стадия DS (Design Sample)

На стадии DS:
- Дизайнер может вносить правки
- Байер оставляет комментарии (отдельная колонка)
- Конструктор оставляет комментарии (отдельная колонка)
- Все могут загружать фото/документы

### Стадия PPS (Pre-Production Sample)

На стадии PPS:
- China Office загружает фото образца и табель мер
- Байер дает согласование (approved/not approved + комментарий)
- Конструктор дает согласование (approved/not approved + комментарий)
- При двух согласованиях → автоматический переход в "В производстве"

## Real-time обновления

Используется **Socket.IO** для real-time синхронизации:

```typescript
// Backend
io.on('connection', (socket) => {
  socket.on('join-model', (modelId) => {
    socket.join(`model-${modelId}`);
  });
});

// Broadcast изменений
io.to(`model-${modelId}`).emit('model-updated', updatedModel);

// Frontend
const socket = io('http://localhost:3000');

socket.emit('join-model', modelId);
socket.on('model-updated', (model) => {
  // Обновить UI
});
```

## Безопасность

### Аутентификация
- JWT токены с истечением срока действия
- Хеширование паролей с bcrypt
- Refresh tokens (опционально)

### Авторизация
- Role-based access control (RBAC)
- Проверка прав на уровне routes
- Проверка прав на уровне controllers
- Factory isolation - фабрики видят только свои модели

### Защита данных
- Helmet.js для HTTP headers
- CORS настройки
- Rate limiting (опционально)
- SQL injection защита через parameterized queries
- XSS защита через sanitization

## Масштабируемость

### Горизонтальное масштабирование
- Stateless backend (JWT вместо sessions)
- Database connection pooling
- Redis для сессий (опционально)
- Load balancer перед backend

### Вертикальное масштабирование
- Database indexing для быстрых запросов
- Кеширование часто используемых данных
- Lazy loading на frontend
- Pagination для больших списков

## Мониторинг и логирование

### Backend логирование
- Morgan для HTTP запросов
- Winston для application logs (опционально)
- Error tracking с Sentry (опционально)

### Метрики
- Health check endpoint `/health`
- Database connection status
- API response times

## Deployment

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Production
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Deploy dist/ to CDN или static hosting
```

### Environment Variables

Backend требует:
- Database credentials
- JWT secret
- AWS/S3 credentials
- CORS origins

Frontend требует:
- API base URL
- Socket.IO URL

## Будущие улучшения

1. **Конструктор моделей** - визуальный редактор с drag-and-drop
2. **PDF генерация** - автоматическое создание техдоков
3. **AI экспорт** - сохранение в Adobe Illustrator формате
4. **Email уведомления** - оповещения о статусах и комментариях
5. **История версий** - tracking изменений в моделях
6. **Bulk operations** - массовые операции с моделями
7. **Advanced search** - полнотекстовый поиск
8. **Analytics dashboard** - статистика по моделям и производству
