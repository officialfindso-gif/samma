"use client";

import React, { useState } from "react";
import type { Post } from "@/lib/api";
import { updatePost } from "@/lib/api";

export default function EditPostModal({
  post,
  accessToken,
  onSave,
  onClose,
}: {
  post: Post;
  accessToken: string;
  onSave: (updated: Post) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(post.title || "");
  const [originalText, setOriginalText] = useState(post.original_text || "");
  const [transcript, setTranscript] = useState(post.transcript || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updated = await updatePost(accessToken, post.id, {
        title: title || undefined,
        original_text: originalText || undefined,
        transcript: transcript || undefined,
      });
      onSave(updated);
      // onClose() вызывается внутри onSave (handleEditPost)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <span>Редактировать пост #{post.id}</span>
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">{error}</div>
          )}

          <div>
            <label className="block text-sm mb-2 text-gray-400 font-medium uppercase tracking-wide">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-base text-white outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all"
              placeholder="Введите заголовок..."
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-400 font-medium uppercase tracking-wide">Оригинальный текст</label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-base text-white outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none font-mono transition-all"
              rows={8}
              placeholder="Текст поста..."
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-gray-400 font-medium uppercase tracking-wide">Расшифровка</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-base text-white outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none font-mono transition-all"
              rows={6}
              placeholder="Расшифровка видео..."
            />
          </div>
        </div>

        {/* Footer - fixed */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-700 flex-shrink-0 bg-gray-900/50">
          <button 
            onClick={onClose} 
            className="text-xs px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="text-xs px-5 py-2 rounded-lg bg-white hover:bg-gray-100 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Сохранение...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                💾 Сохранить
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
