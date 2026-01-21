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
      w-64 border-r border-slate-800/50 bg-slate-900/80 backdrop-blur-xl p-4 flex flex-col
      fixed lg:static inset-y-0 left-0 z-40 shadow-2xl
      transform transition-transform duration-300 lg:transform-none
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="flex items-center justify-between mb-6">
        <span className="font-bold text-lg text-slate-100">mini_notion</span>
        <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-950/30">Выйти</button>
      </div>

      <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Воркспейсы</div>

      <div className="space-y-1 overflow-y-auto mb-6">
        {loading && <div className="text-xs text-slate-400">Загрузка воркспейсов...</div>}
        {!loading && workspaces.length === 0 && <div className="text-xs text-slate-500">Воркспейсов пока нет.</div>}

        {workspaces.map((ws) => (
          <button key={ws.id} onClick={() => { setActiveWorkspaceId(ws.id); setSidebarOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${activeWorkspaceId === ws.id ? 'bg-indigo-900/50 border border-indigo-700/50 text-slate-100' : 'hover:bg-slate-800/50 text-slate-300'}`}>
            <div className="font-medium">{ws.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">👥 {ws.seats_limit} seats</div>
          </button>
        ))}
      </div>

      {/* Navigation Menu */}
      <div className="border-t border-slate-800 pt-4 mt-auto">
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Меню</div>
        <div className="space-y-1">
          {isStaff && (
            <button
              onClick={() => router.push("/app/admin")}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
            >
              <span>📊</span>
              <span>Админка</span>
            </button>
          )}
          <button
            onClick={() => router.push("/app/clients")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
          >
            <span>👥</span>
            <span>Клиенты</span>
          </button>
          <button
            onClick={() => router.push("/app/prompts")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
          >
            <span>💬</span>
            <span>Промпты</span>
          </button>
          <button
            onClick={() => router.push("/app/competitors")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
          >
            <span>👀</span>
            <span>Конкуренты</span>
          </button>
          <button
            onClick={() => router.push("/app/settings")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>Настройки</span>
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-800/50 text-slate-300 transition-all flex items-center gap-2"
          >
            <span>👤</span>
            <span>Профиль</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
