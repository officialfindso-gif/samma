from django.conf import settings
from django.db import models


class Workspace(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_workspaces'
    )
    seats_limit = models.PositiveIntegerField(default=1)
    
    # Поля для управления клиентами
    is_client = models.BooleanField(
        default=False,
        verbose_name='Клиентский проект',
        help_text='Отметьте, если это workspace клиента'
    )
    client_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Название клиента/компании',
        help_text='Например: ООО "Ромашка" или Иван Петров'
    )
    client_contact = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Контакт клиента',
        help_text='Email, телефон или Telegram'
    )
    client_notes = models.TextField(
        blank=True,
        verbose_name='Заметки о клиенте'
    )
    color = models.CharField(
        max_length=7,
        default='#6366f1',
        verbose_name='Цвет для UI',
        help_text='HEX цвет, например #6366f1'
    )
    tags = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Теги',
        help_text='Теги через запятую: срочно, премиум, активный'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def get_tags_list(self):
        """Возвращает список тегов"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]


class WorkspaceMember(models.Model):
    ROLE_CHOICES = (
        ('owner', 'Владелец'),
        ('admin', 'Администратор'),
        ('editor', 'Редактор'),
        ('viewer', 'Наблюдатель'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='editor')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('workspace', 'user')

    def __str__(self):
        return f'{self.user} in {self.workspace} as {self.role}'


class SocialAccount(models.Model):
    PLATFORM_CHOICES = (
        ('instagram', 'Instagram'),
        # позже добавишь youtube, tiktok и т.п.
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='social_accounts'
    )
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    username = models.CharField(max_length=255)
    external_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('workspace', 'platform', 'username')

    def __str__(self):
        return f'{self.platform} - {self.username}'


class Prompt(models.Model):
    TYPE_CHOICES = (
        ('caption', 'Caption'),
        ('script', 'Script'),
        ('title', 'Title'),
        ('description', 'Description'),
        ('original', 'Original'),
        ('other', 'Other'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='prompts',
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='caption')
    content = models.TextField()

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(
        default=False,
        verbose_name='Промпт по умолчанию',
        help_text='Используется при обработке постов кнопкой "Обработать"'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        pass

    def __str__(self):
        return f'{self.workspace} | {self.name} (#{self.pk})'

    def save(self, *args, **kwargs):
        """При сохранении is_default=True — сбрасываем остальные промпты этого типа"""
        if self.is_default:
            Prompt.objects.filter(
                workspace=self.workspace,
                type=self.type,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Post(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('in_progress', 'In progress'),
        ('ready', 'Ready'),
        ('error', 'Error'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='posts',
    )
    social_account = models.ForeignKey(
        SocialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts',
    )

    # 🔥 выбранный промпт для генерации caption (если null → берём дефолтный активный)
    caption_prompt = models.ForeignKey(
        Prompt,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='caption_posts',
    )

    title = models.CharField(max_length=255, blank=True)
    source_url = models.URLField(blank=True)
    platform = models.CharField(max_length=50, default='instagram')

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
    )

    error_message = models.TextField(blank=True)

    original_text = models.TextField(blank=True)
    transcript = models.TextField(blank=True)
    generated_caption = models.TextField(blank=True)
    generated_script = models.TextField(blank=True)
    generated_title = models.TextField(blank=True)
    generated_description = models.TextField(blank=True)
    generated_original = models.TextField(blank=True)
    description = models.TextField(blank=True, help_text='Описание поста/видео')

    # Метрики вирусности
    views_count = models.BigIntegerField(null=True, blank=True, help_text='Количество просмотров')
    likes_count = models.IntegerField(null=True, blank=True, help_text='Количество лайков')
    comments_count = models.IntegerField(null=True, blank=True, help_text='Количество комментариев')
    shares_count = models.IntegerField(null=True, blank=True, help_text='Количество репостов/шеров')
    engagement_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Процент вовлеченности (likes+comments+shares)/views * 100'
    )
    video_duration = models.IntegerField(null=True, blank=True, help_text='Длительность видео в секундах')
    published_at = models.DateTimeField(null=True, blank=True, help_text='Дата публикации оригинального контента')
    
    # Дополнительные метрики
    play_count = models.BigIntegerField(null=True, blank=True, help_text='Количество воспроизведений видео')
    saves_count = models.IntegerField(null=True, blank=True, help_text='Количество сохранений')
    author_followers = models.IntegerField(null=True, blank=True, help_text='Подписчики автора на момент парсинга')
    has_audio = models.BooleanField(null=True, blank=True, help_text='Есть ли аудиодорожка')
    is_video = models.BooleanField(null=True, blank=True, help_text='Является ли видео контентом')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f'Post {self.pk}'


class SubscriptionPlan(models.Model):
    """
    Модель тарифного плана
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    period_months = models.PositiveIntegerField(default=1)  # период в месяцах
    max_workspaces = models.PositiveIntegerField(default=1)
    max_seats_per_workspace = models.PositiveIntegerField(default=1)
    max_posts_per_month = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class UserSubscription(models.Model):
    """
    Модель подписки пользователя
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='user_subscriptions'
    )
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)  # для интеграции с Stripe
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} - {self.plan.name} for {self.workspace}'


class SubscriptionFeature(models.Model):
    """
    Модель для описания возможностей тарифного плана
    """
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name='features'
    )
    feature_name = models.CharField(max_length=200)
    feature_value = models.CharField(max_length=200)  # например, "5" или "unlimited"
    description = models.TextField(blank=True)

    def __str__(self):
        return f'{self.plan.name} - {self.feature_name}'


class CompetitorAccount(models.Model):
    """
    Модель для хранения аккаунтов конкурентов
    """
    PLATFORM_CHOICES = (
        ('instagram', 'Instagram'),
        ('tiktok', 'TikTok'),
        ('youtube', 'YouTube'),
        ('linkedin', 'LinkedIn'),
    )

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='competitor_accounts',
    )
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    username = models.CharField(max_length=255)
    url = models.URLField(max_length=500)
    
    is_active = models.BooleanField(default=True)
    last_scraped_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('workspace', 'platform', 'username')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.platform} - {self.username} ({self.workspace.name})'


class SystemSettings(models.Model):
    """Глобальные настройки системы (singleton)"""
    
    # Настройки автоматического парсинга конкурентов
    auto_scraping_enabled = models.BooleanField(
        default=True,
        verbose_name='Автоматический парсинг включен'
    )
    scraping_hour = models.IntegerField(
        default=9,
        verbose_name='Час запуска парсинга (0-23)',
        help_text='Время в формате 24 часов'
    )
    scraping_minute = models.IntegerField(
        default=0,
        verbose_name='Минута запуска парсинга (0-59)'
    )

    # Глубина парсинга профилей
    max_parse_depth = models.IntegerField(
        default=10,
        verbose_name='Глубина парсинга профилей',
        help_text='Максимальное количество публикаций для выкачивания из профиля (5-50)'
    )

    # Лимиты
    max_workspaces_per_user = models.IntegerField(
        default=5,
        verbose_name='Макс. воркспейсов на пользователя',
        help_text='Сколько воркспейсов может создать один пользователь'
    )
    max_api_calls_per_day = models.IntegerField(
        default=500,
        verbose_name='Макс. API-вызовов в день',
        help_text='Лимит запросов к ScrapeCreators API на пользователя в сутки'
    )

    # Другие настройки
    last_scraping_check = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Настройки системы'
        verbose_name_plural = 'Настройки системы'

    def __str__(self):
        return f'Настройки системы (парсинг в {self.scraping_hour:02d}:{self.scraping_minute:02d})'

    @classmethod
    def get_settings(cls):
        """Получить настройки с кэшированием (создать если не существуют)"""
        from django.core.cache import cache
        cached = cache.get('system_settings')
        if cached:
            return cached

        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'auto_scraping_enabled': True,
                'scraping_hour': 9,
                'scraping_minute': 0,
                'max_parse_depth': 10,
                'max_workspaces_per_user': 5,
                'max_api_calls_per_day': 500,
            }
        )
        cache.set('system_settings', settings, timeout=300)  # 5 минут
        return settings

    def save(self, *args, **kwargs):
        """При сохранении очищаем кэш настроек"""
        from django.core.cache import cache
        super().save(*args, **kwargs)
        cache.delete('system_settings')


class ApiCallLog(models.Model):
    """Лог вызовов внешних API (ScrapeCreators)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='api_call_logs'
    )
    platform = models.CharField(max_length=20)  # instagram, tiktok, youtube, linkedin
    url = models.URLField(max_length=500)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Лог API-вызова'
        verbose_name_plural = 'Логи API-вызовов'

    def __str__(self):
        return f'{self.platform} - {self.user} - {self.created_at.strftime("%Y-%m-%d %H:%M")}'


class UserLicense(models.Model):
    """Ручные даты лицензии пользователя для админки."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='license',
    )
    license_start_date = models.DateField(null=True, blank=True)
    license_end_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Лицензия пользователя'
        verbose_name_plural = 'Лицензии пользователей'

    def __str__(self):
        return f'License for user #{self.user_id}'


class WorkspaceActivity(models.Model):
    """История взаимодействий с клиентами"""
    
    ACTIVITY_TYPES = (
        ('note', 'Заметка'),
        ('call', 'Звонок'),
        ('meeting', 'Встреча'),
        ('email', 'Email'),
        ('post_created', 'Пост создан'),
        ('post_approved', 'Пост одобрен'),
        ('payment', 'Оплата'),
        ('other', 'Другое'),
    )
    
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPES,
        default='note'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workspace_activities'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Активность клиента'
        verbose_name_plural = 'Активности клиентов'
    
    def __str__(self):
        return f'{self.workspace.name} - {self.title}'


class PostNote(models.Model):
    """Заметки к постам"""
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='post_notes'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Заметка к посту'
        verbose_name_plural = 'Заметки к постам'

    def __str__(self):
        return f'Note #{self.id} for Post #{self.post_id}'


class InviteToken(models.Model):
    """Токен приглашения для регистрации нового пользователя"""

    token = models.CharField(max_length=64, unique=True, editable=False)
    email = models.EmailField(
        blank=True,
        verbose_name='Email приглашённого (опционально)'
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='invite_tokens',
        verbose_name='Воркспейс'
    )
    role = models.CharField(
        max_length=10,
        choices=WorkspaceMember.ROLE_CHOICES,
        default='editor',
        verbose_name='Роль в воркспейсе'
    )
    expires_at = models.DateTimeField(
        verbose_name='Истекает'
    )
    used = models.BooleanField(
        default=False,
        verbose_name='Использован'
    )
    used_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='used_invites',
        verbose_name='Кто использовал'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invites',
        verbose_name='Кто создал'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Токен приглашения'
        verbose_name_plural = 'Токены приглашений'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invite: {self.token[:8]}... → {self.workspace.name}'

    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.used and not self.is_expired
