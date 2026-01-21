"use client";

import React from "react";

type Visible = Record<string, boolean>;

const columnLabels: Record<string, string> = {
  source: "Источник",
  original: "Оригинал",
  result: "Результат",
  views: "Просмотры",
  likes: "Лайки",
  comments: "Комментарии",
  plays: "Воспроизведения",
  saves: "Сохранения",
  followers: "Подписчики",
  platform: "Платформа",
};

export default function ColumnSettings({
  visibleColumns,
  toggleColumn,
  columnSettingsOpen,
  setColumnSettingsOpen,
  selectedCount,
  handleBulkProcess,
  handleBulkDelete,
}: {
  visibleColumns: Visible;
  toggleColumn: (c: string) => void;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: (v: boolean) => void;
  selectedCount: number;
  handleBulkProcess: () => Promise<void> | void;
  handleBulkDelete: () => Promise<void> | void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="relative column-settings">
        <button
          onClick={() => setColumnSettingsOpen(!columnSettingsOpen)}
          className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-all flex items-center gap-2"
          title="Настроить колонки"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="hidden sm:inline">Колонки</span>
        </button>

        {columnSettingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 p-3">
            <div className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wide">Показать колонки</div>
            <div className="space-y-2">
              {Object.keys(visibleColumns).map((k) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded">
                  <input type="checkbox" checked={!!visibleColumns[k]} onChange={() => toggleColumn(k)} className="w-4 h-4 rounded" />
                  <span className="text-sm">{columnLabels[k] || k}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <>
          <button
            onClick={handleBulkProcess}
            className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105 active:scale-100"
          >
            ⚡ Обработать ({selectedCount})
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg font-semibold transition-all shadow-lg hover:shadow-red-500/25 transform hover:scale-105 active:scale-100"
          >
            🗑️ Удалить ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
}
