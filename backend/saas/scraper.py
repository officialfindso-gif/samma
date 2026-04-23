"""
Модуль для парсинга контента из социальных сетей через ScrapeCreators API.
Поддерживает как отдельные посты, так и профили (все Reels/видео).
"""
import os
import logging
import re
import time
import requests
from typing import Dict, Optional, List
from urllib.parse import urlparse
from dotenv import load_dotenv
from pathlib import Path

# Импорты для транскрибации
import yt_dlp
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

logger = logging.getLogger(__name__)

_session: Optional[requests.Session] = None


def transcribe_media_audio(url: str, platform: str = 'unknown') -> Optional[str]:
    """
    Скачивает видео/аудио (YouTube, Instagram, TikTok) и отправляет в Whisper.
    """
    logger.info(f"Starting audio transcription for {platform}: {url}")
    output_file = f"temp_media_{platform}"
    
    # Опции для yt-dlp
    ydl_opts = {
        'format': 'bestaudio/best' if platform == 'youtube' else 'bestvideo+bestaudio/best',
        'outtmpl': output_file + '.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'merge_output_format': 'mp4', # Для Instagram лучше иметь контейнер
    }

    try:
        # 1. Скачиваем медиа
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Проверка существования файла (иногда расширение меняется)
            if not os.path.exists(filename):
                import glob
                files = glob.glob(f"{output_file}.*")
                if files:
                    filename = files[0]
                else:
                    raise FileNotFoundError("Media file not found after download")
        
        logger.info(f"Media downloaded to: {filename} ({os.path.getsize(filename) / 1024 / 1024:.2f} MB)")

        # 2. Отправляем в OpenAI Whisper (поддерживает и видео, и аудио)
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        with open(filename, "rb") as media_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=media_file
            )
        
        logger.info("Transcription successful!")
        return transcript.text

    except Exception as e:
        logger.error(f"Transcription failed for {platform}: {e}")
        return None
    finally:
        # 3. Чистим за собой
        try:
            if os.path.exists(output_file):
                os.remove(output_file)
            import glob
            for f in glob.glob(f"{output_file}.*"):
                os.remove(f)
        except Exception:
            pass


def _maybe_transcribe_when_empty(caption: str, url: str, platform: str) -> str:
    """
    Если caption пустой, пробуем Whisper и возвращаем транскрипт как caption.
    Ошибки не пробрасываем, возвращаем исходный caption при сбое.
    """
    if caption:
        return caption
    transcript = transcribe_media_audio(url, platform)
    return transcript or caption


class ScrapeError(Exception):
    """Ошибка парсинга с типом для обработки"""
    def __init__(self, message: str, error_type: str = "unknown"):
        super().__init__(message)
        self.error_type = error_type  # client, transient, rate_limit
        self.is_retryable = error_type in ('transient', 'rate_limit')


def get_session() -> requests.Session:
    global _session
    if _session is None:
        _session = requests.Session()
        api_key = os.getenv('SCRAPECREATORS_API_KEY')
        if not api_key:
            logger.warning("SCRAPECREATORS_API_KEY не настроен")
            return _session
        _session.headers.update({'x-api-key': api_key})
    return _session


def _parse_duration(duration_str: str) -> Optional[int]:
    if not duration_str:
        return None
    parts = duration_str.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return None


def detect_platform(url: str) -> str:
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
    return 'unknown'


def is_profile_url(url: str, platform: str) -> bool:
    """Определяет, является ли URL профилем (а не отдельным постом)"""
    if platform == 'instagram':
        return bool(re.search(r'instagram\.com/[a-zA-Z0-9_.]+/?$', url)) and not re.search(r'/p/|/reel/|/stories/', url)
    elif platform == 'tiktok':
        return bool(re.search(r'tiktok\.com/@[\w.]+/?$', url)) and '/video/' not in url
    elif platform == 'youtube':
        return bool(re.search(r'youtube\.com/(@[\w.]+|channel/|c/)', url)) and 'watch?v=' not in url and '/shorts/' not in url
    elif platform == 'linkedin':
        return bool(re.search(r'linkedin\.com/in/', url)) and '/posts/' not in url
    return False


def scrape_content(url: str, max_items: int = 10, user=None) -> Dict:
    """
    Парсит контент через ScrapeCreators API.
    Поддерживает как отдельные посты, так и профили (все Reels/видео).
    
    Args:
        url: URL поста или профиля
        max_items: Максимальное количество элементов для парсинга из профиля (по умолчанию 10)
    """
    api_key = os.getenv('SCRAPECREATORS_API_KEY')
    api_base = os.getenv('SCRAPECREATORS_API_BASE', 'https://api.scrapecreators.com/v1')
    api_base = api_base.rstrip('/')
    if not api_base.endswith('/v1'):
        api_base = api_base + '/v1'

    use_mock = os.getenv('SCRAPECREATORS_USE_MOCK', 'false').lower() == 'true'
    platform = detect_platform(url)
    is_profile = is_profile_url(url, platform)
    
    logger.info(f"Parsing {'profile' if is_profile else 'post'} from {platform}: {url}")

    if not api_key or use_mock:
        logger.warning("API ключ не настроен или включён режим мока")
        return {
            'caption': f'Тестовый контент с {platform} | URL: {url[:50]}...',
            'description': f'Тестовый контент с {platform} | URL: {url[:50]}...',
            'transcript': 'Тестовая расшифровка',
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

    if is_profile:
        return _scrape_profile(url, platform, api_base, max_items)
    return _scrape_single_post(url, platform, api_base, user=user)


def _scrape_profile(url: str, platform: str, api_base: str, max_items: int) -> Dict:
    """Скрапит все Reels/видео из профиля"""
    session = get_session()
    if platform == 'instagram':
        return _scrape_instagram_profile(session, url, api_base, max_items)
    elif platform == 'tiktok':
        return _scrape_tiktok_profile(session, url, max_items)
    elif platform == 'youtube':
        return _scrape_youtube_profile(session, url, api_base, max_items)
    elif platform == 'linkedin':
        return _scrape_linkedin_profile(session, url, api_base, max_items)
    return {'error': f'Профили {platform} пока не поддерживаются'}


def _scrape_instagram_profile(session: requests.Session, url: str, api_base: str, max_items: int) -> Dict:
    """Выкачивает все Reels из Instagram профиля с пагинацией"""
    match = re.search(r'instagram\.com/([a-zA-Z0-9_.]+)', url)
    if not match:
        return {'error': 'Не удалось извлечь username'}
    
    handle = match.group(1)
    logger.info(f"Scraping Instagram profile @{handle}")
    
    all_reels = []
    max_id = None
    page = 0
    
    while len(all_reels) < max_items:
        params = {'handle': handle}
        if max_id:
            params['max_id'] = max_id
        
        try:
            resp = session.get(f"{api_base}/instagram/user/reels", params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            items = data.get('items', [])
            if not items:
                break
            
            for item in items:
                if len(all_reels) >= max_items:
                    break
                media = item.get('media', {})
                reel_url = media.get('url', '')
                reel_code = media.get('code', '')
                
                if reel_url:
                    try:
                        detail_resp = session.get(f"{api_base}/instagram/post", params={'url': reel_url}, timeout=30)
                        detail_resp.raise_for_status()
                        detail_data = detail_resp.json()
                        all_reels.append({
                            'url': reel_url,
                            'code': reel_code,
                            'data': detail_data,
                            'views': media.get('play_count'),
                            'likes': media.get('like_count'),
                            'comments': media.get('comment_count'),
                        })
                        time.sleep(0.5)
                    except Exception as e:
                        logger.warning(f"Failed reel {reel_code}: {e}")
                        all_reels.append({
                            'url': reel_url, 'code': reel_code, 'data': {},
                            'views': media.get('play_count'),
                            'likes': media.get('like_count'),
                            'comments': media.get('comment_count'),
                        })
            
            paging = data.get('paging_info', {})
            if paging.get('more_available'):
                max_id = paging.get('max_id')
                page += 1
                logger.info(f"Page {page}: {len(items)} reels, total: {len(all_reels)}")
            else:
                break
        except requests.exceptions.RequestException as e:
            logger.error(f"Error page {page}: {e}")
            break
    
    logger.info(f"Profile @{handle}: {len(all_reels)} reels total")
    return {
        'platform': 'instagram',
        'profile_url': url,
        'handle': handle,
        'reels_count': len(all_reels),
        'posts': all_reels,
    }


def _scrape_tiktok_profile(session: requests.Session, url: str, max_items: int) -> Dict:
    """Выкачивает все видео из TikTok профиля с пагинацией (v3 API)"""
    match = re.search(r'tiktok\.com/@([a-zA-Z0-9_.]+)', url)
    if not match:
        return {'error': 'Не удалось извлечь username'}
    
    handle = match.group(1)
    logger.info(f"Scraping TikTok profile @{handle}")
    
    all_videos = []
    max_cursor = None
    page = 0
    
    while len(all_videos) < max_items:
        params = {'handle': handle}
        if max_cursor is not None:
            params['max_cursor'] = str(max_cursor)
        
        try:
            resp = session.get("https://api.scrapecreators.com/v3/tiktok/profile/videos", params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            aweme_list = data.get('aweme_list', [])
            if not aweme_list:
                break
            
            for aweme in aweme_list:
                if len(all_videos) >= max_items:
                    break
                
                aweme_id = aweme.get('aweme_id', '')
                desc = aweme.get('desc', '')
                stats = aweme.get('statistics', {})
                video = aweme.get('video', {})
                author = aweme.get('author', {})
                
                # Ссылка на видео
                video_urls = video.get('play_addr', {}).get('url_list', [])
                video_url = video_urls[0] if video_urls else ''
                
                # Ссылка на TikTok
                tiktok_url = f"https://www.tiktok.com/@{handle}/video/{aweme_id}"
                
                all_videos.append({
                    'url': tiktok_url,
                    'aweme_id': aweme_id,
                    'desc': desc,
                    'views': stats.get('play_count'),
                    'likes': stats.get('digg_count'),
                    'comments': stats.get('comment_count'),
                    'shares': stats.get('share_count'),
                    'saves': stats.get('collect_count'),
                    'duration': video.get('duration'),  # в мс
                    'author_followers': author.get('follower_count'),
                })
                
                time.sleep(0.3)
            
            has_more = data.get('has_more', 0)
            if has_more == 1:
                max_cursor = data.get('max_cursor')
                page += 1
                logger.info(f"Page {page}: {len(aweme_list)} videos, total: {len(all_videos)}")
            else:
                break
        except requests.exceptions.RequestException as e:
            logger.error(f"Error page {page}: {e}")
            break
    
    logger.info(f"Profile @{handle}: {len(all_videos)} videos total")
    return {
        'platform': 'tiktok',
        'profile_url': url,
        'handle': handle,
        'videos_count': len(all_videos),
        'posts': all_videos,
    }


def _scrape_youtube_profile(session: requests.Session, url: str, api_base: str, max_items: int) -> Dict:
    """Выкачивает все видео из YouTube канала с пагинацией"""
    # Извлекаем handle или channelId из URL
    match = re.search(r'youtube\.com/(@[\w.]+|channel/([a-zA-Z0-9_-]+)|c/([\w.]+))', url)
    if not match:
        return {'error': 'Не удалось извлечь handle/channelId'}
    
    handle = match.group(1).lstrip('@') if match.group(1) else match.group(2) or match.group(3)
    logger.info(f"Scraping YouTube channel @{handle}")
    
    all_videos = []
    continuation_token = None
    page = 0
    
    while len(all_videos) < max_items:
        params = {'handle': f'@{handle}', 'includeExtras': 'false'}
        if continuation_token:
            params['continuationToken'] = continuation_token
        
        try:
            resp = session.get(f"{api_base}/youtube/channel-videos", params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            
            videos = data.get('videos', [])
            if not videos:
                break
            
            for video in videos:
                if len(all_videos) >= max_items:
                    break
                
                video_id = video.get('id', '')
                video_url = video.get('url', '')
                title = video.get('title', '')
                description = video.get('description', '')
                view_count = video.get('viewCountInt')
                published_time = video.get('publishedTime')
                length_seconds = video.get('lengthSeconds')
                
                # Получаем детали видео через отдельный endpoint для лайков/комментов
                likes_count = None
                comments_count = None
                if video_url:
                    try:
                        detail_resp = session.get(f"{api_base}/youtube/video", params={'url': video_url}, timeout=30)
                        detail_resp.raise_for_status()
                        detail_data = detail_resp.json()
                        likes_count = detail_data.get('likeCountInt')
                        comments_count = detail_data.get('commentCountInt')
                        time.sleep(0.5)
                    except Exception as e:
                        logger.warning(f"Failed to get video details {video_id}: {e}")
                
                all_videos.append({
                    'url': video_url,
                    'video_id': video_id,
                    'title': title,
                    'description': description,
                    'views': view_count,
                    'likes': likes_count,
                    'comments': comments_count,
                    'duration': length_seconds,
                    'published': published_time,
                })
            
            continuation_token = data.get('continuationToken')
            if continuation_token:
                page += 1
                logger.info(f"Page {page}: {len(videos)} videos, total: {len(all_videos)}")
            else:
                break
        except requests.exceptions.RequestException as e:
            logger.error(f"Error page {page}: {e}")
            break
    
    logger.info(f"Channel @{handle}: {len(all_videos)} videos total")
    return {
        'platform': 'youtube',
        'profile_url': url,
        'handle': handle,
        'videos_count': len(all_videos),
        'posts': all_videos,
    }


def _scrape_linkedin_profile(session: requests.Session, url: str, api_base: str, max_items: int) -> Dict:
    """Выкачивает посты из LinkedIn профиля"""
    logger.info(f"Scraping LinkedIn profile: {url}")
    
    try:
        resp = session.get(f"{api_base}/linkedin/profile", params={'url': url}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        recent_posts = data.get('recentPosts', []) or data.get('activity', [])
        if not recent_posts:
            return {'error': 'No posts found in profile'}
        
        all_posts = []
        for i, post in enumerate(recent_posts[:max_items]):
            post_url = post.get('link', '')
            post_title = post.get('title', '') or post.get('headline', '')
            
            # Получаем детали поста через отдельный endpoint
            likes_count = None
            comments_count = None
            description = ''
            if post_url:
                try:
                    detail_resp = session.get(f"{api_base}/linkedin/post", params={'url': post_url}, timeout=30)
                    detail_resp.raise_for_status()
                    detail_data = detail_resp.json()
                    likes_count = detail_data.get('likeCount')
                    comments_count = detail_data.get('commentCount')
                    description = detail_data.get('description', '') or detail_data.get('text', '')
                    time.sleep(0.5)
                except Exception as e:
                    logger.warning(f"Failed to get post details: {e}")
            
            all_posts.append({
                'url': post_url,
                'title': post_title,
                'description': description,
                'likes': likes_count,
                'comments': comments_count,
            })
        
        logger.info(f"LinkedIn profile: {len(all_posts)} posts scraped")
        return {
            'platform': 'linkedin',
            'profile_url': url,
            'handle': data.get('name', ''),
            'posts_count': len(all_posts),
            'posts': all_posts,
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Error scraping LinkedIn profile: {e}")
        return {'error': str(e)}


def _scrape_single_post(url: str, platform: str, api_base: str, user=None, max_retries: int = 3) -> Dict:
    """Скрапит один пост с логированием вызова API и автоповтором при ошибках"""
    session = get_session()
    base_v1 = api_base
    platform_endpoints = {
        'instagram': [f"{base_v1}/instagram/post"],
        'tiktok': ["https://api.scrapecreators.com/v2/tiktok/video"],
        'youtube': [f"{base_v1}/youtube/video"],
        'linkedin': [f"{base_v1}/linkedin/post"],
    }

    endpoints = platform_endpoints.get(platform)
    if not endpoints:
        raise RuntimeError(f"Платформа {platform} не поддерживается")

    params = {'url': url}
    last_error = None
    data = None
    success = False

    for attempt in range(max_retries):
        for endpoint in endpoints:
            try:
                if attempt > 0:
                    import time
                    # Exponential backoff: 2s, 4s, 8s
                    wait_time = 2 ** attempt
                    logger.info(f"Retry attempt {attempt + 1}/{max_retries}, waiting {wait_time}s...")
                    time.sleep(wait_time)

                logger.info(f"API: {endpoint} (attempt {attempt + 1})")
                response = session.get(endpoint, params=params, timeout=60)
                
                # 429 — Too Many Requests: нужно ждать дольше
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 30))
                    last_error = RuntimeError(f"Rate limited. Retry after {retry_after}s")
                    import time
                    time.sleep(min(retry_after, 60))
                    continue  # Попробовать следующий endpoint или повторить
                
                response.raise_for_status()
                data = response.json()
                success = True
                break
            except requests.exceptions.HTTPError as e:
                sc = e.response.status_code if e.response else None
                txt = e.response.text[:200] if e.response else ''
                
                # 5xx — серверные ошибки, можно повторить
                if sc and 500 <= sc < 600:
                    last_error = RuntimeError(f"Server error {sc}: {txt}")
                    continue  # Попробовать следующий endpoint
                
                # 4xx кроме 429 — клиентские ошибки, не повторять
                last_error = RuntimeError(f"Client error {sc or 'err'}: {txt}")
                break  # Не повторять при клиентских ошибках
            except requests.exceptions.RequestException as e:
                last_error = RuntimeError(f"Network error: {e}")
                continue  # Сетевые ошибки — можно повторить
        
        if success:
            break
        
        # Если все эндпоинты упали с retryable ошибкой — ждём и повторяем
        if last_error and not str(last_error).startswith("Client error"):
            continue

    # Логируем вызов API
    try:
        from .models import ApiCallLog
        ApiCallLog.objects.create(
            user=user,
            platform=platform,
            url=url,
            success=success,
            error_message=str(last_error) if last_error else '',
        )
    except Exception:
        pass  # Не ломаем скрапинг из-за логирования

    if data is None:
        error_type = "client"
        if last_error:
            err_str = str(last_error)
            if "Rate limited" in err_str:
                error_type = "rate_limit"
            elif "Server error" in err_str or "Network error" in err_str:
                error_type = "transient"
        
        raise ScrapeError(str(last_error), error_type=error_type)

    # Маппинг полей ответа
    media_data = data.get('data', {}).get('xdt_shortcode_media', {})

    if platform == 'youtube' and 'title' in data:
        caption_text = data.get('description', '')

        # 🚀 Если описания нет — пробуем транскрибировать аудио
        caption_text = _maybe_transcribe_when_empty(caption_text, url, 'youtube')
        
        author = data.get('channel', {}).get('handle', data.get('channel', {}).get('title', 'unknown'))
        views_count = data.get('viewCountInt')
        likes_count = data.get('likeCountInt')
        comments_count = data.get('commentCountInt')
        shares_count = data.get('shareCountInt')
        video_duration = _parse_duration(data.get('durationText', ''))
        published_at = None
        pd = data.get('publishDateText')
        if pd:
            try:
                from datetime import datetime
                published_at = datetime.strptime(pd, '%b %d, %Y')
            except ValueError:
                pass
        is_video = True
        has_audio = True
        saves_count = None
        author_followers = None
    elif platform == 'linkedin' and 'likeCount' in data:
        caption_text = data.get('description', '') or data.get('text', '')
        author = data.get('author', {}).get('name', 'unknown')
        likes_count = data.get('likeCount')
        comments_count = data.get('commentCount')
        shares_count = None
        video_duration = None
        published_at = None
        pub_date = data.get('datePublished')
        if pub_date:
            try:
                from datetime import datetime
                published_at = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
            except ValueError:
                pass
        author_followers = data.get('author', {}).get('followers')
        # Если это видеопост и описание пустое — пробуем транскрибировать
        # Признаков видео в ответе может не быть, поэтому вызываем только если caption пустой
        caption_text = _maybe_transcribe_when_empty(caption_text, url, 'linkedin')
        has_audio = None
        is_video = None
        views_count = None
    elif platform == 'tiktok' and 'aweme_detail' in data:
        detail = data.get('aweme_detail', {})
        caption_text = detail.get('desc', '')
        author = detail.get('author', {}).get('unique_id', 'unknown')
        stats = detail.get('statistics', {})
        likes_count = stats.get('digg_count')
        comments_count = stats.get('comment_count')
        shares_count = stats.get('share_count')
        views_count = stats.get('play_count')
        video = detail.get('video', {})
        video_duration = video.get('duration')
        if video_duration:
            video_duration = video_duration // 1000
        author_followers = detail.get('author', {}).get('follower_count')
        has_audio = True
        is_video = True
        published_at = None
        saves_count = stats.get('collect_count')
        # Если описание пустое — транскрибируем
        caption_text = _maybe_transcribe_when_empty(caption_text, url, 'tiktok')
    else:
        caption_edges = media_data.get('edge_media_to_caption', {}).get('edges', [])
        caption_text = caption_edges[0].get('node', {}).get('text', '') if caption_edges else ''

        # 🚀 Instagram: If no caption, transcribe audio
        if not caption_text and platform == 'instagram':
            logger.info(f"Instagram caption is empty for {url}, trying Whisper transcription...")
            caption_text = transcribe_media_audio(url, 'instagram') or ""
            
        owner = media_data.get('owner', {})
        author = owner.get('username', 'unknown')
        views_count = media_data.get('video_view_count')
        likes_count = media_data.get('edge_media_preview_like', {}).get('count', 0)
        comments_edge = media_data.get('edge_media_to_parent_comment', {})
        comments_count = comments_edge.get('count', 0) or len(comments_edge.get('edges', []))
        alt_c = media_data.get('comment_count') or media_data.get('comments_count')
        if alt_c and not comments_count:
            comments_count = alt_c
        shares_count = media_data.get('share_count')
        video_duration = media_data.get('video_duration')
        taken_at = media_data.get('taken_at_timestamp')
        try:
            from datetime import datetime
            published_at = datetime.fromtimestamp(taken_at) if taken_at else None
        except:
            published_at = None
        saves_edge = media_data.get('edge_media_saved', {})
        saves_count = saves_edge.get('count') if saves_edge else None
        author_followers = owner.get('edge_followed_by', {}).get('count')
        has_audio = media_data.get('has_audio')
        is_video = media_data.get('is_video')
    
    engagement_rate = None
    if views_count and views_count > 0:
        total = (likes_count or 0) + (comments_count or 0) + (shares_count or 0)
        engagement_rate = round((total / views_count) * 100, 2)
    
    if platform == 'youtube' and 'title' in data:
        media_url = data.get('url') or url
        play_count = data.get('playCountInt')
    elif platform == 'linkedin' and 'likeCount' in data:
        media_url = data.get('url') or url
        play_count = None
    elif platform == 'tiktok' and 'aweme_detail' in data:
        detail = data.get('aweme_detail', {})
        video = detail.get('video', {})
        play_addrs = video.get('download_no_watermark_addr', {}).get('url_list', [])
        media_url = play_addrs[0] if play_addrs else url
        play_count = detail.get('statistics', {}).get('play_count')
    else:
        media_url = media_data.get('video_url') or media_data.get('display_url') or url
        play_count = media_data.get('video_play_count')
    
    return {
        'caption': caption_text or data.get('caption') or data.get('description') or data.get('text', ''),
        'description': caption_text or data.get('caption') or data.get('description') or data.get('text', ''),
        'transcript': data.get('transcript', ''),
        'media_url': media_url,
        'author': author,
        'platform': platform,
        'views_count': views_count,
        'likes_count': likes_count,
        'comments_count': comments_count,
        'shares_count': shares_count,
        'engagement_rate': engagement_rate,
        'video_duration': video_duration,
        'published_at': published_at,
        'play_count': play_count,
        'saves_count': saves_count,
        'author_followers': author_followers,
        'has_audio': has_audio,
        'is_video': is_video,
    }
