from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from saas.models import Workspace, Prompt, WorkspaceMember

User = get_user_model()

DEFAULT_PROMPTS = [
    # Caption промпты
    {
        'name': '📝 Цепкий заголовок + CTA',
        'type': 'caption',
        'content': 'Напиши цепкое описание для Reels/Shorts. Структура:\n1. Цепкий заголовок (первая строка)\n2. 2-3 предложения сути\n3. Призыв к действию (CTA)\nИспользуй эмодзи, будь краток. До 150 символов.',
        'is_default': True,
    },
    {
        'name': '🎯 Продающий пост',
        'type': 'caption',
        'content': 'Создай продающий текст для поста. Структура:\n1. Проблема клиента (боль)\n2. Решение (наш продукт)\n3. Социальное доказательство\n4. Призыв к действию\nТон: дружелюбный, экспертный. До 200 символов.',
        'is_default': False,
    },
    # Script промпты
    {
        'name': '🎬 Сценарий экспертного видео',
        'type': 'script',
        'content': 'Напиши сценарий для короткого экспертного видео (30-60 сек):\n1. Хук (0-3 сек): цепляющая фраза\n2. Проблема (3-10 сек): опиши боль аудитории\n3. Решение (10-40 сек): конкретные шаги/советы\n4. CTA (40-60 сек): призыв подписаться/сохранить\nФормат: текст для озвучки.',
        'is_default': True,
    },
    # Title промпты
    {
        'name': '🏷️ Вирусный заголовок',
        'type': 'title',
        'content': 'Создай вирусный заголовок для видео. Критерии:\n1. Вызывает любопытство\n2. Содержит конкретику (цифры, факты)\n3. Обещает пользу\n4. До 60 символов\nДай 3 варианта на выбор.',
        'is_default': True,
    },
    # Description промпты
    {
        'name': '📖 SEO-описание для YouTube',
        'type': 'description',
        'content': 'Напиши SEO-оптимизированное описание для YouTube видео:\n1. Первые 2 строки — суть видео (для превью)\n2. Хэштеги (3-5 штук)\n3. Таймкоды (если уместно)\n4. Ссылки и призывы\nДо 500 символов.',
        'is_default': True,
    },
    # Original text processing
    {
        'name': '🧹 Очистка оригинала',
        'type': 'original',
        'content': 'Отредактируй исходный текст: убери мусор и повторы, исправь пунктуацию, сохрани смысл и факты. Верни только чистый текст на русском языке без пояснений.',
        'is_default': True,
    },
]


class Command(BaseCommand):
    help = 'Создаёт дефолтные промпты для воркспейса пользователя'

    def add_arguments(self, parser):
        parser.add_argument(
            '--workspace-id',
            type=int,
            help='ID воркспейса для создания промптов',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Создать промпты для всех воркспейсов без промптов',
        )

    def handle(self, *args, **options):
        workspace_id = options.get('workspace_id')
        create_all = options.get('all')

        workspaces = []
        if workspace_id:
            ws = Workspace.objects.filter(id=workspace_id).first()
            if ws:
                workspaces.append(ws)
        elif create_all:
            workspaces = Workspace.objects.all()
        else:
            # Создаём для всех воркспейсов без промптов
            workspaces = Workspace.objects.filter(prompts__isnull=True).distinct()

        created_total = 0
        for ws in workspaces:
            created = 0
            for prompt_data in DEFAULT_PROMPTS:
                _, is_new = Prompt.objects.get_or_create(
                    workspace=ws,
                    name=prompt_data['name'],
                    defaults={
                        'type': prompt_data['type'],
                        'content': prompt_data['content'],
                        'is_default': prompt_data['is_default'],
                    }
                )
                if is_new:
                    created += 1
            
            if created > 0:
                self.stdout.write(self.style.SUCCESS(
                    f'✅ Workspace "{ws.name}": создано {created} промптов'
                ))
            created_total += created

        if created_total == 0:
            self.stdout.write(self.style.WARNING('ℹ️ Новые промпты не созданы (уже существуют)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'🎉 Всего создано: {created_total} промптов'))
