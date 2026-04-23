"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Workspace, Prompt } from "@/lib/api";
import {
  getWorkspaces,
  getPrompts,
  updatePrompt,
  createPrompt,
  setDefaultPrompt,
  deletePrompt,
} from "@/lib/api";

const PROMPT_TYPES: { value: Prompt["type"]; label: string; icon: string }[] = [
  { value: "original", label: "Оригинал", icon: "🧹" },
  { value: "caption", label: "Подпись", icon: "📝" },
  { value: "script", label: "Скрипт", icon: "🎬" },
  { value: "title", label: "Заголовок", icon: "🏷️" },
  { value: "description", label: "Описание", icon: "📖" },
];

export default function PromptsPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<Prompt["type"]>("caption");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) { router.push("/login"); return; }
    setAccessToken(token);
  }, [router]);

  // Workspaces
  useEffect(() => {
    if (!accessToken) return;
    setLoadingWorkspaces(true);
    setError(null);
    getWorkspaces(accessToken)
      .then((ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) setActiveWorkspaceId(ws[0].id);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить воркспейсы");
      })
      .finally(() => setLoadingWorkspaces(false));
  }, [accessToken]);

  // Prompts
  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;
    setLoadingPrompts(true);
    setError(null);
    getPrompts(accessToken, activeWorkspaceId)
      .then((list) => setPrompts(list))
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить промпты");
      })
      .finally(() => setLoadingPrompts(false));
  }, [accessToken, activeWorkspaceId]);

  // Когда выбрали промпт — заполняем форму
  useEffect(() => {
    if (selectedPrompt) {
      setName(selectedPrompt.name);
      setType(selectedPrompt.type);
      setContent(selectedPrompt.content);
      setIsActive(selectedPrompt.is_active);
    }
  }, [selectedPrompt]);

  function clearForm() {
    setSelectedPrompt(null);
    setName("");
    setType("caption");
    setContent("");
    setIsActive(true);
  }

  function selectPrompt(prompt: Prompt) {
    setIsCreating(false);
    setSelectedPrompt(prompt);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !activeWorkspaceId) {
      setError("Нет токена или workspace не выбран");
      return;
    }
    if (!name.trim() || !content.trim()) {
      setError("Название и текст промпта обязательны");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let saved: Prompt;
      if (selectedPrompt) {
        saved = await updatePrompt(accessToken, selectedPrompt.id, {
          name, type, content, is_active: isActive,
        });
      } else {
        saved = await createPrompt(accessToken, {
          workspace: activeWorkspaceId,
          name, type,
          content, is_active: isActive,
        });
      }

      const list = await getPrompts(accessToken, activeWorkspaceId);
      setPrompts(list);

      const updated = list.find((p) => p.id === saved.id) ?? saved;
      selectPrompt(updated);
      setIsCreating(false);
      setError(null);
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Не удалось сохранить промпт");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(promptId: number) {
    if (!accessToken) return;
    try {
      setError(null);
      await setDefaultPrompt(accessToken, promptId);
      const list = await getPrompts(accessToken, activeWorkspaceId!);
      setPrompts(list);
    } catch (err) {
      console.error("Set default error:", err);
      setError(err instanceof Error ? err.message : "Не удалось установить дефолтный промпт");
    }
  }

  async function handleDelete(promptId: number) {
    if (!accessToken) return;
    if (!confirm("Удалить этот промпт?")) return;
    try {
      setError(null);
      await deletePrompt(accessToken, promptId);
      const list = await getPrompts(accessToken, activeWorkspaceId!);
      setPrompts(list);
      if (selectedPrompt?.id === promptId) {
        setSelectedPrompt(null);
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Не удалось удалить промпт");
    }
  }

  function handleNewPrompt() {
    setIsCreating(true);
    clearForm();
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/login");
  }

  function cancelCreate() {
    setIsCreating(false);
    setSelectedPrompt(null);
  }

  // Группируем промпты по типу
  const promptsByType: Record<string, Prompt[]> = {};
  for (const p of prompts) {
    if (!promptsByType[p.type]) promptsByType[p.type] = [];
    promptsByType[p.type].push(p);
  }

  const typeInfo = PROMPT_TYPES.find((t) => t.value === type);

  if (!accessToken) return null;

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-gray-700 bg-black p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-sm text-white">mini_notion</span>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-300">Выйти</button>
        </div>
        <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Воркспейсы</div>
        <div className="space-y-1 overflow-y-auto">
          {loadingWorkspaces && <div className="text-xs text-gray-400">Загрузка...</div>}
          {!loadingWorkspaces && workspaces.length === 0 && <div className="text-xs text-gray-500">Нет воркспейсов</div>}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-full text-left px-2 py-1 text-sm rounded-md ${activeWorkspaceId === ws.id ? "bg-white text-black font-medium" : "hover:bg-gray-700 text-white"}`}
            >
              {ws.name}
              <div className="text-[10px] text-gray-400">seats: {ws.seats_limit}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 flex flex-col">
        <button
          onClick={() => router.push("/app")}
          className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 text-sm self-start"
        >
          ← Назад к постам
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📋 Промпты</h1>
            {activeWorkspaceId && <div className="text-xs text-gray-400 mt-1">workspace #{activeWorkspaceId}</div>}
          </div>
          <button
            onClick={handleNewPrompt}
            className="text-xs px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-black font-medium transition-colors"
            disabled={!activeWorkspaceId}
          >
            ➕ Новый промпт
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">{error}</div>}

        <div className="mb-4 text-sm text-gray-400">
          Создай <strong className="text-white">5 промптов</strong> — по одному для каждого типа. При нажатии &laquo;Обработать&raquo; все активные будут использованы.
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* LEFT: 4 type groups */}
          <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
            {PROMPT_TYPES.map((t) => {
              const typePrompts = promptsByType[t.value] || [];
              const defaultPrompt = typePrompts.find((p) => p.is_default);
              return (
                <div key={t.value} className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-white">
                      {t.icon} {t.label}
                    </div>
                    {defaultPrompt && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Default</span>
                    )}
                  </div>
                  {typePrompts.length === 0 ? (
                    <div className="text-[10px] text-gray-500">Нет промптов</div>
                  ) : (
                    <ul className="space-y-1">
                      {typePrompts.map((p) => (
                        <li key={p.id}>
                          <div
                            onClick={() => selectPrompt(p)}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                              selectedPrompt?.id === p.id
                                ? "bg-white text-black font-medium"
                                : "hover:bg-gray-700/50 text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate flex-1">{p.name}</span>
                              {!p.is_active && <span className="text-[9px] text-gray-500 ml-1">off</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {!p.is_default && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSetDefault(p.id); }}
                                  className="text-[9px] text-gray-500 hover:text-emerald-400 transition-colors"
                                >
                                  ⭐ Дефолтный
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                className="text-[9px] text-gray-500 hover:text-red-400 transition-colors"
                              >
                                🗑️ Удалить
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Editor */}
          <div className="flex-1 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl p-4 flex flex-col">
            {(!selectedPrompt && !isCreating) ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Выбери промпт слева или создай новый
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex-1 flex flex-col">
                {isCreating && (
                  <div className="mb-3 text-xs text-blue-400 bg-blue-900/20 border border-blue-800/30 rounded-lg p-2.5">
                    ✨ Создание нового промпта
                    <button type="button" onClick={cancelCreate} className="ml-2 text-gray-400 hover:text-white">✕ Отмена</button>
                  </div>
                )}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs mb-1 text-white font-medium">Название</label>
                    <input
                      className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-600 placeholder-gray-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-white font-medium">Тип</label>
                    {selectedPrompt ? (
                      <div className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-400">
                        {typeInfo?.icon} {typeInfo?.label} <span className="text-[10px] text-gray-500">(нельзя изменить)</span>
                      </div>
                    ) : (
                      <select
                        className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-600"
                        value={type}
                        onChange={(e) => setType(e.target.value as Prompt["type"])}
                      >
                        {PROMPT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <label className="flex items-center gap-2 mt-6 text-xs text-white shrink-0">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-white" />
                    Активен
                  </label>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="block text-xs mb-1 text-white font-medium">Текст промпта</label>
                  <textarea
                    className="flex-1 rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-600 resize-none placeholder-gray-500 font-mono"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button type="submit" disabled={saving} className="text-xs px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-black font-medium transition-colors disabled:opacity-60">
                    {saving ? "Сохраняем..." : "💾 Сохранить"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
