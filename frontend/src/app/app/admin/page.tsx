"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminStats, getAdminApiErrors, getSystemSettings, updateSystemSettings, type AdminStats, type AdminApiErrors, type SystemSettings } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [apiErrors, setApiErrors] = useState<AdminApiErrors | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [maxParseDepth, setMaxParseDepth] = useState(10);
  const [maxWorkspaces, setMaxWorkspaces] = useState(5);
  const [maxApiCalls, setMaxApiCalls] = useState(500);
  const [savingDepth, setSavingDepth] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  useEffect(() => {
    if (!accessToken) return;
    
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const [statsData, settingsData, errorsData] = await Promise.all([
          getAdminStats(accessToken),
          getSystemSettings(accessToken),
          getAdminApiErrors(accessToken),
        ]);
        setStats(statsData);
        setSystemSettings(settingsData);
        setApiErrors(errorsData);
        setMaxParseDepth(settingsData.max_parse_depth || 10);
        setMaxWorkspaces(settingsData.max_workspaces_per_user || 5);
        setMaxApiCalls(settingsData.max_api_calls_per_day || 500);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Ошибка загрузки статистики");
        if (err instanceof Error && err.message.includes("Unauthorized")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [accessToken, router]);

  const handleSaveDepth = async () => {
    try {
      setSavingDepth(true);
      await updateSystemSettings(accessToken!, { max_parse_depth: maxParseDepth });
      alert("✅ Глубина парсинга обновлена!");
    } catch (err) {
      alert("❌ Ошибка сохранения");
    } finally {
      setSavingDepth(false);
    }
  };

  const handleSaveLimits = async () => {
    try {
      setSavingLimits(true);
      await updateSystemSettings(accessToken!, {
        max_workspaces_per_user: maxWorkspaces,
        max_api_calls_per_day: maxApiCalls,
      });
      alert("✅ Лимиты обновлены!");
    } catch (err) {
      alert("❌ Ошибка сохранения");
    } finally {
      setSavingLimits(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-gray-700 border border-gray-700 text-gray-800 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statusColors: Record<string, string> = {
    new: "bg-gray-700/50 text-gray-300",
    in_progress: "bg-amber-900/30 text-amber-300",
    ready: "bg-emerald-900/30 text-emerald-300",
    error: "bg-red-900/30 text-red-300",
  };

  const statusLabels: Record<string, string> = {
    new: "Новый",
    in_progress: "В обработке",
    ready: "Готов",
    error: "Ошибка",
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push("/app")}
            className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 text-sm"
          >
            ← Назад к постам
          </button>
          <h1 className="text-3xl font-bold text-white">📊 Админка</h1>
          <p className="mt-2 text-sm text-gray-400">
            Общая статистика и показатели платформы
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Управление глубиной парсинга */}
        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            📥 Глубина парсинга профилей
          </h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-white text-sm mb-1 font-medium">Количество публикаций (5-50)</label>
              <input
                type="number"
                min="5"
                max="50"
                value={maxParseDepth}
                onChange={(e) => setMaxParseDepth(Math.min(50, Math.max(5, parseInt(e.target.value) || 5)))}
                className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none"
              />
            </div>
            <div className="ml-4">
              <div className="text-2xl text-white font-mono">
                {maxParseDepth}
              </div>
              <div className="text-xs text-gray-400">публикаций из профиля</div>
            </div>
            <button
              onClick={handleSaveDepth}
              disabled={savingDepth}
              className="ml-auto px-6 py-2 bg-white hover:bg-gray-100 disabled:bg-gray-700 text-black rounded font-medium transition-colors"
            >
              {savingDepth ? "⏳ Сохранение..." : "💾 Сохранить"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Больше = полнее данные, но медленнее и больше расход кредитов API. Изменение применяется мгновенно.
          </p>
        </div>

        {/* Лимиты пользователей */}
        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            👥 Лимиты пользователей
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white text-sm mb-2 font-medium">Макс. воркспейсов на пользователя</label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxWorkspaces}
                onChange={(e) => setMaxWorkspaces(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Сколько воркспейсов может создать один пользователь</p>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-medium">Макс. API-вызовов в день</label>
              <input
                type="number"
                min="10"
                max="10000"
                step="10"
                value={maxApiCalls}
                onChange={(e) => setMaxApiCalls(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Лимит запросов к ScrapeCreators API на пользователя в сутки</p>
            </div>
          </div>
          <button
            onClick={handleSaveLimits}
            disabled={savingLimits}
            className="mt-4 px-6 py-2 bg-white hover:bg-gray-100 disabled:bg-gray-700 text-black rounded font-medium transition-colors"
          >
            {savingLimits ? "⏳ Сохранение..." : "💾 Сохранить лимиты"}
          </button>
        </div>

        {/* Дашборд ошибок API */}
        {apiErrors && (
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30 p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              🚨 Статистика API-ошибок
            </h2>
            
            {/* Метрики */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/30 rounded-xl p-3 text-center border border-gray-700/30">
                <div className="text-2xl font-bold text-white">{apiErrors.today_total}</div>
                <div className="text-xs text-gray-500">Всего сегодня</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center border border-gray-700/30">
                <div className={`text-2xl font-bold ${apiErrors.today_errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{apiErrors.today_errors}</div>
                <div className="text-xs text-gray-500">Ошибок сегодня</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center border border-gray-700/30">
                <div className="text-2xl font-bold text-amber-400">{apiErrors.week_errors}</div>
                <div className="text-xs text-gray-500">Ошибок за неделю</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 text-center border border-gray-700/30">
                <div className={`text-2xl font-bold ${apiErrors.success_rate >= 95 ? 'text-emerald-400' : apiErrors.success_rate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{apiErrors.success_rate}%</div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </div>
            </div>

            {/* Ошибки по платформам */}
            {Object.keys(apiErrors.platform_errors).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Ошибки по платформам</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(apiErrors.platform_errors).map(([platform, count]) => (
                    <span key={platform} className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/30 rounded-full text-xs text-gray-300">
                      {platform}: <span className="text-red-400 font-bold">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Последние ошибки */}
            {apiErrors.recent_errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Последние ошибки</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {apiErrors.recent_errors.map((err) => (
                    <div key={err.id} className="p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{err.username}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400">{err.platform}</span>
                        </div>
                        <span className="text-[10px] text-gray-600">{new Date(err.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">{err.url}</div>
                      <div className="text-xs text-red-400 mt-1">{err.error_message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Топ пользователей по ошибкам */}
            {apiErrors.top_error_users.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Топ пользователей по ошибкам</h3>
                <div className="flex flex-wrap gap-2">
                  {apiErrors.top_error_users.map((u) => (
                    <span key={u.username} className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/30 rounded-full text-xs text-gray-300">
                      {u.username}: <span className="text-amber-400 font-bold">{u.error_count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Основные метрики */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    Всего воркспейсов
                  </dt>
                  <dd className="text-3xl font-semibold text-white">
                    {stats.total_workspaces}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    Всего постов
                  </dt>
                  <dd className="text-3xl font-semibold text-white">
                    {stats.total_posts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-gray-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    За последние 7 дней
                  </dt>
                  <dd className="text-3xl font-semibold text-white">
                    {stats.recent_posts_week}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Статусы и платформы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Статусы постов */}
          <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                Статусы постов
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(stats.status_stats).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[status] || status}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Платформы */}
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30">
            <div className="px-6 py-4 border-b border-gray-700/30">
              <h2 className="text-lg font-semibold text-white">
                Распределение по платформам
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(stats.platform_stats).map(([platform, count]) => (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="px-3 py-1 bg-gray-700/50 text-white rounded-full text-sm font-medium">
                        {platform}
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Топ воркспейсов */}
        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30 mb-8">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h2 className="text-lg font-semibold text-white">
              🏆 Топ-5 воркспейсов по активности
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/30">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Постов
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {stats.top_workspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {ws.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {ws.is_client ? (
                        <span className="px-2 py-1 bg-indigo-900/30 text-indigo-300 rounded text-xs">
                          Клиент
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs">
                          Обычный
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      <span className="font-bold text-lg">{ws.posts_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Последние посты */}
        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-lg shadow-lg border border-gray-700/30">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h2 className="text-lg font-semibold text-white">
              📝 Последние 10 постов
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/30">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Воркспейс
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Платформа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Создан
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {stats.latest_posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {post.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {post.workspace_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {post.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.status] || 'bg-gray-700/50 text-gray-300'}`}>
                        {statusLabels[post.status] || post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(post.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

