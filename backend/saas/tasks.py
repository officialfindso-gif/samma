from celery import shared_task
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import Post, Prompt, SystemSettings
from .llm import generate_caption
from .scraper import scrape_content
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 10},
    retry_backoff=True,
    time_limit=300,        # 5 мин: жёсткое завершение
    soft_time_limit=240,   # 4 мин: выбрасывает SoftTimeLimitExceeded
)
def scrape_and_process_post(self, post_id: int):
    """
    Полный цикл: парсинг контента → LLM обработка.
    Поддерживает как отдельные посты, так и профили.
    """
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return

    if not post.source_url:
        logger.warning(f"Post {post_id} has no source_url, skipping scraping")
        process_post.delay(post_id)
        return

    try:
        logger.info(f"Scraping content for post {post_id} from {post.source_url}")

        with transaction.atomic():
            post.status = 'in_progress'
            post.save(update_fields=['status', 'updated_at'])

        # Проверка лимита API вызовов за сегодня
        from django.utils import timezone
        from .models import ApiCallLog
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_calls = ApiCallLog.objects.filter(
            user=post.created_by,
            created_at__gte=today
        ).count()
        
        sys_settings = SystemSettings.get_settings()
        if today_calls >= sys_settings.max_api_calls_per_day:
            raise RuntimeError(
                f'Достигнут дневной лимит API-вызовов ({sys_settings.max_api_calls_per_day}). '
                f'Попробуйте завтра или обратитесь к администратору.'
            )

        scraped_data = scrape_content(post.source_url, max_items=sys_settings.max_parse_depth, user=post.created_by)

        # Если это профиль (Instagram, TikTok, YouTube или LinkedIn) - создаём отдельные посты для каждого видео/поста
        if 'posts' in scraped_data and scraped_data.get('platform') in ('instagram', 'tiktok', 'youtube', 'linkedin'):
            profile = scraped_data
            platform = profile.get('platform')
            if platform == 'instagram':
                platform_name = 'Reels'
            elif platform == 'tiktok':
                platform_name = 'videos'
            elif platform == 'youtube':
                platform_name = 'videos'
            else:  # linkedin
                platform_name = 'posts'
            
            count_key = 'reels_count' if platform == 'instagram' else (
                'posts_count' if platform == 'linkedin' else 'videos_count'
            )
            logger.info(f"Profile scraping: {profile.get(count_key, 0)} {platform_name} found")
            
            for i, item in enumerate(profile.get('posts', [])[:settings.max_parse_depth]):  # лимит из настроек
                # Данные зависят от платформы
                if platform == 'instagram':
                    item_data = item.get('data', {})
                    title = f"{profile.get('handle', '')} - Reel #{i+1}"
                    original_text = item_data.get('caption', '') or item_data.get('description', '')
                    transcript = item_data.get('transcript', '')
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                elif platform == 'tiktok':
                    title = f"{profile.get('handle', '')} - Video #{i+1}"
                    original_text = item.get('desc', '')
                    transcript = ''
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                elif platform == 'youtube':
                    title = item.get('title', '') or f"{profile.get('handle', '')} - Video #{i+1}"
                    original_text = item.get('description', '')
                    transcript = ''
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                else:  # linkedin
                    title = item.get('title', '') or f"{profile.get('handle', '')} - Post #{i+1}"
                    original_text = item.get('description', '')
                    transcript = ''
                    views = None
                    likes = item.get('likes')
                    comments = item.get('comments')
                
                post_obj = Post.objects.create(
                    workspace=post.workspace,
                    title=title,
                    source_url=item.get('url', ''),
                    platform=platform,
                    status='new',
                    original_text=original_text,
                    transcript=transcript,
                    views_count=views,
                    likes_count=likes,
                    comments_count=comments,
                    video_duration=item.get('duration'),
                    created_by=post.created_by,
                )
                logger.info(f"Created post #{post_obj.id} from profile {i+1}")
            
            # Помечаем оригинальный пост как завершённый
            with transaction.atomic():
                post.status = 'ready'
                post.original_text = f"Profile @{profile.get('handle', '')}: {profile.get(count_key, 0)} {platform_name} scraped"
                post.save(update_fields=['status', 'original_text', 'updated_at'])
            return

        # Одиночный пост - сохраняем метрики
        with transaction.atomic():
            post.original_text = scraped_data.get('caption', '')
            post.transcript = scraped_data.get('transcript', '')
            post.platform = scraped_data.get('platform', post.platform)
            post.views_count = scraped_data.get('views_count')
            post.likes_count = scraped_data.get('likes_count')
            post.comments_count = scraped_data.get('comments_count')
            post.shares_count = scraped_data.get('shares_count')
            post.engagement_rate = scraped_data.get('engagement_rate')
            post.video_duration = scraped_data.get('video_duration')
            post.published_at = scraped_data.get('published_at')
            post.play_count = scraped_data.get('play_count')
            post.saves_count = scraped_data.get('saves_count')
            post.author_followers = scraped_data.get('author_followers')
            post.has_audio = scraped_data.get('has_audio')
            post.is_video = scraped_data.get('is_video')
            post.save(update_fields=[
                'original_text', 'transcript', 'platform',
                'views_count', 'likes_count', 'comments_count', 'shares_count',
                'engagement_rate', 'video_duration', 'published_at',
                'play_count', 'saves_count', 'author_followers', 'has_audio', 'is_video',
                'updated_at'
            ])

        logger.info(f"Successfully scraped post {post_id}")
        process_post.delay(post_id)

    except Exception as e:
        logger.error(f"Scraping failed for post {post_id}: {e}", exc_info=True)
        with transaction.atomic():
            post.status = 'error'
            post.error_message = f'Ошибка парсинга: {str(e)}'
            post.save(update_fields=['status', 'error_message', 'updated_at'])
        return


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 5},
    retry_backoff=True,
)
def process_post(self, post_id: int):
    """
    Обрабатывает текст поста через LLM с использованием дефолтных промптов.
    Для каждого типа (caption, script, title, description) ищет промпт с is_default=True.
    Если дефолтный не найден - использует первый активный промпт этого типа.
    """
    try:
        post = Post.objects.select_related('workspace').get(id=post_id)
    except Post.DoesNotExist:
        return

    base_text = post.original_text or post.transcript or ''
    if not base_text:
        with transaction.atomic():
            post.status = 'error'
            post.error_message = 'No text for processing.'
            post.save(update_fields=['status', 'error_message', 'updated_at'])
        return

    prompt_type_to_field = {
        'caption': 'generated_caption',
        'script': 'generated_script',
        'title': 'generated_title',
        'description': 'generated_description',
    }

    try:
        with transaction.atomic():
            post.status = 'in_progress'
            post.save(update_fields=['status', 'updated_at'])

        all_prompts = Prompt.objects.filter(
            workspace=post.workspace,
            is_active=True,
        ).order_by('type', 'id')

        if not all_prompts.exists():
            logger.warning(f"No active prompts for post {post_id} workspace {post.workspace_id}")
            with transaction.atomic():
                post.status = 'ready'
                post.error_message = 'No active prompts in workspace.'
                post.save(update_fields=['status', 'error_message', 'updated_at'])
            return

        # First pass: take first active prompt per type as fallback
        selected_prompts = {}
        for prompt in all_prompts:
            if prompt.type not in selected_prompts:
                selected_prompts[prompt.type] = prompt

        # Second pass: override with default prompts (higher priority)
        default_prompts = Prompt.objects.filter(
            workspace=post.workspace,
            is_active=True,
            is_default=True,
        )
        for prompt in default_prompts:
            selected_prompts[prompt.type] = prompt

        update_fields = ['status', 'error_message', 'updated_at']
        processed_types = []
        for prompt_type, prompt in selected_prompts.items():
            field_name = prompt_type_to_field.get(prompt_type)
            if not field_name:
                continue

            try:
                generated = generate_caption(
                    prompt_text=prompt.content,
                    original_text=base_text
                )
                setattr(post, field_name, generated)
                update_fields.append(field_name)
                processed_types.append(prompt_type)
                logger.info(
                    f"Generated {prompt_type} for post {post_id} "
                    f"using prompt {prompt.id} ({'default' if prompt.is_default else 'fallback'})"
                )
            except Exception as prompt_error:
                logger.error(
                    f"Error generating {prompt_type} for post {post_id}: {prompt_error}",
                    exc_info=True
                )

        with transaction.atomic():
            post.status = 'ready'
            post.error_message = ''
            post.save(update_fields=update_fields)
            logger.info(
                f"Processed post {post_id} with {len(processed_types)} types: "
                f"{', '.join(processed_types)}"
            )

    except Exception as e:
        logger.error(f"LLM processing failed for post {post_id}: {e}", exc_info=True)
        with transaction.atomic():
            post.status = 'error'
            post.error_message = f'LLM error: {str(e)}'
            post.save(update_fields=['status', 'error_message', 'updated_at'])
        return


@shared_task
def scrape_competitor_posts():
    """
    Парсит посты от всех активных конкурентов.
    Запускается автоматически по расписанию через Celery Beat.
    Проверяет настройки системы перед выполнением.
    """
    from .models import CompetitorAccount, SystemSettings
    from django.utils import timezone
    
    # Проверяем настройки
    settings = SystemSettings.get_settings()
    
    # Обновляем время последней проверки
    settings.last_scraping_check = timezone.now()
    settings.save(update_fields=['last_scraping_check'])
    
    # Если автопарсинг выключен - ничего не делаем
    if not settings.auto_scraping_enabled:
        logger.info("Auto scraping is disabled in settings, skipping")
        return {
            'status': 'skipped',
            'reason': 'Auto scraping disabled',
        }
    
    # Проверяем текущее время
    now = timezone.localtime(timezone.now())
    current_hour = now.hour
    current_minute = now.minute
    
    # Проверка времени (с допуском ±5 минут для Celery Beat)
    time_diff = abs((current_hour * 60 + current_minute) - (settings.scraping_hour * 60 + settings.scraping_minute))
    if time_diff > 5:
        logger.info(f"Not the scheduled time. Current: {current_hour}:{current_minute:02d}, Scheduled: {settings.scraping_hour}:{settings.scraping_minute:02d}")
        return {
            'status': 'skipped',
            'reason': 'Not scheduled time',
            'current_time': f'{current_hour}:{current_minute:02d}',
            'scheduled_time': f'{settings.scraping_hour}:{settings.scraping_minute:02d}',
        }
    
    # Получаем активных конкурентов
    competitors = CompetitorAccount.objects.filter(is_active=True).select_related('workspace')
    
    if not competitors.exists():
        logger.info("No active competitors found")
        return {
            'status': 'success',
            'competitors_count': 0,
            'created_posts': 0,
        }
    
    created_posts = []
    errors = []
    
    for competitor in competitors:
        try:
            logger.info(f"Scraping posts for {competitor.platform} @{competitor.username}")
            
            scraped_data = scrape_content(competitor.url)
            
            post = Post.objects.create(
                workspace=competitor.workspace,
                title=f"{competitor.platform.upper()} - @{competitor.username}",
                source_url=competitor.url,
                platform=competitor.platform,
                status='new',
                original_text=scraped_data.get('caption', ''),
                transcript=scraped_data.get('transcript', ''),
                views_count=scraped_data.get('views_count'),
                likes_count=scraped_data.get('likes_count'),
                comments_count=scraped_data.get('comments_count'),
                shares_count=scraped_data.get('shares_count'),
                engagement_rate=scraped_data.get('engagement_rate'),
                video_duration=scraped_data.get('video_duration'),
                published_at=scraped_data.get('published_at'),
                play_count=scraped_data.get('play_count'),
                saves_count=scraped_data.get('saves_count'),
                author_followers=scraped_data.get('author_followers'),
                has_audio=scraped_data.get('has_audio', False),
                is_video=scraped_data.get('is_video', False),
            )
            
            competitor.last_scraped_at = timezone.now()
            competitor.save(update_fields=['last_scraped_at'])
            
            created_posts.append(post.id)
            logger.info(f"Created post #{post.id} from {competitor.username}")
            
        except Exception as e:
            error_msg = f"Failed to scrape {competitor.username}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            errors.append(error_msg)
    
    return {
        'status': 'success',
        'competitors_count': competitors.count(),
        'created_posts': len(created_posts),
        'post_ids': created_posts,
        'errors': errors,
    }


@shared_task
def scrape_single_competitor(competitor_id: int):
    """
    Парсит посты одного конкурента по ID.
    Используется для ручного запуска.
    """
    from .models import CompetitorAccount
    from django.utils import timezone
    
    try:
        competitor = CompetitorAccount.objects.select_related('workspace').get(id=competitor_id)
    except CompetitorAccount.DoesNotExist:
        logger.error(f"CompetitorAccount {competitor_id} not found")
        return
    
    if not competitor.is_active:
        logger.warning(f"CompetitorAccount {competitor_id} is not active, skipping")
        return
    
    try:
        logger.info(f"Scraping posts for {competitor.platform} @{competitor.username}")
        
        scraped_data = scrape_content(competitor.url)
        
        post = Post.objects.create(
            workspace=competitor.workspace,
            title=f"{competitor.platform.upper()} - @{competitor.username}",
            source_url=competitor.url,
            platform=competitor.platform,
            status='new',
            original_text=scraped_data.get('caption', ''),
            transcript=scraped_data.get('transcript', ''),
            views_count=scraped_data.get('views_count'),
            likes_count=scraped_data.get('likes_count'),
            comments_count=scraped_data.get('comments_count'),
            shares_count=scraped_data.get('shares_count'),
            engagement_rate=scraped_data.get('engagement_rate'),
            video_duration=scraped_data.get('video_duration'),
            published_at=scraped_data.get('published_at'),
            play_count=scraped_data.get('play_count'),
            saves_count=scraped_data.get('saves_count'),
            author_followers=scraped_data.get('author_followers'),
            has_audio=scraped_data.get('has_audio', False),
            is_video=scraped_data.get('is_video', False),
        )
        
        competitor.last_scraped_at = timezone.now()
        competitor.save(update_fields=['last_scraped_at'])
        
        logger.info(f"Created post #{post.id} from {competitor.username}")
        return post.id
        
    except Exception as e:
        logger.error(f"Failed to scrape {competitor.username}: {e}", exc_info=True)
        raise
