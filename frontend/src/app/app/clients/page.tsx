"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  Workspace,
  CreateWorkspace,
} from "@/lib/api";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Workspace | null>(null);

  // Форма
  const [formData, setFormData] = useState<CreateWorkspace>({
    name: "",
    is_client: true,
    client_name: "",
    client_contact: "",
    client_notes: "",
    color: "#6366f1",
    seats_limit: 5,
    tags: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const data = await getWorkspaces(token);
      // Фильтруем только клиентские workspace
      setClients(data.filter((w) => w.is_client));
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        console.error("Failed to load clients:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingClient(null);
    setFormData({
      name: "",
      is_client: true,
      client_name: "",
      client_contact: "",
      client_notes: "",
      color: "#6366f1",
      seats_limit: 5,
      tags: "",
    });
    setShowModal(true);
  }

  function handleEdit(client: Workspace) {
    setEditingClient(client);
    setFormData({
      name: client.name,
      is_client: client.is_client,
      client_name: client.client_name,
      client_contact: client.client_contact,
      client_notes: client.client_notes,
      color: client.color,
      seats_limit: client.seats_limit,
      tags: client.tags,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      if (editingClient) {
        await updateWorkspace(token, editingClient.id, formData);
      } else {
        await createWorkspace(token, formData);
      }

      setShowModal(false);
      loadClients();
    } catch (error) {
      console.error("Failed to save client:", error);
      alert("❌ Ошибка сохранения клиента");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить клиента? Все посты останутся, но workspace будет удалён.")) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      await deleteWorkspace(token, id);
      loadClients();
    } catch (error) {
      console.error("Failed to delete client:", error);
      alert("❌ Ошибка удаления клиента");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Загрузка клиентов...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/app")}
              className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center gap-2"
            >
              ← Назад к постам
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">👥 Клиенты</h1>
            <p className="text-gray-400">
              Управление клиентскими проектами ({clients.length})
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Добавить клиента</span>
          </button>
        </div>

        {/* Список клиентов */}
        {clients.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-medium text-white mb-2">Нет клиентов</h3>
            <p className="text-gray-400 mb-6">Добавьте первого клиента</p>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              ➕ Добавить клиента
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 hover:border-blue-500/50 transition-all"
                style={{ borderLeftWidth: "4px", borderLeftColor: client.color }}
              >
                {/* Название проекта */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {client.name}
                  </h3>
                  {client.client_name && (
                    <p className="text-gray-400 text-sm">{client.client_name}</p>
                  )}
                </div>

                {/* Контакт */}
                {client.client_contact && (
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <span className="text-gray-400">📧</span>
                    <span className="text-gray-300">{client.client_contact}</span>
                  </div>
                )}

                {/* Заметки */}
                {client.client_notes && (
                  <div className="mb-4 p-3 bg-slate-700/50 rounded text-sm text-gray-300">
                    {client.client_notes}
                  </div>
                )}

                {/* Теги */}
                {client.tags_list && client.tags_list.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {client.tags_list.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-slate-700/70 text-slate-300 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Статистика */}
                <div className="mb-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">📝</span>
                    <span className="text-white font-medium">{client.posts_count}</span>
                    <span className="text-gray-400">постов</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">👥</span>
                    <span className="text-white font-medium">{client.seats_limit}</span>
                    <span className="text-gray-400">мест</span>
                  </div>
                </div>

                {/* Дата создания */}
                <div className="text-xs text-gray-500 mb-4">
                  Создан: {new Date(client.created_at).toLocaleDateString("ru-RU")}
                </div>

                {/* Действия */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/app/clients/${client.id}`)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      📊 Подробнее
                    </button>
                    <button
                      onClick={() => router.push(`/app?workspace=${client.id}`)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    >
                      🎯 Посты
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания/редактирования */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingClient ? "✏️ Редактировать клиента" : "➕ Новый клиент"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Название проекта */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Название проекта *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Например: Сайт для кофейни"
                  required
                />
              </div>

              {/* Название клиента */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Название клиента/компании
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder='Например: ООО "Ромашка" или Иван Петров'
                />
              </div>

              {/* Контакт */}
              <div>
                <label className="block text-white font-medium mb-2">Контакт</label>
                <input
                  type="text"
                  value={formData.client_contact}
                  onChange={(e) =>
                    setFormData({ ...formData, client_contact: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Email, телефон или Telegram"
                />
              </div>

              {/* Заметки */}
              <div>
                <label className="block text-white font-medium mb-2">Заметки</label>
                <textarea
                  value={formData.client_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, client_notes: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Любые заметки о клиенте или проекте"
                  rows={3}
                />
              </div>

              {/* Цвет */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Цвет для UI
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              {/* Теги */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Теги
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="срочно, премиум, активный (через запятую)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Введите теги через запятую для категоризации клиента
                </p>
              </div>

              {/* Количество мест */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Количество мест
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.seats_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seats_limit: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                >
                  {editingClient ? "💾 Сохранить" : "➕ Создать"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
