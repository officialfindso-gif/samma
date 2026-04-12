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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg 2xl:max-w-xl bg-black/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-4 sm:p-5 lg:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-white">✨ Новый пост</h2>
          <button className="text-xs sm:text-sm text-gray-400 hover:text-white px-2 py-1 h-8 w-8 flex items-center justify-center" onClick={() => setCreateOpen(false)} disabled={createLoading}>❌</button>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm mb-2 text-gray-400">📝 Заголовок</label>
            <input className="w-full rounded-md bg-gray-950 border border-gray-700 px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-white focus:ring-1 focus:ring-white transition-all" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs sm:text-sm mb-2 text-gray-400">🔗 Ссылка на ролик</label>
            <input className="w-full rounded-md bg-gray-950 border border-gray-700 px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-white focus:ring-1 focus:ring-white transition-all" value={createSourceUrl} onChange={(e) => setCreateSourceUrl(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs sm:text-sm mb-2 text-gray-400">📄 Оригинальный текст</label>
            <textarea className="w-full rounded-md bg-gray-950 border border-gray-700 px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none focus:border-white focus:ring-1 focus:ring-white transition-all min-h-[100px] sm:min-h-[120px] resize-none" value={createOriginalText} onChange={(e) => setCreateOriginalText(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button type="button" className="text-xs sm:text-sm px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-all h-9 sm:h-10" onClick={() => setCreateOpen(false)} disabled={createLoading}>🚫 Отмена</button>
            <button type="submit" disabled={createLoading} className="text-xs sm:text-sm px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-lg bg-white text-black hover:bg-gray-100 disabled:opacity-60 transition-all font-medium h-9 sm:h-10">{createLoading ? "⏳ Создаём..." : "✅ Создать"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

