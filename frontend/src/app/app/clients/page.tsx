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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg sm:text-xl">⏳ Загрузка клиентов...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.push("/app")}
              className="text-gray-400 hover:text-gray-300 mb-3 sm:mb-4 inline-flex items-center gap-2 text-sm sm:text-base transition-colors"
            >
              ← Назад к постам
            </button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">👥 Клиенты</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Управление клиентскими проектами ({clients.length})
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white hover:bg-gray-100 text-black rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap text-sm sm:text-base shadow-lg"
          >
            <span>➕</span>
            <span>Добавить</span>
          </button>
        </div>

        {/* Список клиентов */}
        {clients.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-xl border border-gray-700/30 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-5xl sm:text-6xl mb-4">👥</div>
            <h3 className="text-lg sm:text-xl font-medium text-white mb-2">Нет клиентов</h3>
            <p className="text-gray-400 mb-6 text-sm sm:text-base">Добавьте первого клиента</p>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-lg border border-gray-600"
            >
              ➕ Добавить клиента
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 rounded-xl border border-gray-700/30 p-4 sm:p-6 hover:border-gray-600 hover:shadow-lg transition-all shadow-sm"
                style={{ borderLeftWidth: "4px", borderLeftColor: client.color }}
              >
                {/* Название проекта */}
                <div className="mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                    {client.name}
                  </h3>
                  {client.client_name && (
                    <p className="text-gray-400 text-xs sm:text-sm">{client.client_name}</p>
                  )}
                </div>

                {/* Контакт */}
                {client.client_contact && (
                  <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-400">📧</span>
                    <span className="text-gray-300 truncate">{client.client_contact}</span>
                  </div>
                )}

                {/* Заметки */}
                {client.client_notes && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded text-xs sm:text-sm text-gray-300">
                    {client.client_notes}
                  </div>
                )}

                {/* Теги */}
                {client.tags_list && client.tags_list.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {client.tags_list.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-800/60 text-gray-300 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Статистика */}
                <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
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
                      className="flex-1 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm font-medium transition-colors border border-gray-600"
                    >
                      📊 Подробнее
                    </button>
                    <button
                      onClick={() => router.push(`/app?workspace=${client.id}`)}
                      className="flex-1 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm font-medium transition-colors border border-gray-600"
                    >
                      🎯 Посты
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="flex-1 px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm transition-colors"
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs sm:text-sm transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-xl border border-gray-700 shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingClient ? "✏️ Редактировать клиента" : "➕ Новый клиент"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Название проекта */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Название проекта *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                  placeholder="Например: Сайт для кофейни"
                  required
                />
              </div>

              {/* Название клиента */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Название клиента/компании
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                  placeholder='Например: ООО "Ромашка" или Иван Петров'
                />
              </div>

              {/* Контакт */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Контакт</label>
                <input
                  type="text"
                  value={formData.client_contact}
                  onChange={(e) =>
                    setFormData({ ...formData, client_contact: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                  placeholder="Email, телефон или Telegram"
                />
              </div>

              {/* Заметки */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">Заметки</label>
                <textarea
                  value={formData.client_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, client_notes: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                  placeholder="Любые заметки о клиенте или проекте"
                  rows={3}
                />
              </div>

              {/* Цвет */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Цвет для UI
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-20 h-10 rounded cursor-pointer border border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                    placeholder="#6366f1"
                  />
                </div>
              </div>

              {/* Теги */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Теги
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors placeholder-gray-500"
                  placeholder="срочно, премиум, активный (через запятую)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Введите теги через запятую для категоризации клиента
                </p>
              </div>

              {/* Количество мест */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
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
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-gray-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-white hover:bg-gray-200 text-black rounded font-medium transition-colors shadow-lg"
                >
                  {editingClient ? "💾 Сохранить" : "➕ Создать"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
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

