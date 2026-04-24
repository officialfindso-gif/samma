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
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  minER,
  setMinER,
  columnSettingsOpen,
  setColumnSettingsOpen,
  visibleColumns,
  toggleColumn,
  columnOrder,
  moveColumn,
  columnLabels,
  selectedCount,
  handleBulkProcess,
  handleBulkDelete,
}: {
  postsExist: boolean;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterPlatform: string;
  setFilterPlatform: (s: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (s: "asc" | "desc") => void;
  minER: string;
  setMinER: (s: string) => void;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: (v: boolean) => void;
  visibleColumns: Record<string, boolean>;
  toggleColumn: (c: string) => void;
  columnOrder: string[];
  moveColumn: (from: number, to: number) => void;
  columnLabels: Record<string, string>;
  selectedCount: number;
  handleBulkProcess: () => Promise<void> | void;
  handleBulkDelete: () => Promise<void> | void;
}) {
  if (!postsExist) return null;

  return (
    <div className="mb-4 lg:mb-6 space-y-2">
      {/* Desktop layout: all in one row */}
      <div className="hidden sm:flex sm:flex-wrap gap-2 sm:gap-3 items-center">
        <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 text-xs sm:text-sm bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white w-full sm:w-48 lg:w-56 2xl:w-64 h-9 sm:h-10" />

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-xs sm:text-sm text-sky-100 bg-slate-800 border border-sky-500/40 rounded focus:outline-none focus:border-sky-300 h-9 sm:h-10">
          <option value="all">?? ��� �������</option>
          <option value="new">?? �����</option>
          <option value="in_progress">? � ���������</option>
          <option value="ready">? �������</option>
          <option value="error">? ������</option>
        </select>

        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="px-3 py-2 text-xs sm:text-sm bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white h-9 sm:h-10">
          <option value="all">Все платформы</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="linkedin">LinkedIn</option>
        </select>

        {/* Сортировка по метрикам */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 text-xs sm:text-sm bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white h-9 sm:h-10">
          <option value="created_at">🕐 По дате</option>
          <option value="engagement_rate">🔥 По ER</option>
          <option value="views">👀 По просмотрам</option>
          <option value="likes">❤️ По лайкам</option>
          <option value="comments">💬 По комментам</option>
        </select>

        <button onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")} className="px-2 py-2 text-xs sm:text-sm bg-gray-800/50 border border-gray-700 rounded hover:bg-gray-700/50 h-9 sm:h-10" title={sortOrder === "desc" ? "По убыванию" : "По возрастанию"}>
          {sortOrder === "desc" ? "▼" : "▲"}
        </button>

        {/* Фильтр по минимальному ER */}
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="Min ER %"
          value={minER}
          onChange={(e) => setMinER(e.target.value)}
          className="px-3 py-2 text-xs sm:text-sm bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white w-24 sm:w-28 h-9 sm:h-10"
          title="Минимальный Engagement Rate (%)"
        />

        <div className="ml-auto flex items-center gap-2">
          <ColumnSettings visibleColumns={visibleColumns} toggleColumn={toggleColumn} columnSettingsOpen={columnSettingsOpen} setColumnSettingsOpen={setColumnSettingsOpen} selectedCount={selectedCount} handleBulkProcess={handleBulkProcess} handleBulkDelete={handleBulkDelete} columnOrder={columnOrder} moveColumn={moveColumn} columnLabels={columnLabels} />
        </div>
      </div>

      {/* Mobile layout: horizontal scrollable row */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-shrink-0 px-3 py-2 text-xs bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white w-28 h-9" />

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-shrink-0 px-2 py-2 text-xs text-sky-100 bg-slate-800 border border-sky-500/40 rounded focus:outline-none focus:border-sky-300 h-9">
          <option value="all">?? �������</option>
          <option value="new">?? �����</option>
          <option value="in_progress">? � ������</option>
          <option value="ready">? �������</option>
          <option value="error">? ������</option>
        </select>

        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="flex-shrink-0 px-2 py-2 text-xs bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white h-9">
          <option value="all">📱 Платформы</option>
          <option value="instagram">📸 Instagram</option>
          <option value="tiktok">🎵 TikTok</option>
          <option value="youtube">📺 YouTube</option>
          <option value="linkedin">💼 LinkedIn</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-shrink-0 px-2 py-2 text-xs bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white h-9">
          <option value="created_at">🕐 Дата</option>
          <option value="engagement_rate">🔥 ER</option>
          <option value="views">👀 Просм.</option>
          <option value="likes">❤️ Лайки</option>
          <option value="comments">💬 Комм.</option>
        </select>

        <button onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")} className="flex-shrink-0 px-2 py-2 text-xs bg-gray-800/50 border border-gray-700 rounded hover:bg-gray-700/50 h-9" title={sortOrder === "desc" ? "По убыванию" : "По возрастанию"}>
          {sortOrder === "desc" ? "▼" : "▲"}
        </button>

        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="ER %"
          value={minER}
          onChange={(e) => setMinER(e.target.value)}
          className="flex-shrink-0 px-2 py-2 text-xs bg-gray-800/50 border border-gray-700 rounded focus:outline-none focus:border-white w-16 h-9"
          title="Минимальный Engagement Rate (%)"
        />

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <ColumnSettings visibleColumns={visibleColumns} toggleColumn={toggleColumn} columnSettingsOpen={columnSettingsOpen} setColumnSettingsOpen={setColumnSettingsOpen} selectedCount={selectedCount} handleBulkProcess={handleBulkProcess} handleBulkDelete={handleBulkDelete} columnOrder={columnOrder} moveColumn={moveColumn} columnLabels={columnLabels} />
        </div>
      </div>
    </div>
  );
}

