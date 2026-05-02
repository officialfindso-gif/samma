"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [autoScrapingEnabled, setAutoScrapingEnabled] = useState(true);
  const [scrapingHour, setScrapingHour] = useState(9);
  const [scrapingMinute, setScrapingMinute] = useState(0);

  useEffect(() => {
    async function loadSettings() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const [data, user] = await Promise.all([
          getSystemSettings(token),
          getCurrentUser(token),
        ]);

        setSettings(data);
        setIsSuperuser(!!user.is_superuser);
        setAutoScrapingEnabled(data.auto_scraping_enabled);
        setScrapingHour(data.scraping_hour);
        setScrapingMinute(data.scraping_minute);
      } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
          router.push("/login");
        } else {
          console.error("Failed to load settings:", error);
          alert("Не удалось загрузить настройки");
        }
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [router]);

  async function handleSave() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      setSaving(true);

      const updated = await updateSystemSettings(token, {
        auto_scraping_enabled: autoScrapingEnabled,
        scraping_hour: scrapingHour,
        scraping_minute: scrapingMinute,
      });

      setSettings(updated);
      alert("Настройки сохранены. Перезапустите Celery Beat для применения изменений.");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        console.error("Failed to save settings:", error);
        alert("Ошибка сохранения настроек");
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
          <h1 className="text-4xl font-bold text-white mb-2">Настройки системы</h1>
          <p className="text-gray-400">
            Управление автоматическим парсингом конкурентов
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg border border-gray-700/30 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            Автоматический парсинг
          </h2>

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScrapingEnabled}
                onChange={(e) => setAutoScrapingEnabled(e.target.checked)}
                className="w-6 h-6 rounded border-gray-600 bg-gray-900 text-white accent-white focus:ring-gray-600 focus:ring-offset-0"
              />
              <div>
                <span className="text-white font-medium">
                  Включить автоматический парсинг
                </span>
                <p className="text-gray-400 text-sm">
                  Система будет автоматически парсить конкурентов по расписанию
                </p>
              </div>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">
              Время запуска парсинга
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
                  onChange={(e) => setScrapingHour(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none"
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
                  onChange={(e) => setScrapingMinute(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none"
                />
              </div>
              <div className="ml-4 mt-6">
                <div className="text-2xl text-white font-mono">
                  {scrapingHour.toString().padStart(2, "0")}:
                  {scrapingMinute.toString().padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Время парсинга</div>
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

          {settings && (
            <div className="mb-6 p-4 bg-gray-900/40 rounded border border-gray-700/30">
              <h3 className="text-white font-medium mb-2">Информация</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <div>
                  <span className="text-gray-400">Последняя проверка:</span>{" "}
                  {settings.last_scraping_check
                    ? new Date(settings.last_scraping_check).toLocaleString("ru-RU")
                    : "Еще не выполнялась"}
                </div>
                <div>
                  <span className="text-gray-400">Обновлено:</span>{" "}
                  {new Date(settings.updated_at).toLocaleString("ru-RU")}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-white hover:bg-gray-100 disabled:bg-gray-700 text-black rounded font-medium transition-colors"
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
