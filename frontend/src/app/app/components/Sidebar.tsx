"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/api";

export default function Sidebar({
  workspaces,
  loading,
  activeWorkspaceId,
  setActiveWorkspaceId,
  handleLogout,
  sidebarOpen,
  setSidebarOpen,
  isStaff,
}: {
  workspaces: Workspace[];
  loading: boolean;
  activeWorkspaceId: number | null;
  setActiveWorkspaceId: (id: number) => void;
  handleLogout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isStaff?: boolean;
}) {
  const router = useRouter();

  return (
    <aside className={`
      w-56 sm:w-64 lg:w-64 2xl:w-72 border-r border-zinc-800 bg-black/95 backdrop-blur-xl p-4 lg:p-5 flex flex-col
      fixed lg:static inset-y-0 left-0 z-40 shadow-2xl
      transform transition-transform duration-300 lg:transform-none
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <span className="font-bold text-lg sm:text-xl 2xl:text-2xl text-white">mini_notion</span>
        <button onClick={handleLogout} className="text-xs sm:text-sm text-gray-400 hover:text-gray-400 transition-colors px-2 py-1 rounded hover:bg-gray-800/30 h-9 w-9 flex items-center justify-center">Выйти</button>
      </div>

      <div className="mb-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">Воркспейсы</div>

      <div className="space-y-1 overflow-y-auto mb-6 flex-1">
        {loading && <div className="text-xs text-gray-400">Загружка воркспейсов...</div>}
        {!loading && workspaces.length === 0 && <div className="text-xs text-gray-500">Воркспейсов пока нет.</div>}

        {workspaces.map((ws) => (
          <button key={ws.id} onClick={() => { setActiveWorkspaceId(ws.id); setSidebarOpen(false); }} className={`w-full text-left px-3 py-2 sm:py-3 text-xs sm:text-sm rounded-lg transition-all ${activeWorkspaceId === ws.id ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-300'}`}>
            <div className="font-medium truncate">{ws.name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">👥 {ws.seats_limit} seats</div>
          </button>
        ))}
      </div>

      {/* Navigation Menu */}
      <div className="border-t border-zinc-800 pt-4 lg:pt-5 mt-auto">
        <div className="mb-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">Меню</div>
        <div className="space-y-1">
          {isStaff && (
            <button
              onClick={() => router.push("/app/admin")}
              className="w-full text-left px-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2 h-9 sm:h-10"
            >
              <span>📊</span>
              <span>Админка</span>
            </button>
          )}
          <button
            onClick={() => router.push("/app/clients")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>👥</span>
            <span>Клиенты</span>
          </button>
          <button
            onClick={() => router.push("/app/prompts")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>💬</span>
            <span>Промпты</span>
          </button>
          <button
            onClick={() => router.push("/app/competitors")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>👀</span>
            <span>Конкуренты</span>
          </button>
          {isStaff && (
            <button
              onClick={() => router.push("/app/invites")}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
            >
              <span>🔑</span>
              <span>Приглашения</span>
            </button>
          )}
          <button
            onClick={() => router.push(activeWorkspaceId ? `/app/settings?workspace=${activeWorkspaceId}` : "/app/settings")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Настройки</span>
          </button>
          <button
            onClick={() => router.push("/app/help")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>❓</span>
            <span>Помощь</span>
          </button>
          {/* <button
            onClick={() => router.push("/profile")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-300 transition-all flex items-center gap-2"
          >
            <span>👤</span>
            <span>Профиль</span>
          </button> */}
        </div>
      </div>
    </aside>
  );
}

