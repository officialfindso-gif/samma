# Content SaaS Platform - Руководство для AI-агентов

## Обзор архитектуры

Это **Django + Next.js SaaS-платформа** для AI-генерации контента. Backend обрабатывает интеграцию с LLM через Celery-задачи, а frontend предоставляет TypeScript-интерфейс.

**Ключевые архитектурные решения:**
- Django backend работает только как REST API (без серверного рендеринга)
- JWT-аутентификация через `djangorestframework-simplejwt` 
- Celery + Redis для асинхронной генерации контента через LLM (не блокирует API-запросы)
- SQLite в разработке, PostgreSQL в продакшене (через Docker)
- Frontend использует client-side хранилище (localStorage) для токенов

## Базовая модель данных

Все модели в `backend/saas/models.py`:

- **Workspace** - Мультитенантная единица организации с владельцем и участниками
- **WorkspaceMember** - Промежуточная таблица с ролевым доступом (owner/admin/editor/viewer)
- **Post** - Элементы контента с рабочим процессом статусов: `new → in_progress → ready/error`
- **Prompt** - Переиспользуемые шаблоны промптов для LLM (caption/script) в рамках workspace
- **SubscriptionPlan / UserSubscription** - SaaS-модель биллинга с лимитами функций

**Критичный паттерн:** Посты привязаны к workspace, и пользователи получают доступ к постам через членство в workspace. Всегда фильтруйте через `workspace__members__user=request.user` во views.

## Интеграция с внешними сервисами

### Парсинг контента через ScrapeCreators

**API:** http://scrapecreators.com - сервис для извлечения контента из соцсетей (Instagram, TikTok, YouTube).

**Паттерн интеграции:**
1. Создайте отдельный модуль `backend/saas/scraper.py` для работы с ScrapeCreators API
2. Используйте singleton session как в `llm.py` для переиспользования HTTP-соединений
3. Всегда вызывайте парсинг через Celery-задачу (может занимать 5-30 секунд)
4. Сохраняйте результаты в поля `Post.original_text`, `Post.transcript`, `Post.source_url`

**Рекомендуемая структура:**
```python
# backend/saas/scraper.py
def scrape_content(url: str) -> dict:
    """
    Парсит контент с Instagram/TikTok/YouTube через ScrapeCreators.
    Возвращает: {
        'caption': str,      # Описание поста
        'transcript': str,   # Расшифровка видео (если есть)
        'media_url': str,    # URL медиафайла
        'author': str,       # Имя автора
    }
    """
    pass

# backend/saas/tasks.py
@shared_task
def scrape_and_process_post(post_id: int, source_url: str):
    """Сначала парсим контент, потом обрабатываем через LLM"""
    post = Post.objects.get(id=post_id)
    
    # 1. Парсинг
    scraped_data = scrape_content(source_url)
    post.original_text = scraped_data['caption']
    post.transcript = scraped_data.get('transcript', '')
    post.save()
    
    # 2. LLM-обработка
    process_post.delay(post_id)
```

**Обработка ошибок при парсинге:**
- **Rate limiting** (429): Используйте exponential backoff с декоратором `@shared_task(autoretry_for=(RequestException,), retry_backoff=True)`
- **Недоступный контент** (404, 403): Обновите `post.status='error'` и `post.error_message='Контент недоступен'`
- **Timeout:** Установите `timeout=60` для долгих видео
- **Парсинг приватных аккаунтов:** Проверяйте наличие cookie/токенов в `SocialAccount`

**Переменные окружения:**
```env
$1<REDACTED>
SCRAPECREATORS_API_BASE=http://scrapecreators.com/api/v1
```

### Паттерн интеграции с LLM

Находится в `backend/saas/llm.py`:

1. **Singleton session:** Использует глобальную `requests.Session` с OpenAI-креденшалами
2. **Конфигурация через .env:** Задайте `OPENAI_API_KEY`, `OPENAI_MODEL` (по умолчанию: gpt-4o-mini), `OPENAI_PROXY` (опционально)
3. **Обработка ошибок:** Логирует и выбрасывает `RuntimeError` при ошибках API
4. **Асинхронное выполнение:** Никогда не вызывайте LLM напрямую из views - всегда используйте Celery-задачу `process_post.delay(post_id)`

**Пример полного потока (парсинг + LLM):**
```python
# Во view - запуск асинхронной обработки
post.status = 'in_progress'
post.save()
scrape_and_process_post.delay(post.id, source_url)  # Celery-задача

# В tasks.py - парсинг, затем LLM
scraped = scrape_content(source_url)
post.original_text = scraped['caption']
post.save()

generated = generate_caption(prompt_text, post.original_text)
post.generated_caption = generated
post.status = 'ready'
```

## Соглашения API

**Структура URL:** Все эндпоинты под `/api/` через DRF DefaultRouter:
- `/api/auth/token/` - JWT-логин (POST: username/password)
- `/api/workspaces/` - ViewSet CRUD
- `/api/posts/` - ViewSet CRUD + кастомный экшн `/api/posts/{id}/process/`
- `/api/prompts/` - ViewSet CRUD

**Аутентификация:** Включайте заголовок `Authorization: Bearer <access_token>`. Frontend хранит токены в localStorage.

**Кастомные экшны:** Используйте декоратор `@action(detail=True, methods=['post'])` (см. `PostViewSet.process()`).

**Обход проблем с type hints:** Используйте `# type: ignore[override]` на `get_queryset()` для подавления ошибок Pylance.

## Архитектура Frontend

Находится в `frontend/src/`:

- **Next.js 16 с App Router** - Страницы в поддиректориях `src/app/`
- **API-клиент:** `src/lib/api.ts` содержит типизированные fetch-обёртки (например, `getWorkspaces()`, `login()`)
- **Переменная окружения:** `NEXT_PUBLIC_API_URL` (по умолчанию: http://127.0.0.1:8000)
- **Без библиотек управления состоянием** - Использует React state + localStorage для auth

**Добавление новых API-вызовов:**
1. Определите TypeScript-интерфейс в `api.ts`
2. Создайте async-функцию с заголовком `Authorization`
3. Обрабатывайте 401-ответы (истечение токена)

## Рабочие процессы разработки

### Настройка Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Запуск Celery (необходим для LLM-генерации)
```bash
# Терминал 1: Redis (или используйте Docker)
docker run -d -p 6379:6379 redis:7

# Терминал 2: Celery worker
celery -A core worker -l info
```

### Настройка Frontend
```bash
cd frontend
npm install
npm run dev  # Запускается на localhost:3000
```

### Docker (полный стек)
```bash
docker-compose up -d  # Запускает только PostgreSQL + Redis
# Запускайте backend/frontend вручную ИЛИ расширьте docker-compose.yml
```

## Критичные паттерны и соглашения

**Именование в Django:**
- Модели: `PascalCase`
- Функции/переменные: `snake_case`
- Порядок импортов: stdlib → сторонние → проектные

**CORS:** Настроен для `http://localhost:3000` в `core/settings.py` - обновите для продакшена.

**Запросы к БД:** Всегда используйте `select_related()` или `prefetch_related()` при обращении к внешним ключам, чтобы избежать N+1 запросов:
```python
post = Post.objects.select_related('workspace', 'caption_prompt').get(id=post_id)
```

**Обработка ошибок в задачах:** Оборачивайте логику Celery-задач в try/except, обновляйте `post.error_message` и `post.status='error'` при ошибке.

## Переменные окружения

Создайте `backend/.env`:
```env
# Django
$1<REDACTED>
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# OpenAI LLM
$1<REDACTED>
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_PROXY=  # Опционально

# ScrapeCreators парсинг
$1<REDACTED>
SCRAPECREATORS_API_BASE=http://scrapecreators.com/api/v1

# Redis/Celery
REDIS_URL=redis://localhost:6379/0

# PostgreSQL (продакшен)
POSTGRES_DB=content_saas
POSTGRES_USER=content_user
POSTGRES_PASSWORD=content_pass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

## Продвинутые паттерны

### Кэширование данных

**Redis для кэширования:** Используйте Django cache framework для частых запросов:
```python
from django.core.cache import cache

# Кэширование промптов workspace
def get_active_prompt(workspace_id: int, prompt_type: str):
    cache_key = f'prompt_{workspace_id}_{prompt_type}'
    prompt = cache.get(cache_key)
    
    if prompt is None:
        prompt = Prompt.objects.filter(
            workspace_id=workspace_id,
            type=prompt_type,
            is_active=True
        ).first()
        cache.set(cache_key, prompt, timeout=3600)  # 1 час
    
    return prompt
```

**Инвалидация кэша:** Переопределите `save()` в модели `Prompt` для очистки кэша при изменении.

### Retry-логика для внешних API

**Декоратор для повторных попыток:**
```python
from celery import shared_task
from requests.exceptions import RequestException

@shared_task(
    bind=True,
    autoretry_for=(RequestException, RuntimeError),
    retry_kwargs={'max_retries': 3, 'countdown': 5},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def robust_api_call(self, post_id: int):
    """Автоматически повторяет при ошибках сети"""
    pass
```

### Мониторинг и логирование

**Структурированное логирование:**
```python
import logging
logger = logging.getLogger(__name__)

# В tasks.py
logger.info(
    "Processing post",
    extra={
        'post_id': post.id,
        'workspace_id': post.workspace_id,
        'status': post.status,
    }
)
```

**Метрики Celery:** Используйте Flower для мониторинга очереди задач:
```bash
pip install flower
celery -A core flower --port=5555
# Откройте http://localhost:5555
```

### Пагинация больших списков

**Для эндпоинтов с большим количеством постов:**
```python
# В settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# Во views.py - фильтрация по дате
class PostViewSet(viewsets.ModelViewSet):
    filterset_fields = ['status', 'platform', 'created_at']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
```

### Оптимизация запросов

**Prefetch для связанных объектов:**
```python
# В views.py
def get_queryset(self):
    return Post.objects.select_related(
        'workspace',
        'caption_prompt',
        'social_account',
        'created_by'
    ).prefetch_related(
        'workspace__members__user'
    ).filter(
        workspace__members__user=self.request.user
    ).distinct()
```

### Тестирование интеграций

**Mock внешних API в тестах:**
```python
from unittest.mock import patch, MagicMock

@patch('saas.scraper.scrape_content')
@patch('saas.llm.generate_caption')
def test_full_processing_flow(mock_generate, mock_scrape):
    mock_scrape.return_value = {
        'caption': 'Original text',
        'transcript': 'Video transcript',
    }
    mock_generate.return_value = 'Generated caption'
    
    # Тестируйте задачу без реальных API-вызовов
    scrape_and_process_post(post_id=1, source_url='https://...')
```

## Безопасность

**Валидация входных данных:**
- Проверяйте `source_url` через регулярные выражения перед парсингом
- Ограничивайте размер `original_text` (например, 10000 символов)
- Санитизируйте вывод LLM перед сохранением (удаляйте потенциально опасный контент)

**Rate limiting:** Используйте Django REST Framework throttling для защиты от злоупотреблений:
```python
# В settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/hour',
        'user': '100/hour'
    }
}
```
```

## Частые задачи

**Добавить новое поле в модель:**
1. Отредактируйте `backend/saas/models.py`
2. Выполните `python manage.py makemigrations`
3. Выполните `python manage.py migrate`
4. Обновите сериализатор в `serializers.py`
5. Обновите TypeScript-интерфейс в `frontend/src/lib/api.ts`

**Добавить новый API-эндпоинт:**
1. Добавьте метод в ViewSet в `views.py` с декоратором `@action` ИЛИ создайте новый ViewSet
2. Зарегистрируйте в роутере `core/urls.py`
3. Добавьте TypeScript-функцию в `api.ts`

**Отладка Celery-задач:**
- Проверьте подключение к Redis: `redis-cli ping`
- Смотрите логи worker для стектрейсов
- Используйте Django admin для проверки статуса Post и error_message
