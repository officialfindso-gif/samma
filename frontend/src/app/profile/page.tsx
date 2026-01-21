"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { 
  Workspace, 
  UserSubscription, 
  SubscriptionPlan, 
  User 
} from "@/lib/api";
import { 
  getWorkspaces, 
  getUserSubscriptions, 
  getCurrentUser 
} from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // читаем токен из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  // загружаем данные пользователя
  useEffect(() => {
    if (!accessToken) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Получаем информацию о пользователе
        const userData = await getCurrentUser(accessToken);
        setUser(userData);

        // Загружаем воркспейсы
        const wsData = await getWorkspaces(accessToken);
        setWorkspaces(wsData);

        // Загружаем подписки пользователя
        const subsData = await getUserSubscriptions(accessToken);
        setSubscriptions(subsData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Не удалось загрузить данные пользователя");
        if (err.message === "Unauthorized") {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [accessToken, router]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-semibold text-slate-200">mini_notion</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="text-sm text-slate-400 hover:text-red-400"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:gap-8">
          {/* Боковая панель */}
          <aside className="lg:w-1/4 mb-8 lg:mb-0">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mb-4">
                  <span className="text-xl font-semibold">
                    {user?.username?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <h2 className="text-lg font-semibold">{user?.username}</h2>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>

              <nav className="mt-8">
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#profile"
                      className="block px-3 py-2 rounded-md text-sm bg-sky-600/80"
                    >
                      Профиль
                    </a>
                  </li>
                  <li>
                    <a
                      href="#subscriptions"
                      className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Подписки
                    </a>
                  </li>
                  <li>
                    <a
                      href="#security"
                      className="block px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Безопасность
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Основной контент */}
          <div className="lg:w-3/4">
            {error && (
              <div className="mb-6 p-4 rounded-md bg-red-900/50 border border-red-800">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Профиль */}
            <section id="profile" className="mb-8">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Информация профиля</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Имя пользователя
                    </label>
                    <p className="text-slate-200">{user?.username}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Email
                    </label>
                    <p className="text-slate-200">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Имя
                    </label>
                    <p className="text-slate-200">{user?.first_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Фамилия
                    </label>
                    <p className="text-slate-200">{user?.last_name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Дата регистрации
                    </label>
                    <p className="text-slate-200">
                      {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Статус
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user?.is_active 
                        ? "bg-green-900/50 text-green-300" 
                        : "bg-red-900/50 text-red-300"
                    }`}>
                      {user?.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Подписки */}
            <section id="subscriptions" className="mb-8">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Ваши подписки</h2>

                {subscriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">У вас нет активных подписок</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-sm"
                      onClick={() => router.push('/pricing')}
                    >
                      Выбрать тариф
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Тариф
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Воркспейс
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Статус
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Дата начала
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Дата окончания
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                              {typeof sub.plan === 'object' ? sub.plan.name : sub.plan}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                              {typeof sub.workspace === 'object' ? sub.workspace.name : sub.workspace}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                sub.is_active 
                                  ? "bg-green-900/50 text-green-300" 
                                  : "bg-red-900/50 text-red-300"
                              }`}>
                                {sub.is_active ? "Активна" : "Неактивна"}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                              {new Date(sub.start_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                              {new Date(sub.end_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Воркспейсы */}
            <section id="workspaces" className="mb-8">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-6">Ваши воркспейсы</h2>

                {workspaces.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">У вас нет воркспейсов</p>
                    <button className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-sm">
                      Создать воркспейс
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workspaces.map((workspace) => (
                      <div 
                        key={workspace.id} 
                        className="border border-slate-700 rounded-lg p-4 hover:bg-slate-800/50 transition-colors"
                      >
                        <h3 className="font-medium text-slate-200">{workspace.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Участников: {workspace.seats_limit}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <button className="text-xs px-3 py-1 rounded-md bg-sky-600 hover:bg-sky-500">
                            Открыть
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}