"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Post } from "@/lib/api";
import { PostResultsTabs } from "./PostResultsTabs";

type ColumnWidths = Record<string, number>;

const DEFAULT_WIDTHS: ColumnWidths = {
  checkbox: 44,
  source: 128,
  original: 160,
  result: 160,
  description: 160,
  views: 80,
  likes: 64,
  comments: 80,
  er: 72,
  plays: 64,
  saves: 80,
  followers: 80,
  platform: 80,
  status: 64,
  actions: 90,
};

const MIN_WIDTHS: ColumnWidths = {
  checkbox: 40,
  source: 80,
  original: 100,
  result: 100,
  description: 100,
  views: 60,
  likes: 50,
  comments: 60,
  er: 55,
  plays: 50,
  saves: 60,
  followers: 60,
  platform: 60,
  status: 50,
  actions: 70,
};


export default function PostsList({
  filteredPosts,
  selectedPosts,
  togglePostSelection,
  selectedPost,
  setSelectedPost,
  visibleColumns,
  columnOrder,
  columnLabels,
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
  columnOrder: string[];
  columnLabels: Record<string, string>;
  toggleSelectAll: () => void;
  handleProcess: (id: number) => Promise<void> | void;
  handleDelete: (id: number) => Promise<void> | void;
  formatNumber: (n: number) => string;
}) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [tempWidth, setTempWidth] = useState<number>(0);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("postListColumnWidths");
      if (stored) {
        const parsed = JSON.parse(stored);
        setColumnWidths({ ...DEFAULT_WIDTHS, ...parsed });
      }
    } catch (e) { /* ignore */ }
  }, []);

  const saveColumnWidths = (newWidths: ColumnWidths) => {
    try { localStorage.setItem("postListColumnWidths", JSON.stringify(newWidths)); } catch (e) { /* ignore */ }
  };

  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const width = columnWidths[columnKey] || DEFAULT_WIDTHS[columnKey] || 100;
    setStartX(e.clientX);
    setStartWidth(width);
    setTempWidth(width);
    setResizingColumn(columnKey);
  };

  useEffect(() => {
    if (!resizingColumn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_WIDTHS[resizingColumn] || 60, startWidth + diff);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => { if (newWidth < 600) setTempWidth(newWidth); });
    };
    const handleMouseUp = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: tempWidth }));
      saveColumnWidths({ ...columnWidths, [resizingColumn]: tempWidth });
      setResizingColumn(null); setTempWidth(0); setStartX(0); setStartWidth(0);
    };
    document.addEventListener("mousemove", handleMouseMove, { capture: true });
    document.addEventListener("mouseup", handleMouseUp, { capture: true });
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, { capture: true });
      document.removeEventListener("mouseup", handleMouseUp, { capture: true });
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [resizingColumn, startX, startWidth, tempWidth, columnWidths]);

  const getColumnWidth = (columnKey: string): number => {
    if (columnKey === "checkbox") return DEFAULT_WIDTHS.checkbox;
    if (resizingColumn === columnKey && tempWidth > 0) return tempWidth;
    return columnWidths[columnKey] || DEFAULT_WIDTHS[columnKey] || 100;
  };

  // Render single column header cell
  const renderHeaderCell = (key: string) => {
    if (!visibleColumns[key]) return null;
    return (
      <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20 group" style={{ width: getColumnWidth(key) }}>
        <span className="truncate">{columnLabels[key] || key}</span>
        <div className="w-1 h-6 hover:bg-blue-500/50 hover:w-1.5 transition-all cursor-col-resize ml-auto" onMouseDown={(e) => handleResizeStart(e, key)} style={{ backgroundColor: resizingColumn === key ? "#3b82f6" : "transparent" }} />
      </div>
    );
  };

  // Render single column body cell
  const renderBodyCell = (post: Post, key: string) => {
    if (!visibleColumns[key]) return null;
    switch (key) {
      case "source":
        return (
          <div key={key} className="flex flex-col justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            <div className="font-semibold text-xs lg:text-sm text-white mb-1 truncate group-hover:text-white transition-colors">{post.title || `📄 Пост #${post.id}`}</div>
            {post.source_url && <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:underline truncate transition-colors">{new URL(post.source_url).hostname}</a>}
          </div>
        );
      case "original":
        return (
          <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.original_text ? <div className="text-xs text-gray-400 line-clamp-3">{post.original_text}</div> : <div className="text-xs text-gray-500 italic flex items-center gap-1">📝 Нет текста</div>}
          </div>
        );
      case "result":
        return (
          <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.generated_caption ? <div className="text-xs text-gray-400 line-clamp-3">{post.generated_caption}</div> : post.status === 'ready' ? <div className="text-xs text-gray-500 italic flex items-center gap-1">⚪ Пусто</div> : null}
          </div>
        );
      case "description":
        return (
          <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.description ? <div className="text-xs text-gray-400 line-clamp-3">{post.description}</div> : <div className="text-xs text-gray-500 italic flex items-center gap-1">📝 Нет описания</div>}
          </div>
        );
      case "views":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.views_count != null ? <span className="bg-gray-700 px-1.5 py-0.5 rounded">{formatNumber(post.views_count)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "likes":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.likes_count != null ? <span className="text-gray-300 font-bold">{formatNumber(post.likes_count)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "comments":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.comments_count != null ? <span className="text-gray-300 font-bold">{formatNumber(post.comments_count)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "er":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.engagement_rate != null ? (
              <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${parseFloat(typeof post.engagement_rate === "string" ? post.engagement_rate : String(post.engagement_rate)) >= 5 ? "bg-rose-600 text-white" : parseFloat(typeof post.engagement_rate === "string" ? post.engagement_rate : String(post.engagement_rate)) >= 2 ? "bg-amber-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                {typeof post.engagement_rate === "string" ? post.engagement_rate : post.engagement_rate}%
              </span>
            ) : <span className="text-gray-600">—</span>}
          </div>
        );
      case "plays":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.play_count != null ? <span className="bg-gray-700 px-1.5 py-0.5 rounded">{formatNumber(post.play_count)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "saves":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.saves_count != null ? <span className="text-gray-300 font-bold">{formatNumber(post.saves_count)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "followers":
        return (
          <div key={key} className="flex items-center justify-center flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>
            {post.author_followers != null ? <span className="text-gray-300 font-bold">{formatNumber(post.author_followers)}</span> : <span className="text-gray-600">—</span>}
          </div>
        );
      case "platform":
        return (
          <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20 group" style={{ width: getColumnWidth(key) }}>
            <span className="inline-flex items-center gap-1">{post.platform === 'instagram' ? '📸' : post.platform === 'tiktok' ? '🎵' : post.platform === 'linkedin' ? '💼' : '📺'} {post.platform || 'Instagram'}</span>
          </div>
        );
      case "status":
        return (
          <div key={key} className="flex items-center flex-shrink-0 px-2 border-r border-gray-600/20 group" style={{ width: getColumnWidth(key) }}>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${post.status === 'new' ? 'bg-gray-700' : post.status === 'in_progress' ? 'bg-gray-700' : post.status === 'ready' ? 'bg-gray-700' : 'bg-gray-700'}`}>
              {post.status === 'new' ? '🆕' : post.status === 'in_progress' ? '⚡' : post.status === 'ready' ? '✅' : '❌'}
            </span>
          </div>
        );
      case "actions":
        return (
          <div key={key} className="flex items-center gap-1 flex-shrink-0 px-2" style={{ width: getColumnWidth(key) }} onClick={(e) => e.stopPropagation()}>
            {post.status === 'new' && <button onClick={() => handleProcess(post.id)} className="px-2 py-1 text-xs bg-white text-black hover:bg-gray-100 rounded transition-all font-medium shadow-md">⚡</button>}
            {post.status === 'error' && <button onClick={() => handleProcess(post.id)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white transition-all font-medium shadow-md">🔄</button>}
            {post.status === 'ready' && <button onClick={() => setSelectedPost(post)} className="px-2 py-1 text-xs bg-white text-black hover:bg-gray-100 rounded transition-all font-medium shadow-md">👁️</button>}
            <button onClick={() => handleDelete(post.id)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-red-700 rounded text-white transition-all font-medium shadow-md" title="Удалить">🗑️</button>
          </div>
        );
      default:
        return <div key={key} className="flex-shrink-0 px-2 border-r border-gray-600/20" style={{ width: getColumnWidth(key) }}>—</div>;
    }
  };

  return (
    <div>
      {/* Мобильное отображение карточками */}
      <div className="block md:hidden space-y-3">
        {filteredPosts.map((post) => {
          const isSelected = selectedPosts.has(post.id);
          const isActive = selectedPost?.id === post.id;
          const dateStr = new Date(post.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

          return (
            <div 
              key={post.id} 
              className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border p-4 transition-all shadow-sm ${
                isActive ? 'border-white/30 ring-1 ring-white/10' : 'border-gray-700/50'
              }`} 
              onClick={() => setSelectedPost(post)}
            >
              {/* Header: Title, Status, Checkbox */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePostSelection(post.id)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 checked:bg-white checked:border-white cursor-pointer accent-white flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate leading-tight">{post.title || `Пост #${post.id}`}</h3>
                    <span className="text-xs text-gray-500 truncate">{new URL(post.source_url || 'https://localhost').hostname}</span>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className={`ml-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                  post.status === 'new' ? 'bg-gray-700 text-gray-300' : 
                  post.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400 animate-pulse' : 
                  post.status === 'ready' ? 'bg-emerald-600/20 text-emerald-400' : 
                  'bg-red-600/20 text-red-400'
                }`}>
                  {post.status === 'new' ? 'Новый' : 
                   post.status === 'in_progress' ? 'В работе' : 
                   post.status === 'ready' ? 'Готов' : 'Ошибка'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-black/30 rounded-xl p-2 text-center border border-gray-700/30">
                  <div className="text-sm font-bold text-white tabular-nums">{formatNumber(post.views_count || 0)}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Просмотры</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2 text-center border border-gray-700/30">
                  <div className="text-sm font-bold text-rose-400 tabular-nums">{formatNumber(post.likes_count || 0)}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Лайки</div>
                </div>
                <div className="bg-black/30 rounded-xl p-2 text-center border border-gray-700/30">
                  <div className="text-sm font-bold text-amber-400 tabular-nums">{post.engagement_rate ? (typeof post.engagement_rate === "string" ? post.engagement_rate : post.engagement_rate) + '%' : '—'}</div>
                  <div className="text-[10px] text-gray-500 font-medium">ER Rate</div>
                </div>
              </div>

              {/* Generated Preview (if ready) */}
              {post.generated_caption && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700/30">
                  <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">✨ {post.generated_caption}</p>
                </div>
              )}

              {/* Footer: Actions + Date */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-700/50" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-gray-600 font-medium">{dateStr}</span>
                
                <div className="flex items-center gap-2">
                  {post.status === 'new' && (
                    <button onClick={() => handleProcess(post.id)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-gray-100 text-black text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95">
                      <span>⚡</span> Обработать
                    </button>
                  )}
                  {post.status === 'error' && (
                    <button onClick={() => handleProcess(post.id)} className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-all active:scale-95">
                      <span>🔄</span> Повторить
                    </button>
                  )}
                  {post.status === 'ready' && (
                    <button onClick={() => setSelectedPost(post)} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all active:scale-95">
                      <span>👁️</span> Открыть
                    </button>
                  )}
                  <button onClick={() => handleDelete(post.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors active:scale-95" title="Удалить">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Десктопное отображение таблицей */}
      <div className="hidden md:block w-full bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-xl border border-gray-700/30 shadow-2xl backdrop-blur-sm ring-1 ring-gray-700/20 overflow-hidden">
        <div className="overflow-x-auto posts-table-container" style={{ cursor: resizingColumn ? "col-resize" : "auto", userSelect: "none", WebkitUserSelect: "none", msUserSelect: "none", MozUserSelect: "none" }} onDragStart={(e) => e.preventDefault()}>
          {/* Table Header */}
          <div className="flex items-center px-2 lg:px-4 py-2 lg:py-3 bg-gradient-to-r from-gray-800/70 to-gray-700/50 border-b border-gray-600/30 text-xs lg:text-sm font-semibold text-gray-300 uppercase tracking-wider backdrop-blur-sm w-max">
            <div className="flex items-center justify-center flex-shrink-0 border-r border-gray-600/20" style={{ width: getColumnWidth("checkbox") }}>
              <input type="checkbox" checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0} onChange={toggleSelectAll} className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded border-gray-600 bg-gray-800 checked:bg-white checked:border-white cursor-pointer" />
            </div>
            {columnOrder.map(renderHeaderCell)}
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-800/50">
            {filteredPosts.map((post) => {
              const isSelected = selectedPosts.has(post.id);
              const isActive = selectedPost?.id === post.id;

              return (
                <div key={post.id} className={`flex items-center px-2 lg:px-4 py-2 lg:py-3 hover:bg-gradient-to-r hover:from-gray-800/40 hover:to-gray-700/30 transition-all duration-200 cursor-pointer group hover:shadow-lg hover:shadow-gray-900/20 w-max ${isActive ? 'bg-gray-700' : ''}`} onClick={() => setSelectedPost(post)}>
                  <div className="flex items-center justify-center flex-shrink-0 border-r border-gray-600/20" style={{ width: getColumnWidth("checkbox") }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => togglePostSelection(post.id)} className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded border-gray-600 bg-gray-800 checked:bg-white checked:border-white cursor-pointer" />
                  </div>
                  {columnOrder.map((key) => renderBodyCell(post, key))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
