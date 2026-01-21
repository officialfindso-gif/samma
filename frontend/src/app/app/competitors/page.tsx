"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCompetitorAccounts,
  createCompetitorAccount,
  updateCompetitorAccount,
  deleteCompetitorAccount,
  scrapeCompetitorAccount,
  scrapeAllCompetitors,
  getWorkspaces,
  type CompetitorAccount,
  type CreateCompetitorAccount,
  type Workspace,
} from "@/lib/api";

export default function CompetitorsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<CompetitorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Форма добавления
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateCompetitorAccount>({
    workspace: 0,
    platform: 'instagram',
    username: '',
    url: '',
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      getWorkspaces(accessToken),
      getCompetitorAccounts(accessToken)
    ])
      .then(([ws, accs]) => {
        setWorkspaces(ws);
        setAccounts(accs);
        
        // Выбираем первый workspace по умолчанию
        if (ws.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(ws[0].id);
          setFormData(prev => ({ ...prev, workspace: ws[0].id }));
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        if (err.message === "Unauthorized") {
          localStorage.removeItem("accessToken");
          router.push("/login");
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [accessToken, router, selectedWorkspaceId]);

  const handleWorkspaceChange = (workspaceId: number) => {
    setSelectedWorkspaceId(workspaceId);
    setFormData(prev => ({ ...prev, workspace: workspaceId }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    try {
      const newAccount = await createCompetitorAccount(accessToken, formData);
      setAccounts([newAccount, ...accounts]);
      setShowForm(false);
      setFormData({
        workspace: selectedWorkspaceId || 0,
        platform: 'instagram',
        username: '',
        url: '',
        is_active: true,
        notes: '',
      });
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  };

  const handleToggleActive = async (account: CompetitorAccount) => {
    if (!accessToken) return;

    try {
      const updated = await updateCompetitorAccount(accessToken, account.id, {
        is_active: !account.is_active
      });
      setAccounts(accounts.map(a => a.id === account.id ? updated : a));
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken) return;
    if (!confirm("Удалить аккаунт конкурента?")) return;

    try {
      await deleteCompetitorAccount(accessToken, id);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  };

  const handleScrape = async (id: number) => {
    if (!accessToken) return;

    try {
      const result = await scrapeCompetitorAccount(accessToken, id);
      alert(`✅ ${result.message}\nПарсинг запущен в фоне`);
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  };

  const handleScrapeAll = async () => {
    if (!accessToken) return;
    if (!confirm("Запустить парсинг постов для всех активных конкурентов?")) return;

    try {
      const result = await scrapeAllCompetitors(accessToken);
      alert(`✅ ${result.message}\nПарсинг запущен в фоне`);
    } catch (err) {
      alert(`Ошибка: ${err}`);
    }
  };

  const filteredAccounts = selectedWorkspaceId
    ? accounts.filter(a => a.workspace === selectedWorkspaceId)
    : accounts;

  const platformEmoji: Record<string, string> = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '▶️',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-red-400">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/app")}
            className="text-gray-400 hover:text-white mb-2"
          >
            ← Назад
          </button>
          <h1 className="text-3xl font-bold">👀 Конкуренты</h1>
          <p className="text-gray-400 mt-1">
            Отслеживайте аккаунты конкурентов для анализа их контента
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScrapeAll}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition border border-green-500/50"
            title="Спарсить посты всех активных конкурентов"
          >
            🔄 Спарсить всех
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
          >
            {showForm ? '❌ Отмена' : '➕ Добавить аккаунт'}
          </button>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block">Workspace:</label>
        <select
          value={selectedWorkspaceId || ''}
          onChange={(e) => handleWorkspaceChange(Number(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full max-w-md"
        >
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Добавить аккаунт конкурента</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Платформа:</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full"
                required
              >
                <option value="instagram">📷 Instagram</option>
                <option value="tiktok">🎵 TikTok</option>
                <option value="youtube">▶️ YouTube</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Username:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full"
                placeholder="username или название канала"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm mb-1 block">URL:</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full"
                placeholder="https://instagram.com/username"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-gray-400 text-sm mb-1 block">Заметки (опционально):</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full"
                placeholder="Почему отслеживаем этот аккаунт..."
                rows={3}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-gray-400 text-sm">Активен (отслеживать)</label>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg hover:from-green-600 hover:to-blue-700 transition font-semibold"
              >
                ✅ Добавить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAccounts.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
            <p className="text-gray-400 text-lg">
              Пока нет добавленных аккаунтов конкурентов.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Нажмите "Добавить аккаунт" чтобы начать отслеживание
            </p>
          </div>
        )}

        {filteredAccounts.map(account => (
          <div
            key={account.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{platformEmoji[account.platform]}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{account.username}</h3>
                    <p className="text-sm text-gray-400 capitalize">{account.platform}</p>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs ${
                      account.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {account.is_active ? '✓ Активен' : '⏸ Приостановлен'}
                  </span>
                </div>

                <a
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  🔗 {account.url}
                </a>

                {account.notes && (
                  <p className="text-gray-400 text-sm mt-2 italic">{account.notes}</p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>Добавлен: {new Date(account.created_at).toLocaleDateString('ru')}</span>
                  {account.last_scraped_at && (
                    <span>Последний парсинг: {new Date(account.last_scraped_at).toLocaleDateString('ru')}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleScrape(account.id)}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition"
                  title="Спарсить последние посты"
                >
                  🔄
                </button>
                <button
                  onClick={() => handleToggleActive(account)}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    account.is_active
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  }`}
                  title={account.is_active ? 'Приостановить' : 'Активировать'}
                >
                  {account.is_active ? '⏸' : '▶️'}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition"
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
