# Content SaaS Platform

Это SaaS-платформа для создания контента с использованием искусственного интеллекта. Приложение позволяет пользователям создавать, управлять и автоматически генерировать контент для социальных сетей с помощью LLM.

## Архитектура

Проект состоит из двух основных частей:

### Backend (Django)
- **Фреймворк**: Django 5.2.8 с Django REST Framework
- **База данных**: SQLite (в разработке), PostgreSQL (в продакшене)
- **Асинхронные задачи**: Celery с Redis в качестве брокера
- **Аутентификация**: JWT-токены
- **Кэширование**: Redis

### Frontend (Next.js)
- **Фреймворк**: Next.js 16.0.6
- **Язык**: TypeScript
- **Стилизация**: Tailwind CSS
- **Состояние**: Client-side storage (localStorage)

## Установка и запуск

### Предварительные требования
- Python 3.9+
- Node.js 18+
- Redis
- Docker (опционально)

### Установка backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # на Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Создайте файл `.env` с переменными окружения:

```env
$1<REDACTED>
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_PROXY=  # если используется прокси
```

Запустите миграции и сервер:

```bash
python manage.py migrate
python manage.py createsuperuser  # если нужно
python manage.py runserver
```

### Установка frontend

```bash
cd frontend
npm install
npm run dev
```

### Запуск с Docker

```bash
docker-compose up -d
```

## Структура проекта

### Backend
- `core/` - настройки Django
- `saas/` - основное приложение
  - `models.py` - модели данных
  - `views.py` - представления API
  - `serializers.py` - сериализаторы DRF
  - `tasks.py` - асинхронные задачи Celery
  - `llm.py` - интеграция с LLM

### Frontend
- `src/app/` - страницы приложения
  - `app/` - основное приложение
  - `login/` - страница входа
  - `prompts/` - управление промптами
  - `profile/` - профиль пользователя
- `src/lib/api.ts` - клиентские API-функции

## Функциональность

### Основные возможности
1. **Управление воркспейсами** - создание и управление рабочими пространствами
2. **Управление промптами** - создание и редактирование промптов для генерации контента
3. **Генерация контента** - автоматическая генерация описаний и сценариев с помощью LLM
4. **Подписки** - система тарифных планов и подписок
5. **Управление пользователями** - регистрация, аутентификация и профили

### Типы моделей
- `Workspace` - воркспейсы для организации контента
- `Post` - посты, которые можно обрабатывать с помощью LLM
- `Prompt` - шаблоны промптов для генерации контента
- `SocialAccount` - учетные записи социальных сетей
- `SubscriptionPlan` - тарифные планы
- `UserSubscription` - подписки пользователей

## API Endpoints

### Аутентификация
- `POST /api/auth/token/` - получение JWT-токенов
- `POST /api/auth/token/refresh/` - обновление токенов

### Ресурсы
- `GET/POST /api/workspaces/` - воркспейсы
- `GET/POST/PUT/PATCH/DELETE /api/posts/` - посты
- `GET/POST/PUT/PATCH/DELETE /api/prompts/` - промпты
- `POST /api/posts/{id}/process/` - запуск обработки поста
- `GET/POST /api/subscription-plans/` - тарифные планы
- `GET/POST /api/user-subscriptions/` - подписки пользователей

## Интеграции

### OpenAI
Платформа использует API OpenAI для генерации контента. Поддерживает кастомные эндпоинты и прокси.

### Stripe (планируется)
Интеграция с Stripe для обработки платежей и управления подписками.

## Разработка

### Backend
- Для добавления новых моделей используйте `python manage.py makemigrations` и `python manage.py migrate`
- Для запуска Celery worker: `celery -A core worker -l info`

### Frontend
- Все API-запросы находятся в `src/lib/api.ts`
- Для добавления новых страниц используйте App Router Next.js

## Безопасность

- Все API защищены JWT-аутентификацией
- Проверка доступа к ресурсам на уровне воркспейсов
- Валидация входных данных через сериализаторы DRF

## Лицензия

MIT License