import logging
from typing import Optional, Dict

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_session: Optional[requests.Session] = None


def get_session() -> requests.Session:
    """
    Ленивая инициализация requests.Session с нужными заголовками и прокси.
    """
    global _session
    if _session is not None:
        return _session

    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY не задан в настройках/окружении.")

    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    })

    if settings.OPENAI_PROXY:
        # один и тот же прокси для http/https
        s.proxies.update({
            "http": settings.OPENAI_PROXY,
            "https": settings.OPENAI_PROXY,
        })

    _session = s
    return _session


def _post_json(path: str, payload: Dict) -> Dict:
    """
    Вспомогательная обёртка над POST /v1/... с логированием и таймаутом.
    """
    session = get_session()
    url = settings.OPENAI_API_BASE.rstrip("/") + "/" + path.lstrip("/")

    resp = session.post(url, json=payload, timeout=40)

    # Бросаем понятную ошибку, если что-то пошло не так
    if resp.status_code >= 400:
        logger.error("OpenAI API error %s: %s", resp.status_code, resp.text)
        raise RuntimeError(f"OpenAI API error {resp.status_code}: {resp.text}")

    return resp.json()


def generate_caption(prompt_text: str, original_text: str) -> str:
    """
    Генерирует описание для ролика через /v1/chat/completions.
    На вход: твой промпт + исходный текст ролика.
    На выход: строка с готовым описанием.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "Ты помощник-копирайтер, который пишет цепкие описания "
                "для Reels/Shorts. Отвечай только готовым текстом без пояснений."
            ),
        },
        {
            "role": "user",
            "content": f"{prompt_text}\n\nТекст ролика:\n{original_text}",
        },
    ]

    model_name = (settings.OPENAI_MODEL or "").strip()
    token_key = "max_completion_tokens" if model_name.startswith("gpt-5") else "max_tokens"

    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": messages,
        "temperature": 0.7,
        token_key: 500,
    }

    data = _post_json("/chat/completions", payload)

    # Классический формат ответа v1/chat/completions
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as e:
        logger.error("Unexpected OpenAI response format: %s", data)
        raise RuntimeError(f"Unexpected OpenAI response format: {e}")
