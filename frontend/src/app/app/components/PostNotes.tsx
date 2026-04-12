"use client";

import React, { useState, useEffect, FormEvent } from "react";
import {
  getPostNotes,
  createPostNote,
  deletePostNote,
  type PostNote,
} from "@/lib/api";

export default function PostNotes({
  postId,
  accessToken,
}: {
  postId: number;
  accessToken: string;
}) {
  const [notes, setNotes] = useState<PostNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !postId) return;
    setLoading(true);
    getPostNotes(accessToken, postId)
      .then(setNotes)
      .catch((err) => {
        console.error(err);
        setError("Failed to load notes");
      })
      .finally(() => setLoading(false));
  }, [accessToken, postId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const created = await createPostNote(accessToken, {
        post: postId,
        content: newNote.trim(),
      });
      setNotes((prev) => [created, ...prev]);
      setNewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deletePostNote(accessToken, id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded p-2">
          {error}
        </div>
      )}

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Добавить заметку..."
          className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-500 resize-none placeholder-gray-500"
          rows={2}
        />
        <button
          type="submit"
          disabled={saving || !newNote.trim()}
          className="text-xs px-3 py-1.5 bg-white hover:bg-gray-100 text-black rounded font-medium disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "➕ Добавить заметку"}
        </button>
      </form>

      {/* Notes List */}
      {loading ? (
        <div className="text-xs text-gray-500">Загрузка заметок...</div>
      ) : notes.length === 0 ? (
        <div className="text-xs text-gray-600 italic">Заметок пока нет.</div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-2 bg-gray-900/50 border border-gray-700/30 rounded text-xs group relative"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-gray-300 whitespace-pre-wrap break-words flex-1">
                  {note.content}
                </p>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity flex-shrink-0"
                  title="Delete note"
                >
                  🗑️
                </button>
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                {note.author_name || "Anonymous"} •{" "}
                {new Date(note.created_at).toLocaleString("ru-RU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
