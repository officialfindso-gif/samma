"use client";

import React, { useState } from "react";
import type { Post } from "@/lib/api";
import { PostResultsTabs } from "./PostResultsTabs";
import PostNotes from "./PostNotes";

const getPlatformMeta = (platform?: string | null) => {
  const p = (platform || "instagram").toLowerCase();
  switch (p) {
    case "instagram":
      return { icon: "📸", label: "Instagram", className: "bg-pink-500/20 text-pink-200 border border-pink-400/40" };
    case "tiktok":
      return { icon: "🎵", label: "TikTok", className: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40" };
    case "linkedin":
      return { icon: "💼", label: "LinkedIn", className: "bg-blue-500/20 text-blue-200 border border-blue-400/40" };
    case "youtube":
      return { icon: "📺", label: "YouTube", className: "bg-red-500/20 text-red-200 border border-red-400/40" };
    default:
      return { icon: "🌐", label: platform || "Platform", className: "bg-gray-700 text-gray-200 border border-gray-500/40" };
  }
};

export default function PostDetail({
  selectedPost,
  setSelectedPost,
  handleProcess,
  handleDelete,
  onEdit,
  formatNumber,
  accessToken,
}: {
  selectedPost: Post;
  setSelectedPost: (p: Post | null) => void;
  handleProcess: (id: number) => Promise<void> | void;
  handleDelete: (id: number) => Promise<void> | void;
  onEdit: () => void;
  formatNumber: (n: number) => string;
  accessToken: string | null;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const platformMeta = getPlatformMeta(selectedPost.platform);
  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[450px] lg:w-[500px] 2xl:w-[550px] border-l-2 border-gray-500 shadow-2xl overflow-y-auto"
      style={{ zIndex: 9999, backgroundColor: '#000000', borderLeft: '4px solid #ef4444' }}
    >
      <div className="sticky top-0 bg-black border-b border-gray-700 p-3 sm:p-4 lg:p-5 flex items-center justify-between">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate">Детали #{selectedPost.id}</h2>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="text-gray-400 hover:text-white text-sm w-8 h-8 rounded-lg hover:bg-white/5 transition-all flex items-center justify-center" title="Редактировать">✏️</button>
          <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-white text-lg sm:text-xl lg:text-2xl leading-none w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-white/5 transition-all flex items-center justify-center flex-shrink-0">×</button>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="border-b border-gray-800/50 pb-3 sm:pb-4">
          <h3 className="text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-bold text-white mb-1.5 sm:mb-2 break-words">{selectedPost.title || `Пост #${selectedPost.id}`}</h3>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 flex-wrap">
            <span className="px-2 py-1 bg-gray-800/50 rounded">ID: {selectedPost.id}</span>
            <span className="hidden sm:inline">•</span>
            <span className="break-all">{new Date(selectedPost.created_at).toLocaleString("ru-RU")}</span>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wide">Статус</h4>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center gap-2 ${selectedPost.status === 'new' ? 'bg-gray-700' : selectedPost.status === 'in_progress' ? 'bg-gray-700' : selectedPost.status === 'ready' ? 'bg-gray-700' : 'bg-gray-700'}`}>{selectedPost.status === 'new' ? '🆕 Новый' : selectedPost.status === 'in_progress' ? '⚡ В обработке' : selectedPost.status === 'ready' ? '✅ Готов' : '❌ Ошибка'}</span>
            {(selectedPost.status === 'new' || selectedPost.status === 'error') && (
              <button onClick={() => handleProcess(selectedPost.id)} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-white text-black hover:bg-gray-100 rounded-lg transition-all font-medium whitespace-nowrap">{selectedPost.status === 'error' ? '🔄 Повторить' : '⚡ Обработать'}</button>
            )}
          </div>
        </div>

        {selectedPost.error_message && (
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wide">Ошибка</h4>
            <div className="p-3 sm:p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">🚨</span>
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium mb-1">
                    {selectedPost.error_message.includes('Rate limited') ? '⏱️ Превышен лимит API' :
                     selectedPost.error_message.includes('Server error') ? '🔧 Ошибка сервера ScrapeCreators' :
                     selectedPost.error_message.includes('Network') ? '🌐 Сетевая ошибка' :
                     selectedPost.error_message.includes('not found') || selectedPost.error_message.includes('404') ? '🔍 Контент не найден' :
                     '❌ Ошибка обработки'}
                  </p>
                  <p className="text-xs text-red-400/80 break-words font-mono">{selectedPost.error_message}</p>
                  {(selectedPost.status === 'error') && (
                    <button
                      onClick={() => handleProcess(selectedPost.id)}
                      className="mt-2 px-3 py-1.5 bg-red-800/50 hover:bg-red-700/50 text-red-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      🔄 Повторить попытку
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPost.source_url && (
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wide">Источник</h4>
            <a href={selectedPost.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-white hover:underline break-all">🔗 {selectedPost.source_url}</a>
          </div>
        )}

        {selectedPost.original_text && (
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wide">Оригинальный текст</h4>
            <div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"><p className="text-xs sm:text-sm text-gray-300 whitespace-pre-wrap break-words">{selectedPost.original_text}</p></div>
          </div>
        )}

        <PostResultsTabs post={selectedPost} />

        {/* Notes Toggle */}
        <div className="border-t border-gray-800/50 pt-3">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            {showNotes ? "🔼" : "🔽"} Заметки к посту
          </button>
          {showNotes && accessToken && (
            <div className="mt-3">
              <PostNotes postId={selectedPost.id} accessToken={accessToken} />
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wide">Метрики</h4>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {selectedPost.views_count != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-white">{formatNumber(selectedPost.views_count)}</div><div className="text-xs text-gray-500">👀 Просмотры</div></div>)}
            {selectedPost.likes_count != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-gray-300">{formatNumber(selectedPost.likes_count)}</div><div className="text-xs text-gray-500">❤️ Лайки</div></div>)}
            {selectedPost.comments_count != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-gray-300">{formatNumber(selectedPost.comments_count)}</div><div className="text-xs text-gray-500">💬 Комментарии</div></div>)}
            {selectedPost.play_count != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-gray-600">{formatNumber(selectedPost.play_count)}</div><div className="text-xs text-gray-500">▶️ Воспроизведения</div></div>)}
            {selectedPost.saves_count != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-gray-600">{formatNumber(selectedPost.saves_count)}</div><div className="text-xs text-gray-500">📌 Сохранения</div></div>)}
            {selectedPost.author_followers != null && (<div className="p-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 text-center"><div className="text-sm sm:text-base lg:text-lg font-bold text-gray-600">{formatNumber(selectedPost.author_followers)}</div><div className="text-xs text-gray-500">👥 Авт. подписчики</div></div>)}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wide">Платформа</h4>
          <div className={`inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold ${platformMeta.className}`}>
            <span>{platformMeta.icon}</span>
            <span className="font-medium">{platformMeta.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

