"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSystemSettings, updateSystemSettings, SystemSettings } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Форма
  const [autoScrapingEnabled, setAutoScrapingEnabled] = useState(true);
  const [scrapingHour, setScrapingHour] = useState(9);
  const [scrapingMinute, setScrapingMinute] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const data = await getSystemSettings(token);
      setSettings(data);
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
      alert("✅ Настройки сохранены! Перезапустите Celery Beat для применения изменений.");
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        console.error("Failed to save settings:", error);
        alert("❌ Ошибка сохранения настроек");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/app")}
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center gap-2"
          >
            ← Назад к постам
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">
            ⚙️ Настройки системы
          </h1>
          <p className="text-gray-400">
            Управление автоматическим парсингом конкурентов
          </p>
        </div>

        {/* Карточка настроек */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">
            🤖 Автоматический парсинг
          </h2>

          {/* Включить/выключить */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScrapingEnabled}
                onChange={(e) => setAutoScrapingEnabled(e.target.checked)}
                className="w-6 h-6 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
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

          {/* Время запуска */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-3">
              ⏰ Время запуска парсинга
            </label>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Час (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={scrapingHour}
                  onChange={(e) => setScrapingHour(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="text-white text-2xl mt-6">:</div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Минута (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={scrapingMinute}
                  onChange={(e) => setScrapingMinute(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="ml-4 mt-6">
                <div className="text-2xl text-blue-400 font-mono">
                  {scrapingHour.toString().padStart(2, "0")}:
                  {scrapingMinute.toString().padStart(2, "0")}
                </div>
                <div className="text-xs text-gray-400">Текущее время</div>
              </div>
            </div>
          </div>

          {/* Информация */}
          {settings && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded border border-slate-600">
              <h3 className="text-white font-medium mb-2">📊 Информация</h3>
              <div className="text-sm text-gray-300 space-y-1">
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

          {/* Кнопки действий */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
            >
              {saving ? "⏳ Сохранение..." : "💾 Сохранить настройки"}
            </button>
            <button
              onClick={() => router.push("/app")}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
