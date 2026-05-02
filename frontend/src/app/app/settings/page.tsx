"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getWorkspaces,
  updateWorkspace,
  type Workspace,
} from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [autoScrapingEnabled, setAutoScrapingEnabled] = useState(false);
  const [scrapingHour, setScrapingHour] = useState(9);
  const [scrapingMinute, setScrapingMinute] = useState(0);

  useEffect(() => {
    async function loadPage() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const [user, workspaceList] = await Promise.all([
          getCurrentUser(token),
          getWorkspaces(token),
        ]);

        setIsSuperuser(!!user.is_superuser);
        setWorkspaces(workspaceList);
        if (workspaceList.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const requestedWorkspaceId = Number(params.get("workspace"));
          const requestedWorkspaceExists = workspaceList.some(
            (workspace) => workspace.id === requestedWorkspaceId
          );
          setSelectedWorkspaceId(
            requestedWorkspaceExists ? requestedWorkspaceId : workspaceList[0].id
          );
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
          router.push("/login");
        } else {
          console.error("Failed to load workspace settings:", error);
          alert("Не удалось загрузить настройки автопарсинга");
        }
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [router]);

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const canEditSettings = selectedWorkspace?.current_user_role !== "viewer" && !!selectedWorkspace;

  useEffect(() => {
    if (!selectedWorkspace) {
      return;
    }

    setAutoScrapingEnabled(selectedWorkspace.auto_scraping_enabled);
    setScrapingHour(selectedWorkspace.scraping_hour);
    setScrapingMinute(selectedWorkspace.scraping_minute);
  }, [selectedWorkspace]);

  async function handleSave() {
    if (!selectedWorkspaceId) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      setSaving(true);

      const updatedWorkspace = await updateWorkspace(token, selectedWorkspaceId, {
        auto_scraping_enabled: autoScrapingEnabled,
        scraping_hour: scrapingHour,
        scraping_minute: scrapingMinute,
      });

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
        )
      );
      alert("Настройки автопарсинга сохранены. Новое расписание применяется автоматически.");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        console.error("Failed to save workspace settings:", error);
        alert("Ошибка сохранения настроек автопарсинга");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Загрузка настроек...</div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/app")}
            className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 transition-colors"
          >
            Назад к постам
          </button>
          <div className="rounded-lg border border-gray-700/30 bg-gradient-to-br from-gray-900/60 to-gray-800/40 p-6 text-white">
            Нет доступных workspace для настройки автопарсинга.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/app")}
            className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 transition-colors"
          >
            Назад к постам
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Настройки автопарсинга</h1>
          <p className="text-gray-400">
            Параметры применяются отдельно для каждого workspace и начинают работать без рестарта Celery Beat.
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg border border-gray-700/30 p-6">
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Workspace</label>
            <select
              value={selectedWorkspaceId ?? ""}
              onChange={(e) => setSelectedWorkspaceId(Number(e.target.value))}
              className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-gray-600 focus:outline-none"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            {selectedWorkspace?.current_user_role && (
              <p className="mt-2 text-sm text-gray-400">
                Ваша роль: {selectedWorkspace.current_user_role}
              </p>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-6">Автоматический парсинг</h2>

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScrapingEnabled}
                onChange={(e) => setAutoScrapingEnabled(e.target.checked)}
                disabled={!canEditSettings}
                className="w-6 h-6 rounded border-gray-600 bg-gray-900 text-white accent-white focus:ring-gray-600 focus:ring-offset-0 disabled:opacity-50"
              />
              <div>
                <span className="text-white font-medium">
                  Включить автоматический парсинг
                </span>
                <p className="text-gray-400 text-sm">
                  Система будет автоматически парсить активных конкурентов только для выбранного workspace.
                </p>
              </div>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">
              Время запуска
            </label>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-white text-sm mb-1 font-medium">
                  Час (0-23)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={scrapingHour}
                  disabled={!canEditSettings}
                  onChange={(e) => setScrapingHour(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="text-white text-2xl mt-6">:</div>
              <div>
                <label className="block text-white text-sm mb-1 font-medium">
                  Минута (0-59)
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={scrapingMinute}
                  disabled={!canEditSettings}
                  onChange={(e) => setScrapingMinute(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="ml-4 mt-6">
                <div className="text-2xl text-white font-mono">
                  {scrapingHour.toString().padStart(2, "0")}:
                  {scrapingMinute.toString().padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Локальное время сервера</div>
              </div>
            </div>
          </div>

          {isSuperuser && (
            <div className="mb-6 p-4 bg-indigo-900/20 border border-indigo-700/30 rounded">
              <p className="text-sm text-indigo-300">
                <strong>Глубина парсинга профилей</strong> настраивается в разделе{" "}
                <button
                  onClick={() => router.push("/app/admin")}
                  className="underline hover:text-indigo-200"
                >
                  Админка
                </button>
              </p>
            </div>
          )}

          {selectedWorkspace && (
            <div className="mb-6 p-4 bg-gray-900/40 rounded border border-gray-700/30">
              <h3 className="text-white font-medium mb-2">Информация</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <div>
                  <span className="text-gray-400">Последний автозапуск:</span>{" "}
                  {selectedWorkspace.last_auto_scrape_at
                    ? new Date(selectedWorkspace.last_auto_scrape_at).toLocaleString("ru-RU")
                    : "Еще не запускался"}
                </div>
                <div>
                  <span className="text-gray-400">Обновлено:</span>{" "}
                  {new Date(selectedWorkspace.updated_at).toLocaleString("ru-RU")}
                </div>
              </div>
            </div>
          )}

          {!canEditSettings && (
            <div className="mb-6 rounded border border-amber-700/30 bg-amber-900/20 p-4 text-sm text-amber-300">
              Недостаточно прав для изменения настроек этого workspace.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !canEditSettings}
              className="px-6 py-3 bg-white hover:bg-gray-100 disabled:bg-gray-700 disabled:text-gray-300 text-black rounded font-medium transition-colors"
            >
              {saving ? "Сохранение..." : "Сохранить настройки"}
            </button>
            <button
              onClick={() => router.push("/app")}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
