"use client";

import React from "react";
import type { Post } from "@/lib/api";

export default function PostsList({
  filteredPosts,
  selectedPosts,
  togglePostSelection,
  selectedPost,
  setSelectedPost,
  visibleColumns,
  toggleSelectAll,
  handleProcess,
  handleDelete,
  formatNumber,
}: {
  filteredPosts: Post[];
  selectedPosts: Set<number>;
  togglePostSelection: (id: number) => void;
  selectedPost: Post | null;
  setSelectedPost: (p: Post | null) => void;
  visibleColumns: Record<string, boolean>;
  toggleSelectAll: () => void;
  handleProcess: (id: number) => Promise<void> | void;
  handleDelete: (id: number) => Promise<void> | void;
  formatNumber: (n: number) => string;
}) {
  return (
    <div>
      {/* Мобильное отображение карточками */}
      <div className="block md:hidden space-y-4">
        {filteredPosts.map((post) => {
          const isSelected = selectedPosts.has(post.id);
          const isActive = selectedPost?.id === post.id;

          return (
            <div
              key={post.id}
              className={`bg-gradient-to-br from-slate-900/60 to-slate-800/40 rounded-xl border border-slate-700/30 p-4 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-slate-900/20 ${
                isActive ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-900/20' : ''
              }`}
              onClick={() => setSelectedPost(post)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePostSelection(post.id)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-indigo-600 checked:border-indigo-600 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <h3 className="font-semibold text-sm text-slate-100">
                    {post.title || `📄 Пост #${post.id}`}
                  </h3>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                  post.status === 'new' ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100' :
                  post.status === 'in_progress' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse' :
                  post.status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                  'bg-gradient-to-r from-red-500 to-red-600 text-white'
                }`}>
                  {post.status === 'new' ? '🆕' :
                   post.status === 'in_progress' ? '⚡' :
                   post.status === 'ready' ? '✅' : '❌'}
                </span>
              </div>

              {post.source_url && (
                <div className="mb-3">
                  <a
                    href={post.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 {new URL(post.source_url).hostname}
                  </a>
                </div>
              )}

              {post.original_text && (
                <div className="mb-3">
                  <p className="text-xs text-slate-400 line-clamp-2">{post.original_text}</p>
                </div>
              )}

              {post.generated_caption && (
                <div className="mb-3">
                  <p className="text-xs text-emerald-400 line-clamp-2">✨ {post.generated_caption}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4 mb-3 justify-center">
                {post.views_count != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">👀</span>
                    <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.views_count)}</span>
                  </div>
                )}
                {post.likes_count != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">❤️</span>
                    <span className="bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.likes_count)}</span>
                  </div>
                )}
                {post.comments_count != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">💬</span>
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.comments_count)}</span>
                  </div>
                )}
                {post.play_count != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">▶️</span>
                    <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.play_count)}</span>
                  </div>
                )}
                {post.saves_count != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">📌</span>
                    <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.saves_count)}</span>
                  </div>
                )}
                {post.author_followers != null && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">👥</span>
                    <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.author_followers)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="inline-flex items-center gap-1">{(post.platform || 'instagram') === 'instagram' ? '📸' : (post.platform || 'instagram') === 'tiktok' ? '🎵' : (post.platform || 'instagram') === 'linkedin' ? '💼' : '📺'} {post.platform || 'Instagram'}</span>
                <span>📅 {new Date(post.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {post.status === 'new' && (
                  <button onClick={() => handleProcess(post.id)} className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-md text-white transition-all font-medium shadow-md">⚡ Обработать</button>
                )}
                {post.status === 'error' && (
                  <button onClick={() => handleProcess(post.id)} className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-md text-white transition-all font-medium shadow-md">🔄 Повторить</button>
                )}
                {post.status === 'ready' && (
                  <button onClick={() => setSelectedPost(post)} className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-md text-white transition-all font-medium shadow-md">👁️ Открыть</button>
                )}
                <button onClick={() => handleDelete(post.id)} className="px-3 py-2 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-md text-white transition-all font-medium shadow-md" title="Удалить">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Десктопное отображение таблицей */}
      <div className="hidden md:block w-full bg-gradient-to-br from-slate-900/60 to-slate-800/40 rounded-xl border border-slate-700/30 shadow-2xl backdrop-blur-sm ring-1 ring-slate-700/20 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-800/70 to-slate-700/50 border-b border-slate-600/30 text-xs font-semibold text-slate-300 uppercase tracking-wider backdrop-blur-sm w-max min-w-full">
            <div className="flex items-center justify-center w-12 flex-shrink-0">
              <input type="checkbox" checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-indigo-600 checked:border-indigo-600 cursor-pointer" />
            </div>
            {visibleColumns.source && <div className="w-32 flex-shrink-0">🔗 Источник</div>}
            {visibleColumns.original && <div className="w-48 flex-shrink-0">📝 Оригинал</div>}
            {visibleColumns.result && <div className="w-48 flex-shrink-0">✨ Результат</div>}
            {visibleColumns.views && <div className="text-center w-24 flex-shrink-0">👀 Просм.</div>}
            {visibleColumns.likes && <div className="text-center w-20 flex-shrink-0">❤️ Лайки</div>}
            {visibleColumns.comments && <div className="text-center w-24 flex-shrink-0">💬 Комм.</div>}
            {visibleColumns.plays && <div className="text-center w-20 flex-shrink-0">▶️ Воспр.</div>}
            {visibleColumns.saves && <div className="text-center w-24 flex-shrink-0">📌 Сохр.</div>}
            {visibleColumns.followers && <div className="text-center w-24 flex-shrink-0">👥 Подп.</div>}
            {visibleColumns.platform && <div className="w-24 flex-shrink-0">🔥 Платф.</div>}
            <div className="w-20 flex-shrink-0">⚡ Статус</div>
            <div className="w-32 flex-shrink-0">Действия</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800/50">
            {filteredPosts.map((post) => {
              const isSelected = selectedPosts.has(post.id);
              const isActive = selectedPost?.id === post.id;

              return (
                <div key={post.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-800/40 hover:to-slate-700/30 transition-all duration-200 cursor-pointer group hover:shadow-lg hover:shadow-slate-900/20 w-max min-w-full ${isActive ? 'bg-gradient-to-r from-indigo-950/40 to-indigo-900/30 border-l-4 border-indigo-500 shadow-lg shadow-indigo-900/20' : ''}`} onClick={() => setSelectedPost(post)}>
                  <div className="flex items-center justify-center w-12 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => togglePostSelection(post.id)} className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-indigo-600 checked:border-indigo-600 cursor-pointer" />
                  </div>

                  {visibleColumns.source && (
                    <div className="w-32 flex-shrink-0 flex flex-col justify-center">
                      <div className="font-semibold text-xs text-slate-100 mb-1 truncate group-hover:text-white transition-colors">{post.title || `📄 Пост #${post.id}`}</div>
                      {post.source_url && (
                        <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline truncate transition-colors bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent" onClick={(e) => e.stopPropagation()}>{new URL(post.source_url).hostname}</a>
                      )}
                    </div>
                  )}

                  {visibleColumns.original && (
                    <div className="w-48 flex-shrink-0 items-center flex">
                      {post.original_text ? (<div className="text-xs text-slate-400 line-clamp-3">{post.original_text}</div>) : (<div className="text-xs text-slate-500 italic flex items-center gap-1">📝 Нет текста</div>)}
                    </div>
                  )}

                  {visibleColumns.result && (
                    <div className="w-48 flex-shrink-0 flex items-center">{post.generated_caption ? (<div className="text-xs text-emerald-400 line-clamp-3">{post.generated_caption}</div>) : post.status === 'ready' ? (<div className="text-xs text-slate-500 italic flex items-center gap-1">⚪ Пусто</div>) : null}</div>
                  )}

                  {visibleColumns.views && (<div className="w-24 flex-shrink-0 items-center justify-center text-xs flex">{post.views_count != null ? (<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.views_count)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.likes && (<div className="w-20 flex-shrink-0 flex items-center justify-center text-xs">{post.likes_count != null ? (<span className="bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.likes_count)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.comments && (<div className="w-24 flex-shrink-0 flex items-center justify-center text-xs">{post.comments_count != null ? (<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.comments_count)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.plays && (<div className="w-20 flex-shrink-0 items-center justify-center text-xs flex">{post.play_count != null ? (<span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.play_count)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.saves && (<div className="w-24 flex-shrink-0 items-center justify-center text-xs flex">{post.saves_count != null ? (<span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.saves_count)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.followers && (<div className="w-24 flex-shrink-0 items-center justify-center text-xs flex">{post.author_followers != null ? (<span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent font-bold text-sm">{formatNumber(post.author_followers)}</span>) : (<span className="text-slate-600">—</span>)}</div>)}

                  {visibleColumns.platform && (<div className="w-24 flex-shrink-0 items-center text-xs font-medium flex"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${(post.platform || 'instagram') === 'instagram' ? 'bg-gradient-to-r from-pink-500/20 to-purple-600/20 text-pink-400 border border-pink-500/30' : (post.platform || 'instagram') === 'tiktok' ? 'bg-gradient-to-r from-red-500/20 to-black/20 text-red-400 border border-red-500/30' : (post.platform || 'instagram') === 'linkedin' ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30'}`}>
                    {(post.platform || 'instagram') === 'instagram' ? '📸' : (post.platform || 'instagram') === 'tiktok' ? '🎵' : (post.platform || 'instagram') === 'linkedin' ? '💼' : '📺'}
                    <span className="hidden lg:inline">{post.platform || 'Instagram'}</span>
                  </span></div>)}

                  <div className="w-24 flex-shrink-0 flex items-center">
                    <span className={`w-20 h-8 flex items-center justify-center rounded-lg text-xs font-semibold whitespace-nowrap ${post.status === 'new' ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-100 shadow-md' : post.status === 'in_progress' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse shadow-lg shadow-indigo-500/25' : post.status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25' : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'}`}> 
                      <span className="hidden sm:inline">{post.status === 'new' ? '🆕 Новый' : post.status === 'in_progress' ? '⚡ Обработка' : post.status === 'ready' ? '✅ Готов' : '❌ Ошибка'}</span>
                      <span className="sm:hidden">{post.status === 'new' ? '🆕' : post.status === 'in_progress' ? '⚡' : post.status === 'ready' ? '✅' : '❌'}</span>
                    </span>
                  </div>

                  <div className="w-32 flex-shrink-0 flex items-center justify-start gap-1" onClick={(e) => e.stopPropagation()}>
                    {(post.status === 'new' || post.status === 'error') && (
                      <button onClick={() => handleProcess(post.id)} className={`w-8 h-8 flex items-center justify-center text-sm rounded-md text-white transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium ${post.status === 'new' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-indigo-500/25' : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 hover:shadow-amber-500/25'}`} title={post.status === 'new' ? 'Обработать' : 'Повторить'}>
                        {post.status === 'new' ? '⚡' : '🔄'}
                      </button>
                    )}
                    {post.status === 'ready' && (
                      <button onClick={() => setSelectedPost(post)} className="w-8 h-8 flex items-center justify-center text-sm bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 rounded-md text-white transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium" title="Детали">
                        👁️
                      </button>
                    )}
                    <button onClick={() => handleDelete(post.id)} className="w-8 h-8 flex items-center justify-center text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-md text-white transition-all shadow-md hover:shadow-lg hover:shadow-red-500/25 transform hover:scale-105 active:scale-95" title="Удалить">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
