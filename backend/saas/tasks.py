from celery import shared_task
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import re
from .models import Post, Prompt, SystemSettings
from .llm import generate_caption
from .scraper import scrape_content
import logging

logger = logging.getLogger(__name__)


def _normalize_text(value):
    if value is None:
        return ''
    return str(value).strip()


def _choose_original_text(*candidates):
    for value in candidates:
        normalized = _normalize_text(value)
        if normalized:
            return normalized
    return ''


def _build_profile_post_title(platform: str, username: str, index: int, *text_candidates):
    preview = _choose_original_text(*text_candidates)
    if preview:
        one_line = re.sub(r'\s+', ' ', preview).strip()
        if len(one_line) > 80:
            one_line = one_line[:77].rstrip() + '...'
        return one_line
    return f"{platform.upper()} - @{username} #{index + 1}"


def _create_posts_from_competitor_scrape(competitor, scraped_data, max_items: int):
    if scraped_data.get('error'):
        raise RuntimeError(str(scraped_data.get('error')))

    created_post_ids = []
    platform = scraped_data.get('platform') or competitor.platform
    profile_items = scraped_data.get('posts') or []

    if profile_items and platform in ('instagram', 'tiktok', 'youtube', 'linkedin'):
        for i, item in enumerate(profile_items[:max_items]):
            if platform == 'instagram':
                item_data = item.get('data', {})
                description = item_data.get('description', '')
                caption = item_data.get('caption', '')
                transcript = item_data.get('transcript', '')
                title = _build_profile_post_title(
                    platform,
                    competitor.username,
                    i,
                    description,
                    caption,
                    transcript,
                )
                views = item.get('views')
                likes = item.get('likes')
                comments = item.get('comments')
                shares = None
                saves = None
                followers = None
                duration = item_data.get('video_duration')
                source_url = item.get('url') or competitor.url
            elif platform == 'tiktok':
                description = item.get('desc', '')
                caption = ''
                transcript = ''
                title = _build_profile_post_title(platform, competitor.username, i, description)
                views = item.get('views')
                likes = item.get('likes')
                comments = item.get('comments')
                shares = item.get('shares')
                saves = item.get('saves')
                followers = item.get('author_followers')
                duration = item.get('duration')
                source_url = item.get('url') or competitor.url
            elif platform == 'youtube':
                title = _build_profile_post_title(
                    platform,
                    competitor.username,
                    i,
                    item.get('title', ''),
                    item.get('description', ''),
                )
                description = item.get('description', '')
                caption = ''
                transcript = ''
                views = item.get('views')
                likes = item.get('likes')
                comments = item.get('comments')
                shares = None
                saves = None
                followers = None
                duration = item.get('duration')
                source_url = item.get('url') or competitor.url
            else:
                title = _build_profile_post_title(
                    platform,
                    competitor.username,
                    i,
                    item.get('title', ''),
                    item.get('description', ''),
                )
                description = item.get('description', '')
                caption = ''
                transcript = ''
                views = None
                likes = item.get('likes')
                comments = item.get('comments')
                shares = None
                saves = None
                followers = None
                duration = None
                source_url = item.get('url') or competitor.url

            post = Post.objects.create(
                workspace=competitor.workspace,
                title=title,
                source_url=source_url,
                platform=platform,
                status='new',
                original_text=_normalize_text(transcript),
                description=_choose_original_text(description, caption, transcript),
                transcript=_normalize_text(transcript),
                views_count=views,
                likes_count=likes,
                comments_count=comments,
                shares_count=shares,
                engagement_rate=None,
                video_duration=duration,
                published_at=None,
                play_count=None,
                saves_count=saves,
                author_followers=followers,
                has_audio=platform in ('instagram', 'tiktok', 'youtube'),
                is_video=platform in ('instagram', 'tiktok', 'youtube'),
            )
            created_post_ids.append(post.id)
        return created_post_ids

    post = Post.objects.create(
        workspace=competitor.workspace,
        title=f"{competitor.platform.upper()} - @{competitor.username}",
        source_url=competitor.url,
        platform=competitor.platform,
        status='new',
        original_text=_normalize_text(scraped_data.get('transcript', '')),
        description=_choose_original_text(
            scraped_data.get('description', ''),
            scraped_data.get('caption', ''),
            scraped_data.get('transcript', ''),
        ),
        transcript=_normalize_text(scraped_data.get('transcript', '')),
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
    return [post.id]


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
            
            for i, item in enumerate(profile.get('posts', [])[:sys_settings.max_parse_depth]):  # лимит из настроек
                # Данные зависят от платформы
                if platform == 'instagram':
                    item_data = item.get('data', {})
                    title = f"{profile.get('handle', '')} - Reel #{i+1}"
                    caption = item_data.get('caption', '')
                    description = item_data.get('description', '')
                    transcript = item_data.get('transcript', '')
                    original_text = _normalize_text(transcript)
                    description = _choose_original_text(description, caption, transcript)
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                elif platform == 'tiktok':
                    title = f"{profile.get('handle', '')} - Video #{i+1}"
                    description = item.get('desc', '')
                    transcript = ''
                    original_text = _normalize_text(transcript)
                    description = _choose_original_text(description, transcript)
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                elif platform == 'youtube':
                    title = item.get('title', '') or f"{profile.get('handle', '')} - Video #{i+1}"
                    description = item.get('description', '')
                    transcript = ''
                    original_text = _normalize_text(transcript)
                    description = _choose_original_text(description, transcript)
                    views = item.get('views')
                    likes = item.get('likes')
                    comments = item.get('comments')
                else:  # linkedin
                    title = item.get('title', '') or f"{profile.get('handle', '')} - Post #{i+1}"
                    description = item.get('description', '')
                    transcript = ''
                    original_text = _normalize_text(transcript)
                    description = _choose_original_text(description, transcript)
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
                    description=description,
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
        caption = scraped_data.get('caption', '')
        description = scraped_data.get('description', '')
        transcript = scraped_data.get('transcript', '')
        original_text = _normalize_text(transcript)
        normalized_description = _choose_original_text(description, caption)

        with transaction.atomic():
            post.original_text = original_text
            post.description = normalized_description
            post.transcript = _normalize_text(transcript)
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
                'original_text', 'description', 'transcript', 'platform',
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

    base_text = _choose_original_text(post.original_text, post.description, post.transcript)
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
        'original': 'generated_original',
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
            
            scraped_data = scrape_content(competitor.url, max_items=settings.max_parse_depth)
            post_ids = _create_posts_from_competitor_scrape(
                competitor=competitor,
                scraped_data=scraped_data,
                max_items=settings.max_parse_depth,
            )
            
            competitor.last_scraped_at = timezone.now()
            competitor.save(update_fields=['last_scraped_at'])
            
            created_posts.extend(post_ids)
            logger.info(f"Created {len(post_ids)} post(s) from {competitor.username}")
            
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
def run_workspace_auto_scraping():
    """Run auto-scraping for workspaces whose schedule matches the current minute."""
    from .models import CompetitorAccount, SystemSettings, Workspace

    system_settings = SystemSettings.get_settings()
    now = timezone.localtime(timezone.now())

    workspaces = Workspace.objects.filter(
        auto_scraping_enabled=True,
        competitor_accounts__is_active=True,
    ).distinct().order_by('id')

    if not workspaces.exists():
        logger.info("No workspaces with enabled auto-scraping")
        return {
            'status': 'skipped',
            'reason': 'No workspaces with enabled auto-scraping',
        }

    workspace_results = []
    created_posts = []
    errors = []

    for workspace in workspaces:
        if workspace.scraping_hour != now.hour or workspace.scraping_minute != now.minute:
            continue

        last_auto_scrape = workspace.last_auto_scrape_at
        if last_auto_scrape:
            last_local = timezone.localtime(last_auto_scrape)
            if (
                last_local.year == now.year and
                last_local.month == now.month and
                last_local.day == now.day and
                last_local.hour == now.hour and
                last_local.minute == now.minute
            ):
                logger.info("Workspace %s already auto-scraped at %s", workspace.id, last_local)
                continue

        competitors = list(
            CompetitorAccount.objects.filter(
                workspace=workspace,
                is_active=True,
            ).select_related('workspace')
        )

        if not competitors:
            workspace_results.append({
                'workspace_id': workspace.id,
                'workspace_name': workspace.name,
                'status': 'skipped',
                'reason': 'No active competitors',
            })
            continue

        Workspace.objects.filter(pk=workspace.pk).update(last_auto_scrape_at=timezone.now())

        workspace_post_ids = []
        workspace_errors = []
        for competitor in competitors:
            try:
                logger.info(
                    "Auto scraping posts for workspace %s: %s @%s",
                    workspace.id,
                    competitor.platform,
                    competitor.username,
                )
                scraped_data = scrape_content(
                    competitor.url,
                    max_items=system_settings.max_parse_depth,
                )
                post_ids = _create_posts_from_competitor_scrape(
                    competitor=competitor,
                    scraped_data=scraped_data,
                    max_items=system_settings.max_parse_depth,
                )
                competitor.last_scraped_at = timezone.now()
                competitor.save(update_fields=['last_scraped_at'])
                workspace_post_ids.extend(post_ids)
                created_posts.extend(post_ids)
            except Exception as exc:
                error_msg = f"Workspace {workspace.id} / {competitor.username}: {exc}"
                logger.error(error_msg, exc_info=True)
                workspace_errors.append(error_msg)
                errors.append(error_msg)

        workspace_results.append({
            'workspace_id': workspace.id,
            'workspace_name': workspace.name,
            'status': 'success' if not workspace_errors else 'partial',
            'competitors_count': len(competitors),
            'created_posts': len(workspace_post_ids),
            'post_ids': workspace_post_ids,
            'errors': workspace_errors,
        })

    if not workspace_results:
        logger.info("No workspaces matched the current auto-scrape minute")
        return {
            'status': 'skipped',
            'reason': 'No workspaces matched the current schedule',
            'current_time': f'{now.hour}:{now.minute:02d}',
        }

    return {
        'status': 'success' if not errors else 'partial',
        'workspace_results': workspace_results,
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
    from .models import CompetitorAccount, SystemSettings
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
        
        settings = SystemSettings.get_settings()
        scraped_data = scrape_content(competitor.url, max_items=settings.max_parse_depth)
        post_ids = _create_posts_from_competitor_scrape(
            competitor=competitor,
            scraped_data=scraped_data,
            max_items=settings.max_parse_depth,
        )
        
        competitor.last_scraped_at = timezone.now()
        competitor.save(update_fields=['last_scraped_at'])
        
        logger.info(f"Created {len(post_ids)} post(s) from {competitor.username}")
        return post_ids[0] if post_ids else None
        
    except Exception as e:
        logger.error(f"Failed to scrape {competitor.username}: {e}", exc_info=True)
        raise
