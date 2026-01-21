"use client";

import React, { useState } from "react";
import type { Workspace } from "@/lib/api";

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  activeWorkspaceId,
  setCreateOpen,
  newPostsCount,
  handleProcessAll,
  workspaces,
  setActiveWorkspaceId,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  activeWorkspaceId: number | null;
  setCreateOpen: (v: boolean) => void;
  newPostsCount: number;
  handleProcessAll: () => void;
  workspaces: Workspace[];
  setActiveWorkspaceId: (id: number) => void;
}) {
  const [showClientMenu, setShowClientMenu] = useState(false);
  
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const clientWorkspaces = workspaces.filter((w) => w.is_client);

  return (
    <div className="flex items-center justify-between mb-4 gap-2">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-400 hover:text-slate-200 p-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate flex items-center gap-2">📝 Посты</h1>
        
        {/* Быстрый переключатель клиента */}
        {activeWorkspace && (
          <div className="relative">
            <button
              onClick={() => setShowClientMenu(!showClientMenu)}
              className="text-xs text-slate-400 hover:text-slate-200 truncate flex items-center gap-1 transition-colors"
              style={{ borderLeftColor: activeWorkspace.color, borderLeftWidth: "3px", paddingLeft: "8px" }}
            >
              {activeWorkspace.is_client ? "👥" : "🏢"} {activeWorkspace.name}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Выпадающее меню клиентов */}
            {showClientMenu && clientWorkspaces.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[250px] max-h-[400px] overflow-y-auto">
                <div className="p-2 border-b border-slate-700 text-xs text-slate-400">
                  Быстрый переход к клиенту
                </div>
                <div className="p-1">
                  {clientWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setShowClientMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-700 transition-colors ${
                        ws.id === activeWorkspaceId ? "bg-slate-700 text-white" : "text-slate-300"
                      }`}
                      style={{ borderLeftColor: ws.color, borderLeftWidth: "3px", paddingLeft: "12px" }}
                    >
                      <div className="font-medium">{ws.name}</div>
                      {ws.client_name && (
                        <div className="text-xs text-slate-400 mt-0.5">{ws.client_name}</div>
                      )}
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ws.posts_count} постов
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {newPostsCount > 0 && (
          <button onClick={handleProcessAll} className="text-xs px-3 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 whitespace-nowrap transition-all font-medium shadow-lg hover:shadow-green-500/20 hover:shadow-xl transform hover:scale-105 active:scale-100" title={`Обработать все новые посты (${newPostsCount})`}>
            <span className="hidden sm:inline-flex items-center gap-1">⚡ Обработать все ({newPostsCount})</span>
            <span className="sm:hidden">⚡ {newPostsCount}</span>
          </button>
        )}
        
        <button onClick={() => setCreateOpen(true)} className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 whitespace-nowrap transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/20 hover:shadow-xl transform hover:scale-105 active:scale-100" disabled={!activeWorkspaceId}>
          <span className="hidden sm:inline-flex items-center gap-1">✨ Новый пост</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>
    </div>
  );
}
