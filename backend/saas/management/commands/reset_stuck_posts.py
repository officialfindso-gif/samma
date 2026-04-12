from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from saas.models import Post


class Command(BaseCommand):
    help = 'Сбрасывает посты, застрявшие в статусе "in_progress" дольше указанного времени.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=10,
            help='Минуты простоя, после которых пост считается зависшим (по умолчанию: 10)',
        )

    def handle(self, *args, **options):
        threshold_minutes = options['minutes']
        threshold = timezone.now() - timedelta(minutes=threshold_minutes)
        
        stuck_posts = Post.objects.filter(
            status='in_progress',
            updated_at__lt=threshold
        )
        
        count = stuck_posts.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('✅ Нет зависших постов.'))
            return

        stuck_posts.update(
            status='error',
            error_message=f'⏳ Задача зависла в обработке >{threshold_minutes} мин. Попробуйте запустить снова.'
        )
        
        self.stdout.write(self.style.SUCCESS(f'✅ Сброшено {count} зависших постов в статус "error".'))
