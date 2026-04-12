"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getWorkspaces,
  Workspace,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  WorkspaceActivity,
  CreateWorkspaceActivity,
} from "@/lib/api";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Workspace | null>(null);
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<WorkspaceActivity | null>(null);
  const [activityForm, setActivityForm] = useState<CreateWorkspaceActivity>({
    workspace: parseInt(clientId),
    activity_type: 'note',
    title: '',
    description: '',
  });

  useEffect(() => {
    loadClient();
    loadActivities();
  }, [clientId]);

  async function loadClient() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const workspaces = await getWorkspaces(token);
      const foundClient = workspaces.find((w) => w.id === parseInt(clientId) && w.is_client);
      
      if (foundClient) {
        setClient(foundClient);
      } else {
        router.push("/app/clients");
      }
    } catch (error) {
      console.error("Failed to load client:", error);
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadActivities() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const data = await getActivities(token, parseInt(clientId));
      setActivities(data);
    } catch (error) {
      console.error("Failed to load activities:", error);
    }
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      await createActivity(token, activityForm);
      setShowActivityModal(false);
      setActivityForm({
        workspace: parseInt(clientId),
        activity_type: 'note',
        title: '',
        description: '',
      });
      
      // Перезагружаем данные
      loadActivities();
      loadClient();
    } catch (error) {
      console.error("Failed to create activity:", error);
      alert("❌ Ошибка создания активности");
    }
  }

  async function handleDeleteActivity(activityId: number) {
    if (!confirm("Удалить активность?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      await deleteActivity(token, activityId);
      loadActivities();
      loadClient();
    } catch (error) {
      console.error("Failed to delete activity:", error);
      alert("❌ Ошибка удаления активности");
    }
  }

  async function handleEditActivity(activity: WorkspaceActivity) {
    setEditingActivity(activity);
    setActivityForm({
      workspace: activity.workspace,
      activity_type: activity.activity_type,
      title: activity.title,
      description: activity.description,
    });
    setShowActivityModal(true);
  }

  async function handleUpdateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!editingActivity) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      await updateActivity(token, editingActivity.id, {
        title: activityForm.title,
        description: activityForm.description,
        activity_type: activityForm.activity_type,
      });
      setShowActivityModal(false);
      setEditingActivity(null);
      loadActivities();
      loadClient();
    } catch (error) {
      console.error("Failed to update activity:", error);
      alert("❌ Ошибка обновления активности");
    }
  }

  const activityTypeEmoji = {
    note: '📝',
    call: '📞',
    meeting: '🤝',
    email: '📧',
    post_created: '✨',
    post_approved: '✅',
    payment: '💰',
    other: '📌',
  };

  const activityTypeLabel = {
    note: 'Заметка',
    call: 'Звонок',
    meeting: 'Встреча',
    email: 'Email',
    post_created: 'Создан пост',
    post_approved: 'Утверждён пост',
    payment: 'Оплата',
    other: 'Другое',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black-900 to-black-900 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Загрузка...</div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black-900 to-black-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/app/clients")}
            className="text-gray-600 hover:text-gray-600 mb-4 inline-flex items-center gap-2"
          >
            ← Назад к клиентам
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{client.name}</h1>
              {client.client_name && (
                <p className="text-xl text-gray-300">{client.client_name}</p>
              )}
              {client.client_contact && (
                <p className="text-gray-400 mt-2">📧 {client.client_contact}</p>
              )}
            </div>
            
            <button
              onClick={() => router.push(`/app?workspace=${client.id}`)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              🎯 Открыть посты
            </button>
          </div>

          {/* Теги */}
          {client.tags_list && client.tags_list.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {client.tags_list.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-700/70 text-slate-200 text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard - Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-3xl font-bold text-white mb-1">{client.posts_count}</div>
            <div className="text-sm text-gray-400">Всего постов</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-3xl font-bold text-white mb-1">{client.seats_limit}</div>
            <div className="text-sm text-gray-400">Мест в команде</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-3xl font-bold text-white mb-1">
              {Math.floor((new Date().getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-sm text-gray-400">Дней сотрудничества</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-3xl font-bold text-white mb-1">
              {client.recent_activities?.length || 0}
            </div>
            <div className="text-sm text-gray-400">Последних активностей</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Заметки */}
          {client.client_notes && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">📋 Заметки</h2>
              <div className="text-gray-300 whitespace-pre-wrap">{client.client_notes}</div>
            </div>
          )}

          {/* Последние активности */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📊 Активности ({activities.length})</h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded font-medium transition-colors"
              >
                ➕ Добавить
              </button>
            </div>
            
            {activities.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 bg-slate-700/50 rounded border-l-4 group relative"
                    style={{ borderLeftColor: client?.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {activityTypeEmoji[activity.activity_type]}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {activity.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({activityTypeLabel[activity.activity_type]})
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-gray-300 mb-1">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>👤 {activity.created_by_name}</span>
                          <span>•</span>
                          <span>{new Date(activity.created_at).toLocaleString("ru-RU")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditActivity(activity)}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="px-2 py-1 bg-gray-700 hover:bg-red-700 text-white text-xs rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>Пока нет активностей</p>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded font-medium transition-colors"
                >
                  ➕ Добавить первую активность
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Информация о проекте */}
        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">ℹ️ Информация о проекте</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Создан:</span>{" "}
              <span className="text-white">
                {new Date(client.created_at).toLocaleString("ru-RU")}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Обновлён:</span>{" "}
              <span className="text-white">
                {new Date(client.updated_at).toLocaleString("ru-RU")}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Цвет метки:</span>{" "}
              <span
                className="inline-block w-6 h-6 rounded ml-2 align-middle"
                style={{ backgroundColor: client.color }}
              />
            </div>
            <div>
              <span className="text-gray-400">ID workspace:</span>{" "}
              <span className="text-white">#{client.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно активности */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingActivity ? '✏️ Редактировать активность' : '➕ Новая активность'}
            </h2>

            <form onSubmit={editingActivity ? handleUpdateActivity : handleCreateActivity} className="space-y-4">
              {/* Тип активности */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Тип активности *
                </label>
                <select
                  value={activityForm.activity_type}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      activity_type: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gray-600 focus:outline-none"
                  required
                >
                  {Object.entries(activityTypeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {activityTypeEmoji[value as keyof typeof activityTypeEmoji]} {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Заголовок */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Заголовок *
                </label>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gray-600 focus:outline-none"
                  placeholder="Краткое описание активности"
                  required
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Описание
                </label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, description: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-gray-600 focus:outline-none"
                  placeholder="Подробное описание (опционально)"
                  rows={3}
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-600 text-white rounded font-medium transition-colors"
                >
                  {editingActivity ? '💾 Сохранить' : '➕ Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivityModal(false);
                    setEditingActivity(null);
                    setActivityForm({
                      workspace: parseInt(clientId),
                      activity_type: 'note',
                      title: '',
                      description: '',
                    });
                  }}
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
