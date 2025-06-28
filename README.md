# JustDebate.online Backend

Backend API для платформы дебатов JustDebate.online.

## Технологии

- **Hono** - Быстрый веб-фреймворк
- **Drizzle ORM** - Type-safe ORM для PostgreSQL
- **PostgreSQL** - База данных
- **Google OAuth** - Аутентификация
- **JWT** - Токены авторизации

## Установка и запуск

### Локальная разработка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`

4. Запустите миграции базы данных:
```bash
npm run generate
npm run migrate
```

5. Запустите сервер разработки:
```bash
npm run dev
```

### Деплой на Render.com

1. Создайте новый Web Service на Render.com
2. Подключите ваш GitHub репозиторий
3. Настройте переменные окружения:
   - `DATABASE_URL` - URL PostgreSQL базы данных
   - `JWT_SECRET` - Секретный ключ для JWT
   - `GOOGLE_CLIENT_ID` - ID Google OAuth приложения
   - `GOOGLE_CLIENT_SECRET` - Секрет Google OAuth приложения
   - `NODE_ENV=production`

4. Настройте команды сборки:
   - **Build Command:** `npm install && npm run generate && npm run migrate`
   - **Start Command:** `npm start`

## API Endpoints

### Аутентификация
- `POST /api/auth/google` - Вход через Google
- `POST /api/auth/logout` - Выход
- `GET /api/auth/verify` - Проверка токена

### Пользователи
- `GET /api/users` - Получить всех пользователей
- `GET /api/users/:id` - Получить пользователя по ID
- `PUT /api/users/:id` - Обновить профиль пользователя
- `POST /api/users/:id/comments` - Добавить комментарий к профилю

### Темы дебатов
- `GET /api/topics` - Получить все темы
- `GET /api/topics/:id` - Получить тему по ID
- `POST /api/topics` - Создать новую тему
- `PUT /api/topics/:id` - Обновить тему
- `DELETE /api/topics/:id` - Удалить тему

### Аргументы
- `GET /api/arguments/topic/:topicId` - Получить аргументы темы
- `POST /api/arguments` - Создать новый аргумент
- `POST /api/arguments/:id/vote` - Проголосовать за аргумент
- `GET /api/arguments/:id/replies` - Получить ответы на аргумент
- `POST /api/arguments/:id/replies` - Создать ответ на аргумент

## База данных

Схема базы данных включает следующие таблицы:
- `users` - Пользователи
- `topics` - Темы дебатов
- `arguments` - Аргументы в дебатах
- `replies` - Ответы на аргументы
- `votes` - Голоса пользователей
- `comments` - Комментарии к профилям

## Безопасность

- JWT токены для авторизации
- Google OAuth для аутентификация
- Валидация данных с помощью Zod
- CORS настройки
- Проверка прав доступа

## Деплой

Проект настроен для автоматического деплоя на Render.com:

1. **Сборка происходит автоматически** при push в main ветку
2. **Миграции запускаются** автоматически после сборки
3. **Сервер стартует** на порту из переменной окружения PORT

### Команды для Render.com:
- **Build:** `npm install && npm run generate && npm run migrate`
- **Start:** `npm start`