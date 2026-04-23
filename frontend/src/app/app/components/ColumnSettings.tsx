"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Visible = Record<string, boolean>;

function SortableItem({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-white p-1"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-600 bg-gray-800 checked:bg-white checked:border-white cursor-pointer"
      />

      {/* Label */}
      <span className="text-xs sm:text-sm flex-1">{label}</span>
    </div>
  );
}

export default function ColumnSettings({
  visibleColumns,
  toggleColumn,
  columnSettingsOpen,
  setColumnSettingsOpen,
  selectedCount,
  handleBulkProcess,
  handleBulkDelete,
  columnOrder,
  moveColumn,
  columnLabels,
}: {
  visibleColumns: Visible;
  toggleColumn: (c: string) => void;
  columnSettingsOpen: boolean;
  setColumnSettingsOpen: (v: boolean) => void;
  selectedCount: number;
  handleBulkProcess: () => Promise<void> | void;
  handleBulkDelete: () => Promise<void> | void;
  columnOrder: string[];
  moveColumn: (from: number, to: number) => void;
  columnLabels: Record<string, string>;
}) {
  const settingsOrder = columnOrder.filter((key) => key !== "checkbox");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = settingsOrder.indexOf(active.id as string);
      const newIndex = settingsOrder.indexOf(over.id as string);
      moveColumn(oldIndex, newIndex);
    }
  };

  return (
    <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-wrap sm:flex-nowrap">
      <div className="relative column-settings">
        <button
          onClick={() => setColumnSettingsOpen(!columnSettingsOpen)}
          className="px-2 sm:px-3 lg:px-3 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-sm bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-all flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 lg:h-10"
          title="Настроить колонки"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="hidden sm:inline">Колонки</span>
        </button>

        {columnSettingsOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 lg:w-72 2xl:w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 p-3">
            <div className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center justify-between">
              <span>Порядок и видимость</span>
              <span className="text-[10px] text-gray-500 normal-case">Перетащите для сортировки</span>
            </div>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={settingsOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {settingsOrder.map((key) => (
                    <SortableItem
                      key={key}
                      id={key}
                      label={columnLabels[key] || key}
                      checked={!!visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {selectedCount > 0 && (
        <>
          <button
            onClick={handleBulkProcess}
            className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-sm bg-white text-black hover:bg-gray-100 rounded-lg font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-100 h-9 sm:h-10 lg:h-10 whitespace-nowrap"
          >
            ⚡ Обработать ({selectedCount})
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm lg:text-sm bg-gray-700 hover:bg-gray-800 rounded-lg font-semibold transition-all shadow-lg transform hover:scale-105 active:scale-100 text-white h-9 sm:h-10 lg:h-10 whitespace-nowrap"
          >
            🗑️ Удалить ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
}
