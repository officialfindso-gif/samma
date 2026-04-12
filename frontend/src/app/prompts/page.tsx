"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Workspace, Prompt } from "@/lib/api";
import {
  getWorkspaces,
  getPrompts,
  updatePrompt,
  createPrompt,
} from "@/lib/api";

export default function PromptsPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(
    null
  );

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // локальное состояние формы
  const [name, setName] = useState("");
  const [type, setType] = useState<Prompt["type"]>("caption");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  // читаем токен
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  // грузим воркспейсы
  useEffect(() => {
    if (!accessToken) return;

    setLoadingWorkspaces(true);
    setError(null);

    getWorkspaces(accessToken)
      .then((ws: Workspace[]) => {
        setWorkspaces(ws);
        if (ws.length > 0) {
          setActiveWorkspaceId(ws[0].id);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить воркспейсы"
        );
        if (err instanceof Error && err.message === "Unauthorized") {
          router.push("/login");
        }
      })
      .finally(() => setLoadingWorkspaces(false));
  }, [accessToken, router]);

  // грузим промпты
  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;

    setLoadingPrompts(true);
    setError(null);

    getPrompts(accessToken, activeWorkspaceId)
      .then((list: Prompt[]) => {
        setPrompts(list);
        if (list.length > 0) {
          const firstPrompt = list[0];
          setSelectedPrompt(firstPrompt);
          setName(firstPrompt.name);
          setType(firstPrompt.type);
          setContent(firstPrompt.content);
          setIsActive(firstPrompt.is_active);
        } else {
          // если нет промптов — очистим форму
          clearForm();
          setSelectedPrompt(null);
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить промпты"
        );
      })
      .finally(() => setLoadingPrompts(false));
  }, [accessToken, activeWorkspaceId]);

  function clearForm() {
    setName("");
    setType("caption");
    setContent("");
    setIsActive(true);
  }

  function selectPrompt(prompt: Prompt) {
    try {
      setSelectedPrompt(prompt);
      setName(prompt.name);
      setType(prompt.type);
      setContent(prompt.content);
      setIsActive(prompt.is_active);
    } catch (err) {
      console.error("Error selecting prompt:", err);
      setError("Ошибка при выборе промпта");
    }
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
          name,
          type,
          content,
          is_active: isActive,
        });
      } else {
        saved = await createPrompt(accessToken, {
          workspace: activeWorkspaceId,
          name,
          type,
          content,
          is_active: isActive,
        });
      }

      // обновляем список
      const list = await getPrompts(accessToken, activeWorkspaceId);
      setPrompts(list);

      const updated = list.find((p) => p.id === saved.id) ?? saved;
      selectPrompt(updated);
    } catch (err: unknown) {
      console.error("Save error:", err);
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить промпт"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNewPrompt() {
    setSelectedPrompt(null);
    clearForm();
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/login");
  }

  if (!accessToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-black text-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900/60 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-sm text-gray-200">
            mini_notion
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-400"
          >
            Выйти
          </button>
        </div>

        <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Воркспейсы
        </div>

        <div className="space-y-1 overflow-y-auto">
          {loadingWorkspaces && (
            <div className="text-xs text-gray-400">
              Загрузка воркспейсов...
            </div>
          )}

          {!loadingWorkspaces && workspaces.length === 0 && (
            <div className="text-xs text-gray-500">
              Воркспейсов пока нет.
            </div>
          )}

          {workspaces.map((ws: Workspace) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-full text-left px-2 py-1 text-sm rounded-md ${
                activeWorkspaceId === ws.id
                  ? "bg-white/80"
                  : "hover:bg-gray-800"
              }`}
            >
              {ws.name}
              <div className="text-[10px] text-gray-300">
                seats: {ws.seats_limit}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Промпты</h1>
            {activeWorkspaceId && (
              <div className="text-xs text-gray-400 mt-1">
                workspace #{activeWorkspaceId}
              </div>
            )}
          </div>

          <button
            onClick={handleNewPrompt}
            className="text-xs px-3 py-2 rounded-md bg-gray-600 hover:bg-gray-600"
            disabled={!activeWorkspaceId}
          >
            + Новый промпт
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-gray-400">
            {error}
          </div>
        )}

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* список промптов */}
          <div className="w-64 flex-shrink-0 bg-gray-900/70 border border-gray-800 rounded-xl p-3 overflow-y-auto">
            {loadingPrompts ? (
              <div className="text-xs text-gray-400">
                Загрузка промптов...
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-xs text-gray-500">
                Промптов пока нет. Создай первый.
              </div>
            ) : (
              <ul className="space-y-1">
                {prompts.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => selectPrompt(p)}
                      className={`w-full text-left px-2 py-2 rounded-md text-xs ${
                        selectedPrompt && selectedPrompt.id === p.id
                          ? "bg-white/80"
                          : "hover:bg-gray-800"
                      }`}
                    >
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-[10px] text-gray-300">
                        {p.type} {p.is_active ? "· active" : "· disabled"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* редактор промпта */}
          <div className="flex-1 bg-gray-900/70 border border-gray-800 rounded-xl p-4 flex flex-col">
            <form onSubmit={handleSave} className="flex-1 flex flex-col">
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1 text-gray-400">
                    Название промпта
                  </label>
                  <input
                    className="w-full rounded-md bg-black border border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Тип
                  </label>
                  <select
                    className="rounded-md bg-black border border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-100"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as Prompt["type"])
                    }
                  >
                    <option value="caption">caption</option>
                    <option value="script">script</option>
                    <option value="other">other</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 mt-6 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Активен
                </label>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs mb-1 text-gray-400">
                  Текст промпта
                </label>
                <textarea
                  className="flex-1 rounded-md bg-black border border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-100 resize-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="text-xs px-3 py-2 rounded-md bg-gray-600 hover:bg-gray-600 disabled:opacity-60"
                >
                  {saving ? "Сохраняем..." : "Сохранить промпт"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

