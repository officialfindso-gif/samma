# Деплой Content SaaS на VPS

## Быстрый старт

### 1. Подключение к серверу

```bash
ssh root@78.17.34.15
```

### 2. Загрузка скрипта деплоя

На вашем локальном компьютере:

```bash
# Копируем скрипт на сервер
scp deploy.sh root@78.17.34.15:/root/deploy.sh
```

### 3. Запуск на сервере

```bash
# Подключаемся к серверу
ssh root@78.17.34.15

# Делаем скрипт исполняемым
chmod +x /root/deploy.sh

# Запускаем
/root/deploy.sh
```

## Ручной деплой (по шагам)

Если хотите контролировать каждый шаг:

### 1. Установка Docker

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin nginx git
systemctl enable docker
systemctl start docker
```

### 2. Создание директории

```bash
mkdir -p /opt/content-saas
cd /opt/content-saas
```

### 3. Клонирование репозитория

```bash
git clone https://github.com/officialfindso-gif/samma.git .
```

### 4. Создание .env файла

```bash
cat > .env << EOF
SECRET_KEY=$(openssl rand -base64 50)
DEBUG=False
ALLOWED_HOSTS=78.17.34.15,localhost,127.0.0.1

POSTGRES_USER=content_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=content_saas

OPENAI_API_KEY=ваш_ключ_openai
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1

REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=http://78.17.34.15,http://localhost:3000
EOF
```

### 5. Запуск через Docker

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6. Создание суперпользователя

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 7. Проверка

```bash
# Смотрим логи
docker compose -f docker-compose.prod.yml logs -f

# Смотрим статус контейнеров
docker compose -f docker-compose.prod.yml ps
```

## Обновление приложения

```bash
cd /opt/content-saas
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

## Полезные команды

### Логи
```bash
# Все логи
docker compose -f docker-compose.prod.yml logs -f

# Логи backend
docker compose -f docker-compose.prod.yml logs -f backend

# Логи frontend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Управление контейнерами
```bash
# Перезапуск
docker compose -f docker-compose.prod.yml restart

# Остановить
docker compose -f docker-compose.prod.yml down

# Остановить с удалением данных
docker compose -f docker-compose.prod.yml down -v
```

### Доступ к контейнерам
```bash
# Backend shell
docker compose -f docker-compose.prod.yml exec backend bash

# База данных shell
docker compose -f docker-compose.prod.yml exec db psql -U content_user -d content_saas

# Redis CLI
docker compose -f docker-compose.prod.yml exec redis redis-cli
```

### Django команды
```bash
# Создать суперпользователя
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Миграции
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Статические файлы
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Setup prompts
docker compose -f docker-compose.prod.yml exec backend python manage.py setup_default_prompts
```

## Настройка SSL (HTTPS)

Если у вас есть домен:

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата
certbot --nginx -d ваш-домен.com

# Автоматическое обновление
crontab -e
# Добавить строку:
# 0 3 * * * certbot renew --quiet
```

## Мониторинг

### Проверка ресурсов
```bash
# Использование памяти и CPU
docker stats

# Дисковое пространство
df -h
du -sh /opt/content-saas
```

### Автоматический рестарт при сбоях
Все контейнеры настроены с `restart: unless-stopped`, поэтому они автоматически перезапускаются при сбоях.

## Безопасность

### Файрвол
```bash
# UFW настройка
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Обновление системы
```bash
# Автоматические обновления безопасности
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## Резервное копирование

### База данных
```bash
# Бэкап
docker compose -f docker-compose.prod.yml exec db pg_dump -U content_user content_saas > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U content_user -d content_saas
```

### Автоматический бэкап (cron)
```bash
crontab -e
# Добавить строку для ежедневного бэкапа в 2:00
# 0 2 * * * docker compose -f /opt/content-saas/docker-compose.prod.yml exec -T db pg_dump -U content_user content_saas > /opt/backups/backup_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Контейнер не запускается
```bash
# Смотрим логи
docker compose -f docker-compose.prod.yml logs backend

# Пересобираем
docker compose -f docker-compose.prod.yml up -d --build --no-cache
```

### Проблемы с базой данных
```bash
# Проверка подключения
docker compose -f docker-compose.prod.yml exec db pg_isready -U content_user

# Перезапуск БД
docker compose -f docker-compose.prod.yml restart db
```

### Проблемы с Nginx
```bash
# Проверка конфигурации
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Перезапуск Nginx
docker compose -f docker-compose.prod.yml restart nginx
```
