import logging
import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('core')
app.config_from_object('django.conf:settings', namespace='CELERY')

logger = logging.getLogger(__name__)
broker_debug = (
    os.getenv('REDIS_URL') or os.getenv('CELERY_BROKER_URL') or 'redis://localhost:6379/0'
)
logger.info('Celery starting with broker URL: %s', broker_debug)

app.autodiscover_tasks()

app.conf.beat_schedule_filename = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'celerybeat-schedule.db'
)
app.conf.beat_max_loop_interval = 60
app.conf.task_acks_late = True
app.conf.worker_prefetch_multiplier = 1
app.conf.task_reject_on_worker_lost = True

app.conf.beat_schedule = {
    'scrape-competitors-minute-check': {
        'task': 'saas.tasks.run_workspace_auto_scraping',
        'schedule': crontab(minute='*'),
    },
    'reset-stuck-posts': {
        'task': 'saas.tasks.reset_stuck_posts_periodic',
        'schedule': crontab(minute='*/15'),
    },
}


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
