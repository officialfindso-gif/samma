"use client";

import React from "react";
import type { Post } from "@/lib/api";

export default function PostDetail({
  selectedPost,
  setSelectedPost,
  handleProcess,
  handleDelete,
  formatNumber,
}: {
  selectedPost: Post;
  setSelectedPost: (p: Post | null) => void;
  handleProcess: (id: number) => Promise<void> | void;
  handleDelete: (id: number) => Promise<void> | void;
  formatNumber: (n: number) => string;
}) {
  return (
    <div 
      className="fixed inset-y-0 right-0 w-full md:w-[500px] border-l-2 border-red-500 shadow-2xl overflow-y-auto"
      style={{ zIndex: 9999, backgroundColor: '#1e293b', borderLeft: '4px solid #ef4444' }}
    >
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Детали поста #{selectedPost.id}</h2>
        <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-200 text-2xl leading-none w-8 h-8 rounded-lg hover:bg-slate-800/50 transition-all flex items-center justify-center">×</button>
      </div>

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="border-b border-slate-800/50 pb-4">
          <h3 className="text-xl lg:text-2xl font-bold text-slate-100 mb-2 break-words">{selectedPost.title || `Пост #${selectedPost.id}`}</h3>
          <div className="flex items-center gap-3 text-xs lg:text-sm text-slate-400 flex-wrap">
            <span className="px-2 py-1 bg-slate-800/50 rounded">ID: {selectedPost.id}</span>
            <span>•</span>
            <span className="break-all">{new Date(selectedPost.created_at).toLocaleString("ru-RU")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Статус</h4>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${selectedPost.status === 'new' ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100' : selectedPost.status === 'in_progress' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse' : selectedPost.status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-red-500 to-red-600 text-white'}`}>{selectedPost.status === 'new' ? '🆕 Новый' : selectedPost.status === 'in_progress' ? '⚡ В обработке' : selectedPost.status === 'ready' ? '✅ Готов' : '❌ Ошибка'}</span>
            {(selectedPost.status === 'new' || selectedPost.status === 'error') && (
              <button onClick={() => handleProcess(selectedPost.id)} className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg text-white transition-all font-medium">{selectedPost.status === 'error' ? '🔄 Повторить' : '⚡ Обработать'}</button>
            )}
          </div>
        </div>

        {selectedPost.error_message && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wide">Ошибка</h4>
            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg"><p className="text-sm text-red-300 break-words">{selectedPost.error_message}</p></div>
          </div>
        )}

        {selectedPost.source_url && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Источник</h4>
            <a href={selectedPost.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 hover:underline break-all">🔗 {selectedPost.source_url}</a>
          </div>
        )}

        {selectedPost.original_text && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Оригинальный текст</h4>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"><p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{selectedPost.original_text}</p></div>
          </div>
        )}

        {selectedPost.transcript && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Расшифровка</h4>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"><p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{selectedPost.transcript}</p></div>
          </div>
        )}

        {selectedPost.generated_caption && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Результат</h4>
              <button onClick={() => { navigator.clipboard.writeText(selectedPost.generated_caption || ''); }} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-all">📋 Копировать</button>
            </div>
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg"><p className="text-sm text-emerald-300 whitespace-pre-wrap break-words">{selectedPost.generated_caption}</p></div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Метрики</h4>
          <div className="grid grid-cols-2 gap-3">
            {selectedPost.views_count != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-indigo-400">{formatNumber(selectedPost.views_count)}</div><div className="text-xs text-slate-500">👀 Просмотры</div></div>)}
            {selectedPost.likes_count != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-rose-400">{formatNumber(selectedPost.likes_count)}</div><div className="text-xs text-slate-500">❤️ Лайки</div></div>)}
            {selectedPost.comments_count != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-cyan-400">{formatNumber(selectedPost.comments_count)}</div><div className="text-xs text-slate-500">💬 Комментарии</div></div>)}
            {selectedPost.play_count != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-purple-400">{formatNumber(selectedPost.play_count)}</div><div className="text-xs text-slate-500">▶️ Воспроизведения</div></div>)}
            {selectedPost.saves_count != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-amber-400">{formatNumber(selectedPost.saves_count)}</div><div className="text-xs text-slate-500">📌 Сохранения</div></div>)}
            {selectedPost.author_followers != null && (<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center"><div className="text-lg font-bold text-orange-400">{formatNumber(selectedPost.author_followers)}</div><div className="text-xs text-slate-500">👥 Подписчики автора</div></div>)}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Платформа</h4>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${ (selectedPost.platform || 'instagram') === 'instagram' ? 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 text-pink-400 border border-pink-500/30' : (selectedPost.platform || 'instagram') === 'tiktok' ? 'bg-gradient-to-r from-red-500/20 to-black/20 text-red-400 border border-red-500/30' : (selectedPost.platform || 'instagram') === 'linkedin' ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30' }`}>
            {(selectedPost.platform || 'instagram') === 'instagram' ? '📸' : (selectedPost.platform || 'instagram') === 'tiktok' ? '🎵' : (selectedPost.platform || 'instagram') === 'linkedin' ? '💼' : '📺'}
            <span className="font-medium">{selectedPost.platform || 'Instagram'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
