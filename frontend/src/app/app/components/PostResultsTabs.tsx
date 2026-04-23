"use client";

import React, { useState } from "react";
import type { Post } from "@/lib/api";

const RESULT_TABS = [
  { key: "original", label: "Оригинал", emoji: "🧹", icon: "🧾" },
  { key: "caption", label: "Подпись", emoji: "✨", icon: "📝" },
  { key: "script", label: "Скрипт", emoji: "📺", icon: "🎬" },
  { key: "title", label: "Заголовок", emoji: "📌", icon: "🏷️" },
  { key: "description", label: "Описание", emoji: "📖", icon: "📄" },
] as const;

export function PostResultsTabs({ post }: { post: Post }) {
  const [activeTab, setActiveTab] = useState<string>("caption");

  const hasAnyResults =
    post.generated_original ||
    post.generated_caption ||
    post.generated_script ||
    post.generated_title ||
    post.generated_description;

  if (!hasAnyResults) {
    return null;
  }

  const getResultContent = (key: string): string => {
    switch (key) {
      case "original":
        return post.generated_original;
      case "caption":
        return post.generated_caption;
      case "script":
        return post.generated_script;
      case "title":
        return post.generated_title;
      case "description":
        return post.generated_description;
      default:
        return "";
    }
  };

  const hasResult = (key: string): boolean => {
    const content = getResultContent(key);
    return !!content;
  };

  return (
    <div className="mt-3 border-t border-gray-700/30 pt-3">
      {/* Tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {RESULT_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const hasContent = hasResult(tab.key);

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              disabled={!hasContent}
              className={`px-2 py-1 text-xs rounded transition-all ${
                isActive && hasContent
                  ? "bg-white text-black font-medium"
                  : hasContent
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
              title={hasContent ? tab.label : `${tab.label} (нет результата)`}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab && hasResult(activeTab) && (
        <div className="bg-gray-800/50 rounded p-2 border border-gray-700/30">
          <p className="text-xs text-gray-300 whitespace-pre-wrap break-words">
            {getResultContent(activeTab)}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(getResultContent(activeTab));
            }}
            className="mt-2 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            📋 Скопировать
          </button>
        </div>
      )}
    </div>
  );
}
