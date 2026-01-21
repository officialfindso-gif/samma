"use client";

import React from "react";
import ColumnSettings from "./ColumnSettings";

export default function FiltersBar({
  postsExist,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterPlatform,
  setFilterPlatform,
  columnSettingsOpen,
  setColumnSettingsOpen,
  visibleColumns,
  toggleColumn,
  selectedCount,
  handleBulkProcess,
  handleBulkDelete,
  toggleSelectAll,
  filteredLength,
}: {
  postsExist: boolean;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterPlatform: string;
  setFilterPlatform: (s: string) => void;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: (v: boolean) => void;
  visibleColumns: Record<string, boolean>;
  toggleColumn: (c: string) => void;
  selectedCount: number;
  handleBulkProcess: () => Promise<void> | void;
  handleBulkDelete: () => Promise<void> | void;
  toggleSelectAll: () => void;
  filteredLength: number;
}) {
  if (!postsExist) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-3 items-center">
      <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded focus:outline-none focus:border-indigo-600 w-full sm:w-64" />

      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded focus:outline-none focus:border-indigo-600">
        <option value="all">Все статусы</option>
        <option value="new">Новые</option>
        <option value="in_progress">В обработке</option>
        <option value="ready">Готовые</option>
        <option value="error">Ошибки</option>
      </select>

      <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded focus:outline-none focus:border-indigo-600">
        <option value="all">Все платформы</option>
        <option value="instagram">Instagram</option>
        <option value="tiktok">TikTok</option>
        <option value="linkedin">LinkedIn</option>
        <option value="youtube">YouTube</option>
      </select>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center justify-center w-12 flex-shrink-0">
          <input type="checkbox" checked={selectedCount === filteredLength && filteredLength > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-indigo-600 checked:border-indigo-600 cursor-pointer" />
        </div>

        <ColumnSettings visibleColumns={visibleColumns} toggleColumn={toggleColumn} columnSettingsOpen={columnSettingsOpen} setColumnSettingsOpen={setColumnSettingsOpen} selectedCount={selectedCount} handleBulkProcess={handleBulkProcess} handleBulkDelete={handleBulkDelete} />
      </div>
    </div>
  );
}
