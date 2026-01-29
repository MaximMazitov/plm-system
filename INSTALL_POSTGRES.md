# Установка PostgreSQL на macOS

## Вариант 1: Через Homebrew (рекомендуется)

### 1. Установите Homebrew (если нет)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Установите PostgreSQL
```bash
brew install postgresql@14
```

### 3. Запустите PostgreSQL
```bash
brew services start postgresql@14
```

### 4. Создайте базу данных
```bash
createdb plm_system
```

### 5. Примените схему
```bash
cd "/Users/maximmazitov/Desktop/PLM sistem/plm-system"
psql -d plm_system -f database/schema.sql
```

---

## Вариант 2: Postgres.app (проще всего)

### 1. Скачайте Postgres.app
Откройте: https://postgresapp.com/downloads.html

### 2. Установите и запустите
- Переместите Postgres.app в Applications
- Запустите приложение
- Нажмите "Initialize" для создания сервера

### 3. Настройте PATH
```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Создайте базу данных
```bash
createdb plm_system
```

### 5. Примените схему
```bash
cd "/Users/maximmazitov/Desktop/PLM sistem/plm-system"
psql -d plm_system -f database/schema.sql
```

---

## Вариант 3: Docker (для опытных)

```bash
docker run --name plm-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14

# Создайте базу
docker exec -it plm-postgres createdb -U postgres plm_system

# Примените схему
docker exec -i plm-postgres psql -U postgres plm_system < database/schema.sql
```

---

## Проверка установки

```bash
# Проверьте версию
psql --version

# Подключитесь к базе
psql -d plm_system

# В psql выполните:
\dt  # Показать таблицы
\q   # Выход
```

---

## После установки PostgreSQL

Вернитесь к основной инструкции в **QUICKSTART.md**
