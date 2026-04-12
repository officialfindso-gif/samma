import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')

# все настройки Celery будем задавать через Django settings с префиксом CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Debug: log which Redis URL is being used at worker startup
import logging
logger = logging.getLogger(__name__)
broker_debug = (
    os.getenv('REDIS_URL') or os.getenv('CELERY_BROKER_URL') or 'redis://localhost:6379/0'
)
logger.info('Celery starting with broker URL: %s', broker_debug)

# автоматически искать tasks.py в приложениях
app.autodiscover_tasks()

# ========================================
# Celery Beat — защита от дубликатов задач
# ========================================
# 1. beat_schedule_filename — персистентное хранение расписания
#    Предотвращает потерю состояния при рестарте Beat
app.conf.beat_schedule_filename = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'celerybeat-schedule.db'
)

# 2. beat_max_loop_interval — минимальный интервал между проверками расписания
#    Предотвращает "catch-up" выполнение пропущенных задач при долгом простое
app.conf.beat_max_loop_interval = 60  # секунд

# 3. task_acks_late = True — задача ACK-ится ПОСЛЕ выполнения, а не до
#    Если воркер упадёт — задача вернётся в очередь, а не потеряется
app.conf.task_acks_late = True

# 4. worker_prefetch_multiplier = 1 — воркер берёт по 1 задаче за раз
#    Предотвращает "hoarding" задач одним воркером
app.conf.worker_prefetch_multiplier = 1

# 5. task_reject_on_worker_lost = True — если воркер потерялся, задача reject-ится
#    и переотправляется другому воркеру
app.conf.task_reject_on_worker_lost = True

# Расписание для периодических задач (Celery Beat)
app.conf.beat_schedule = {
    'scrape-competitors-hourly-check': {
        'task': 'saas.tasks.scrape_competitor_posts',
        'schedule': crontab(minute=0),  # Каждый час в 00 минут
        # Задача сама проверит настройки SystemSettings и решит, запускать ли парсинг
    },
    'reset-stuck-posts': {
        'task': 'saas.tasks.reset_stuck_posts_periodic',
        'schedule': crontab(minute='*/15'),  # Каждые 15 минут
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
