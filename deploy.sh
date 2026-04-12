#!/bin/bash
set -e

echo "========================================="
echo "  Content SaaS - Деплой на сервер"
echo "========================================="

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Переменные
APP_DIR="/opt/content-saas"
DOMAIN="78.17.34.15"  # Замените на ваш домен

echo -e "${YELLOW}[1/8] Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] Установка необходимых пакетов...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    nginx \
    certbot \
    python3-certbot-nginx \
    git

echo -e "${YELLOW}[3/8] Установка Docker...${NC}"
# Удаляем старые версии
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    apt-get remove -y $pkg 2>/dev/null || true
done

# Добавляем официальный репозиторий Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Запускаем Docker
systemctl enable docker
systemctl start docker

echo -e "${GREEN}✓ Docker установлен${NC}"

echo -e "${YELLOW}[4/8] Создание директории приложения...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}[5/8] Создание файлов конфигурации...${NC}"

# Production docker-compose.yml
cat > docker-compose.prod.yml << 'COMPOSE_EOF'
version: '3.9'

services:
  db:
    image: postgres:16-alpine
    container_name: content_saas_db
    environment:
      POSTGRES_DB: content_saas
      POSTGRES_USER: ${POSTGRES_USER:-content_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-content_pass_secure}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: content_saas_redis
    networks:
      - app_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: content_saas_backend
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3"
    volumes:
      - static_data:/app/static
      - media_data:/app/media
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgres://${POSTGRES_USER:-content_user}:${POSTGRES_PASSWORD:-content_pass_secure}@db:5432/content_saas
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=False
    depends_on:
      - db
      - redis
    networks:
      - app_network
    restart: unless-stopped

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: content_saas_celery
    command: celery -A core worker -l info
    volumes:
      - media_data:/app/media
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgres://${POSTGRES_USER:-content_user}:${POSTGRES_PASSWORD:-content_pass_secure}@db:5432/content_saas
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    networks:
      - app_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: content_saas_frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api
    depends_on:
      - backend
    networks:
      - app_network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: content_saas_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - static_data:/var/www/static
      - media_data:/var/www/media
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - backend
      - frontend
    networks:
      - app_network
    restart: unless-stopped

volumes:
  postgres_data:
  static_data:
  media_data:

networks:
  app_network:
    driver: bridge
COMPOSE_EOF

# Backend Dockerfile
mkdir -p backend
cat > backend/Dockerfile << 'DOCKERFILE_EOF'
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование requirements и установка Python-зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn psycopg2-binary

# Копирование кода
COPY . .

# Сбор статических файлов
RUN python manage.py collectstatic --noinput || true

# Создание директорий
RUN mkdir -p static media

EXPOSE 8000

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
DOCKERFILE_EOF

# Frontend Dockerfile
mkdir -p frontend
cat > frontend/Dockerfile << 'DOCKERFILE_EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Сборка приложения
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Копирование необходимых файлов
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
DOCKERFILE_EOF

# Nginx конфигурация
cat > nginx.conf << 'NGINX_EOF'
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;
    
    # Let Encrypt для SSL
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Статические файлы
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Медиа файлы
    location /media/ {
        alias /var/www/media/;
        expires 30d;
    }
    
    # API запросы
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket поддержка
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# .env файл
cat > .env << 'ENV_EOF'
# Django
$1<REDACTED>
DEBUG=False
ALLOWED_HOSTS=78.17.34.15,localhost,127.0.0.1

# База данных
POSTGRES_USER=content_user
POSTGRES_PASSWORD=content_pass_secure
POSTGRES_DB=content_saas

# OpenAI
$1<REDACTED>
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_PROXY=

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://78.17.34.15,http://localhost:3000
ENV_EOF

echo -e "${YELLOW}[6/8] Клонирование репозитория...${NC}"
cd $APP_DIR
git clone https://github.com/officialfindso-gif/samma.git . || {
    echo -e "${RED}Репозиторий уже существует, обновляем...${NC}"
    git pull origin main
}

echo -e "${YELLOW}[7/8] Запуск Docker контейнеров...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

echo -e "${YELLOW}[8/8] Проверка статуса...${NC}"
sleep 5
docker compose -f docker-compose.prod.yml ps

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Деплой завершен!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "Сервер доступен по адресу: ${YELLOW}http://78.17.34.15${NC}"
echo ""
echo -e "${YELLOW}Важно:${NC}"
echo -e "1. Обновите .env файл с вашими API ключами: ${YELLOW}$APP_DIR/.env${NC}"
echo -e "2. Создайте суперпользователя: ${YELLOW}docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser${NC}"
echo -e "3. Для SSL (HTTPS) настройте домен и запустите: ${YELLOW}certbot --nginx -d ваш-домен.com${NC}"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "  Логи: ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Перезапуск: ${YELLOW}docker compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Остановить: ${YELLOW}docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  Обновить: ${YELLOW}cd $APP_DIR && git pull && docker compose -f docker-compose.prod.yml up -d --build${NC}"
