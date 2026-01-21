import { Post } from "@/lib/api";
import { useState } from "react";

interface PostDetailProps {
  post: Post;
  onProcess: (postId: number) => void;
}

export default function PostDetail({ post, onProcess }: PostDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Заголовок */}
      <div className="border-b border-slate-800/50 pb-4">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-100 mb-2 break-words">
          {post.title || `Пост #${post.id}`}
        </h2>
        <div className="flex items-center gap-3 text-xs lg:text-sm text-slate-400 flex-wrap">
          <span className="px-2 py-1 bg-slate-800/50 rounded">ID: {post.id}</span>
          <span>•</span>
          <span className="break-all">{new Date(post.created_at).toLocaleString("ru-RU")}</span>
        </div>
      </div>

      {/* Исходный текст */}
      {post.original_text && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Исходный текст
          </h3>
          <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-md">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {post.original_text}
            </p>
          </div>
        </div>
      )}

      {/* Расшифровка */}
      {post.transcript && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-2">
            Расшифровка видео
          </h3>
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {post.transcript}
            </p>
          </div>
        </div>
      )}

      {/* Сгенерированное описание */}
      {post.generated_caption && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-emerald-400">
              Сгенерированное описание
            </h3>
            <button
              onClick={() => handleCopy(post.generated_caption)}
              className="
                px-3 py-1.5 text-xs font-medium rounded
                bg-slate-700 hover:bg-slate-600
                text-slate-200
                transition-colors
              "
            >
              {copied ? "✓ Скопировано" : "Копировать"}
            </button>
          </div>
          <div className="p-4 bg-emerald-950/20 rounded-lg border border-emerald-800/50">
            <p className="text-sm text-emerald-100 whitespace-pre-wrap">
              {post.generated_caption}
            </p>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {post.error_message && (
        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-2">
            Ошибка обработки
          </h3>
          <div className="p-4 bg-red-950/20 rounded-lg border border-red-800/50">
            <p className="text-sm text-red-300 whitespace-pre-wrap">
              {post.error_message}
            </p>
          </div>
          <button
            onClick={() => onProcess(post.id)}
            className="
              mt-3 px-4 py-2 text-sm font-medium rounded w-full
              bg-red-800 hover:bg-red-900
              text-white transition-colors
            "
          >
            Повторить обработку
          </button>
        </div>
      )}

      {/* Кнопка обработки для новых */}
      {post.status === "new" && !post.generated_caption && (
        <button
          onClick={() => onProcess(post.id)}
          className="
            px-4 py-3 text-sm font-medium rounded w-full
            bg-indigo-700 hover:bg-indigo-800
            text-white transition-colors
          "
        >
          Запустить обработку
        </button>
      )}

      {/* Индикатор обработки */}
      {post.status === "in_progress" && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-indigo-400">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Обработка...</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Обычно занимает 3-5 секунд
          </p>
        </div>
      )}

      {/* Метаданные */}
      <div className="pt-6 border-t border-slate-800">
        <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">
          Метаданные
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Платформа:</span>
            <span className="text-slate-300 capitalize">{post.platform || "Instagram"}</span>
          </div>
          {post.source_url && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Источник:</span>
              <a
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline truncate max-w-xs text-right"
              >
                {post.source_url}
              </a>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Обновлено:</span>
            <span className="text-slate-300">
              {new Date(post.updated_at).toLocaleString("ru-RU")}
            </span>
          </div>
        </div>
      </div>

      {/* Метрики вирусности */}
      {(post.views_count !== null || post.likes_count !== null || post.comments_count !== null || post.shares_count !== null) && (
        <div className="pt-6 border-t border-slate-800">
          <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">
            📊 Метрики вирусности
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {post.views_count !== null && post.views_count !== undefined && (
              <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-800/30">
                <div className="text-xs text-slate-400 mb-1">Просмотры</div>
                <div className="text-2xl font-bold text-indigo-300">
                  {post.views_count.toLocaleString('ru-RU')}
                </div>
              </div>
            )}
            
            {post.likes_count !== null && post.likes_count !== undefined && (
              <div className="bg-rose-950/30 p-4 rounded-lg border border-rose-800/30">
                <div className="text-xs text-slate-400 mb-1">Лайки</div>
                <div className="text-2xl font-bold text-rose-400">
                  {post.likes_count.toLocaleString('ru-RU')}
                </div>
              </div>
            )}
            
            {post.comments_count !== null && post.comments_count !== undefined && (
              <div className="bg-cyan-950/30 p-4 rounded-lg border border-cyan-800/30">
                <div className="text-xs text-slate-400 mb-1">Комментарии</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {post.comments_count.toLocaleString('ru-RU')}
                </div>
              </div>
            )}
            
            {post.shares_count !== null && post.shares_count !== undefined && (
              <div className="bg-emerald-950/30 p-4 rounded-lg border border-emerald-800/30">
                <div className="text-xs text-slate-400 mb-1">Репосты</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {post.shares_count.toLocaleString('ru-RU')}
                </div>
              </div>
            )}
          </div>

          {/* Engagement Rate */}
          {post.engagement_rate !== null && post.engagement_rate !== undefined && (
            <div className="mt-4 bg-gradient-to-r from-purple-950/30 to-pink-950/30 p-4 rounded-lg border border-purple-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 mb-1">🔥 Engagement Rate</div>
                  <div className="text-sm text-slate-400">
                    Показывает вовлеченность аудитории
                  </div>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {post.engagement_rate}%
                </div>
              </div>
            </div>
          )}

          {/* Длительность видео */}
          {post.video_duration !== null && post.video_duration !== undefined && (
            <div className="mt-4 text-sm text-slate-400">
              <span className="text-slate-500">⏱️ Длительность:</span>{' '}
              <span className="text-slate-300">
                {Math.floor(post.video_duration / 60)}:{String(post.video_duration % 60).padStart(2, '0')} мин
              </span>
            </div>
          )}

          {/* Дата публикации */}
          {post.published_at && (
            <div className="mt-2 text-sm text-slate-400">
              <span className="text-slate-500">📅 Опубликовано:</span>{' '}
              <span className="text-slate-300">
                {new Date(post.published_at).toLocaleString('ru-RU')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
