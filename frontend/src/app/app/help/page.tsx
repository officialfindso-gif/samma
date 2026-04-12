"use client";

import { useRouter } from "next/navigation";
import ParserFAQ from "../components/ParserFAQ";

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/app")}
            className="text-gray-400 hover:text-white mb-4 inline-flex items-center gap-2 text-sm"
          >
            ← Назад
          </button>
          <h1 className="text-3xl font-bold mb-2">❓ Помощь</h1>
          <p className="text-gray-400">Ответы на частые вопросы о работе с платформой</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push("/app")}
            className="p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl text-left hover:border-gray-600/50 transition-colors"
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="font-semibold text-sm">Посты</div>
            <div className="text-xs text-gray-400 mt-1">Создание и обработка контента</div>
          </button>
          <button
            onClick={() => router.push("/app/prompts")}
            className="p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl text-left hover:border-gray-600/50 transition-colors"
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="font-semibold text-sm">Промпты</div>
            <div className="text-xs text-gray-400 mt-1">Настройка шаблонов для AI</div>
          </button>
          <button
            onClick={() => router.push("/app/competitors")}
            className="p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl text-left hover:border-gray-600/50 transition-colors"
          >
            <div className="text-2xl mb-2">👀</div>
            <div className="font-semibold text-sm">Конкуренты</div>
            <div className="text-xs text-gray-400 mt-1">Парсинг и мониторинг</div>
          </button>
        </div>

        {/* FAQ */}
        <ParserFAQ />
      </div>
    </div>
  );
}
