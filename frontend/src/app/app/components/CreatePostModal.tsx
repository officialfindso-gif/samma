"use client";

import React, { FormEvent } from "react";
import type { Post } from "@/lib/api";

export default function CreatePostModal({
  createOpen,
  setCreateOpen,
  createTitle,
  setCreateTitle,
  createSourceUrl,
  setCreateSourceUrl,
  createOriginalText,
  setCreateOriginalText,
  handleCreateSubmit,
  createLoading,
}: {
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  createTitle: string;
  setCreateTitle: (s: string) => void;
  createSourceUrl: string;
  setCreateSourceUrl: (s: string) => void;
  createOriginalText: string;
  setCreateOriginalText: (s: string) => void;
  handleCreateSubmit: (e: FormEvent) => Promise<void> | void;
  createLoading: boolean;
}) {
  if (!createOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-4 lg:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-100">✨ Новый пост</h2>
          <button className="text-xs text-slate-400 hover:text-slate-200" onClick={() => setCreateOpen(false)} disabled={createLoading}>❌ Закрыть</button>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1 text-slate-400">📝 Заголовок</label>
            <input className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">🔗 Ссылка на ролик (source_url)</label>
            <input className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500" value={createSourceUrl} onChange={(e) => setCreateSourceUrl(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-400">📄 Оригинальный текст</label>
            <textarea className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-sky-500 min-h-[120px]" value={createOriginalText} onChange={(e) => setCreateOriginalText(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="text-xs px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all" onClick={() => setCreateOpen(false)} disabled={createLoading}>🚫 Отмена</button>
            <button type="submit" disabled={createLoading} className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-all font-medium">{createLoading ? "⏳ Создаём..." : "✅ Создать пост"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
