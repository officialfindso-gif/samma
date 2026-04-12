"use client";

import React, { useState } from "react";

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    question: "Что такое парсинг конкурентов?",
    answer: "Парсинг — это автоматический сбор данных из социальных сетей. Вы указываете аккаунт конкурента, а система сама выкачивает все его публикации (Reels, видео, посты) с метриками: просмотры, лайки, комментарии, engagement rate.",
  },
  {
    question: "Какие платформы поддерживаются?",
    answer: "Поддерживаются 4 платформы: Instagram, TikTok, YouTube и LinkedIn. Для каждой можно парсить как отдельные публикации, так и целый профиль целиком.",
  },
  {
    question: "Как добавить конкурента?",
    answer: (
      <>
        <ol className="list-decimal list-inside space-y-1 text-gray-300">
          <li>Перейдите в раздел <strong>"👀 Конкуренты"</strong> в меню</li>
          <li>Нажмите <strong>"➕ Добавить аккаунт"</strong></li>
          <li>Выберите платформу (Instagram, TikTok, YouTube, LinkedIn)</li>
          <li>Вставьте <strong>полный URL</strong> профиля или публикации</li>
          <li>Нажмите <strong>"Сохранить"</strong></li>
        </ol>
      </>
    ),
  },
  {
    question: "В чём разница между профилем и отдельным постом?",
    answer: (
      <div className="space-y-2 text-gray-300">
        <div>
          <strong className="text-white">📌 Профиль</strong> — ссылка на аккаунт (например, <code className="bg-gray-800 px-1 rounded">instagram.com/natgeo</code>). Система выкачает <strong>все Reels/видео</strong> этого аккаунта (до 10 штук).
        </div>
        <div>
          <strong className="text-white">📌 Отдельный пост</strong> — ссылка на конкретную публикацию (например, <code className="bg-gray-800 px-1 rounded">instagram.com/reel/ABC123</code>). Система выкачает только <strong>один</strong> этот пост.
        </div>
      </div>
    ),
  },
  {
    question: "Как правильно вставлять ссылки для каждой платформы?",
    answer: (
      <div className="space-y-3 text-gray-300">
        <div>
          <strong className="text-white">📸 Instagram:</strong>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>Профиль: <code className="bg-gray-800 px-1 rounded text-xs">https://www.instagram.com/natgeo/</code></li>
            <li>Reel: <code className="bg-gray-800 px-1 rounded text-xs">https://www.instagram.com/reel/ABC123/</code></li>
          </ul>
        </div>
        <div>
          <strong className="text-white">🎵 TikTok:</strong>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>Профиль: <code className="bg-gray-800 px-1 rounded text-xs">https://www.tiktok.com/@duolingo</code></li>
            <li>Видео: <code className="bg-gray-800 px-1 rounded text-xs">https://www.tiktok.com/@user/video/123</code></li>
          </ul>
        </div>
        <div>
          <strong className="text-white">📺 YouTube:</strong>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>Канал: <code className="bg-gray-800 px-1 rounded text-xs">https://www.youtube.com/@mkbhd</code></li>
            <li>Видео: <code className="bg-gray-800 px-1 rounded text-xs">https://www.youtube.com/watch?v=xyz</code></li>
          </ul>
        </div>
        <div>
          <strong className="text-white">💼 LinkedIn:</strong>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>Профиль: <code className="bg-gray-800 px-1 rounded text-xs">https://www.linkedin.com/in/username/</code></li>
            <li>Пост: <code className="bg-gray-800 px-1 rounded text-xs">https://www.linkedin.com/posts/...</code></li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    question: "Как запустить парсинг?",
    answer: (
      <ol className="list-decimal list-inside space-y-1 text-gray-300">
        <li>Добавьте конкурента в разделе <strong>"👀 Конкуренты"</strong></li>
        <li>Нажмите кнопку <strong>"🚀 Парсить"</strong> рядом с аккаунтом</li>
        <li>Или нажмите <strong>"🚀 Парсить все"</strong> для всех конкурентов сразу</li>
        <li>Дождитесь завершения — новые посты появятся в общем списке</li>
      </ol>
    ),
  },
  {
    question: "Как включить автоматический парсинг по расписанию?",
    answer: (
      <ol className="list-decimal list-inside space-y-1 text-gray-300">
        <li>Перейдите в <strong>"⚙️ Настройки"</strong></li>
        <li>Включите переключатель <strong>"Автоматический парсинг"</strong></li>
        <li>Установите удобное время (например, 09:00)</li>
        <li>Нажмите <strong>"💾 Сохранить"</strong></li>
        <li>Система будет автоматически парсить всех активных конкурентов каждый день в заданное время</li>
      </ol>
    ),
  },
  {
    question: "Что происходит после парсинга?",
    answer: (
      <div className="space-y-2 text-gray-300">
        <p>После парсинга создаются новые посты в вашем воркспейсе со следующими данными:</p>
        <ul className="list-disc list-inside ml-2 space-y-1">
          <li>📝 Оригинальный текст/описание публикации</li>
          <li>👀 Количество просмотров</li>
          <li>❤️ Количество лайков</li>
          <li>💬 Количество комментариев</li>
          <li>🔥 Engagement Rate (ER%) — процент вовлечённости</li>
          <li>📅 Дата публикации</li>
          <li>⏱️ Длительность видео</li>
        </ul>
        <p className="mt-2">Затем нажмите <strong>"⚡ Обработать"</strong> на посте, чтобы AI сгенерировал подпись, скрипт, заголовок и описание на основе этого контента.</p>
      </div>
    ),
  },
  {
    question: "Сколько постов выкачивается из профиля?",
    answer: "По умолчанию система выкачивает до <strong className='text-white'>10 последних публикаций</strong> из профиля. Это оптимальный баланс между полнотой данных и скоростью. Если нужно больше — обратитесь к администратору.",
  },
  {
    question: "Почему парсинг может не работать?",
    answer: (
      <ul className="list-disc list-inside space-y-1 text-gray-300">
        <li>❌ Неправильная ссылка — убедитесь что URL полный (с https://)</li>
        <li>❌ Приватный аккаунт — парсятся только публичные профили</li>
        <li>❌ Аккаунт заблокирован или удалён</li>
        <li>❌ Лимит API — если слишком много запросов, подождите немного</li>
      </ul>
    ),
  },
];

export default function ParserFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700/30">
        <h2 className="text-lg font-semibold text-white">❓ FAQ — Как пользоваться парсером</h2>
        <p className="text-xs text-gray-400 mt-1">Ответы на частые вопросы о парсинге конкурентов</p>
      </div>

      <div className="divide-y divide-gray-700/30">
        {faqItems.map((item, index) => (
          <div key={index}>
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-800/30 transition-colors"
            >
              <span className="text-sm font-medium text-gray-200 pr-4">{item.question}</span>
              <span className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 text-sm text-gray-300 leading-relaxed">
                {typeof item.answer === "string" ? (
                  <p dangerouslySetInnerHTML={{ __html: item.answer.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1 rounded text-xs">$1</code>') }} />
                ) : (
                  <div>{item.answer}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
