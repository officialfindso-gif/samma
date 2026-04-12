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
    <div className="flex items-center justify-between mb-4 lg:mb-6 gap-2 lg:gap-4">
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-gray-200 p-2 h-10 w-10 flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <h1 className="text-base sm:text-lg lg:text-xl 2xl:text-2xl font-bold text-white truncate flex items-center gap-2">📝 Посты</h1>
        
        {/* Быстрый переключатель клиента */}
        {activeWorkspace && (
          <div className="relative">
            <button
              onClick={() => setShowClientMenu(!showClientMenu)}
              className="text-xs sm:text-sm lg:text-xs 2xl:text-sm text-gray-400 hover:text-gray-200 truncate flex items-center gap-1 transition-colors"
              style={{ borderLeftColor: activeWorkspace.color, borderLeftWidth: "3px", paddingLeft: "8px" }}
            >
              {activeWorkspace.is_client ? "👥" : "🏢"} {activeWorkspace.name}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Выпадающее меню клиентов */}
            {showClientMenu && clientWorkspaces.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 min-w-[250px] sm:min-w-[300px] lg:min-w-[280px] 2xl:min-w-[350px] max-h-[400px] overflow-y-auto">
                <div className="p-2 border-b border-zinc-700 text-xs text-gray-400">
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
                      className={`w-full text-left px-3 py-2 sm:py-3 text-xs sm:text-sm rounded hover:bg-white/10 transition-colors ${
                        ws.id === activeWorkspaceId ? "bg-white/20 text-white" : "text-gray-300"
                      }`}
                      style={{ borderLeftColor: ws.color, borderLeftWidth: "3px", paddingLeft: "12px" }}
                    >
                      <div className="font-medium">{ws.name}</div>
                      {ws.client_name && (
                        <div className="text-xs text-gray-400 mt-0.5">{ws.client_name}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-0.5">
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

      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {newPostsCount > 0 && (
          <button onClick={handleProcessAll} className="text-xs sm:text-sm px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-2 rounded-lg bg-gray-700 hover:bg-gray-600 whitespace-nowrap transition-all font-medium shadow-lg text-white transform hover:scale-105 active:scale-100 min-h-[40px] sm:min-h-[44px]" title={`Обработать все новые посты (${newPostsCount})`}>
            <span className="hidden sm:inline-flex items-center gap-1">⚡ Обработать все ({newPostsCount})</span>
            <span className="sm:hidden">⚡ {newPostsCount}</span>
          </button>
        )}
        
        <button onClick={() => setCreateOpen(true)} className="text-xs sm:text-sm px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-2 rounded-lg bg-white text-black hover:bg-gray-100 whitespace-nowrap transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-100 min-h-[40px] sm:min-h-[44px]" disabled={!activeWorkspaceId}>
          <span className="hidden sm:inline-flex items-center gap-1">✨ Новый пост</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>
    </div>
  );
}

