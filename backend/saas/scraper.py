"""
Модуль для парсинга контента из социальных сетей через ScrapeCreators API.
"""
import os
import logging
import requests
from typing import Dict, Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Singleton session для переиспользования соединений
_session: Optional[requests.Session] = None


def get_session() -> requests.Session:
    """Возвращает глобальную HTTP-сессию."""
    global _session
    if _session is None:
        _session = requests.Session()
        api_key = os.getenv('SCRAPECREATORS_API_KEY')
        if not api_key:
            logger.warning("SCRAPECREATORS_API_KEY не настроен - используется режим заглушки")
            return _session
        
        # ScrapeCreators использует заголовок x-api-key
        _session.headers.update({
            'x-api-key': api_key,
        })
    return _session


def detect_platform(url: str) -> str:
    """Определяет платформу по URL."""
    parsed = urlparse(url.lower())
    domain = parsed.netloc
    
    if 'instagram.com' in domain or 'instagr.am' in domain:
        return 'instagram'
    elif 'tiktok.com' in domain:
        return 'tiktok'
    elif 'youtube.com' in domain or 'youtu.be' in domain:
        return 'youtube'
    elif 'linkedin.com' in domain:
        return 'linkedin'
    else:
        return 'unknown'


def scrape_content(url: str) -> Dict[str, str]:
    """
    Парсит контент с Instagram/TikTok/YouTube через ScrapeCreators API.
    
    Args:
        url: URL поста для парсинга
        
    Returns:
        Dict с полями:
        - caption: Описание/текст поста
        - transcript: Расшифровка видео (если есть)
        - media_url: URL медиафайла
        - author: Имя автора
        - platform: Определенная платформа
        
    Raises:
        RuntimeError: Если парсинг не удался
    """
    api_key = os.getenv('SCRAPECREATORS_API_KEY')
    api_base = os.getenv('SCRAPECREATORS_API_BASE', 'https://api.scrapecreators.com')
    # Normalize base URL: remove trailing slash and trailing '/v1' if user provided full path
    api_base = api_base.rstrip('/')
    if api_base.endswith('/v1'):
        api_base = api_base[:-3]  # strip trailing '/v1' so endpoints always built as <base>/v1/...

    use_mock = os.getenv('SCRAPECREATORS_USE_MOCK', 'false').lower() == 'true'
    platform = detect_platform(url)
    
    logger.info(f"Parsing content from {platform}: {url}")
    
    # РЕЖИМ ЗАГЛУШКИ: если нет API ключа ИЛИ включён режим мока
    if not api_key or use_mock:
        logger.warning("API ключ не настроен или включён режим мока - используются тестовые данные")
        return {
            'caption': f'Тестовый контент с {platform} | URL: {url[:50]}...',
            'transcript': 'Тестовая расшифровка видео для демонстрации функционала',
            'media_url': url,
            'author': f'test_user_{platform}',
            'platform': platform,
            'views_count': 125000,
            'likes_count': 8500,
            'comments_count': 320,
            'shares_count': 1200,
            'play_count': 145000,
            'saves_count': 2100,
            'author_followers': 45000,
            'engagement_rate': 9.6,
            'video_duration': 45,
            'published_at': None,
            'has_audio': True,
            'is_video': True,
        }
    
    try:
        session = get_session()
        
        # Правильные эндпоинты для каждой платформы
        platform_endpoints = {
            'instagram': [f"{api_base}/v1/instagram/reel", f"{api_base}/v1/instagram/post"],  # Пробуем reel, потом post
            'tiktok': [f"{api_base}/v2/tiktok/video"], 
            'youtube': [f"{api_base}/v1/youtube/video"],
            'linkedin': [f"{api_base}/v1/linkedin/post"],
        }
        
        endpoints = platform_endpoints.get(platform)
        if not endpoints:
            raise RuntimeError(f"Платформа {platform} не поддерживается")
        
        # Параметры запроса - передаем URL поста
        params = {'url': url}
        
        # Пробуем эндпоинты по очереди (для Instagram: reel, затем post)
        last_error = None
        data = None
        
        for endpoint in endpoints:
            try:
                logger.info(f"Trying API: {endpoint} with params: {params}")
                response = session.get(endpoint, params=params, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                logger.info(f"✓ Success! API response keys: {data.keys() if isinstance(data, dict) else 'not a dict'}")
                break  # Успешно получили данные
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout for endpoint {endpoint}")
                last_error = RuntimeError(f"Превышено время ожидания ответа от {platform}")
                continue
            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if hasattr(e, 'response') and e.response else None
                resp_text = e.response.text if hasattr(e, 'response') and e.response else ''

                if status_code == 404:
                    last_error = RuntimeError(f"Контент не найден или недоступен (404) — {resp_text}")
                elif status_code == 403:
                    last_error = RuntimeError(f"Доступ запрещён - возможно приватный аккаунт (403) — {resp_text}")
                elif status_code == 429:
                    last_error = RuntimeError(f"Превышен лимит запросов к API (429) — {resp_text}")
                else:
                    last_error = RuntimeError(f"Ошибка API: {status_code} - {resp_text}")

                logger.warning(f"Endpoint {endpoint} failed: {last_error}, trying next...")
                continue
            except requests.exceptions.RequestException as e:
                last_error = RuntimeError(f"Ошибка сети: {str(e)}")
                logger.warning(f"Endpoint {endpoint} network error: {e}")
                continue
        
        if data is None:
            # Все эндпоинты не сработали
            raise last_error if last_error else RuntimeError("Все эндпоинты не сработали")
        
        # Маппинг полей ответа от ScrapeCreators
        # API возвращает data.xdt_shortcode_media с полной информацией
        media_data = data.get('data', {}).get('xdt_shortcode_media', {})
        
        # Извлекаем caption из вложенной структуры
        caption_edges = media_data.get('edge_media_to_caption', {}).get('edges', [])
        caption_text = ''
        if caption_edges and len(caption_edges) > 0:
            caption_text = caption_edges[0].get('node', {}).get('text', '')
        
        # Извлекаем автора
        owner = media_data.get('owner', {})
        author = owner.get('username', 'unknown')
        
        # Извлекаем метрики вирусности
        views_count = media_data.get('video_view_count')  # Для Instagram Reels
        
        # Лайки
        likes_edge = media_data.get('edge_media_preview_like', {})
        likes_count = likes_edge.get('count', 0)
        
        # Комментарии - добавляем детальное логирование
        comments_edge = media_data.get('edge_media_to_comment', {})
        comments_count = comments_edge.get('count', 0)
        
        # Отладочное логирование для комментариев
        logger.info(f"Comments structure: {comments_edge}")
        
        # Альтернативные способы получения комментариев
        if comments_count == 0:
            # Проверяем другие возможные поля
            alt_comments = media_data.get('comment_count') or media_data.get('comments_count')
            if alt_comments:
                comments_count = alt_comments
                logger.info(f"Found alternative comments field: {alt_comments}")
            
            # Проверяем edge_media_preview_comment
            preview_comments = media_data.get('edge_media_preview_comment', {})
            if preview_comments.get('count'):
                comments_count = preview_comments.get('count')
                logger.info(f"Found preview comments: {comments_count}")
        
        logger.info(f"Final comments count: {comments_count}")
        
        # Репосты (не всегда доступно в Instagram API)
        shares_count = media_data.get('share_count')
        
        # Длительность видео
        video_duration = media_data.get('video_duration')
        
        # Дата публикации (Unix timestamp)
        taken_at = media_data.get('taken_at_timestamp')
        from datetime import datetime
        published_at = datetime.fromtimestamp(taken_at) if taken_at else None
        
        # Дополнительные метрики
        play_count = media_data.get('video_play_count')  # Воспроизведения (часто больше чем просмотры)
        
        # Сохранения
        saves_edge = media_data.get('edge_media_saved', {})
        saves_count = saves_edge.get('count') if saves_edge else None
        
        # Подписчики автора
        author_followers = owner.get('edge_followed_by', {}).get('count')
        
        # Тип контента
        has_audio = media_data.get('has_audio')
        is_video = media_data.get('is_video')
        
        # Вычисляем engagement rate если есть просмотры
        engagement_rate = None
        if views_count and views_count > 0:
            total_engagement = (likes_count or 0) + (comments_count or 0) + (shares_count or 0)
            engagement_rate = round((total_engagement / views_count) * 100, 2)
        
        return {
            'caption': caption_text or data.get('caption') or data.get('description') or data.get('text', ''),
            'transcript': data.get('transcript', ''),  # Для видео может быть отдельно
            'media_url': media_data.get('video_url') or media_data.get('display_url') or url,
            'author': author,
            'platform': platform,
            # Метрики
            'views_count': views_count,
            'likes_count': likes_count,
            'comments_count': comments_count,
            'shares_count': shares_count,
            'engagement_rate': engagement_rate,
            'video_duration': video_duration,
            'published_at': published_at,
            # Дополнительные метрики
            'play_count': play_count,
            'saves_count': saves_count,
            'author_followers': author_followers,
            'has_audio': has_audio,
            'is_video': is_video,
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"ScrapeCreators API error: {e}")
        raise RuntimeError(f"Не удалось распарсить контент: {str(e)}")
