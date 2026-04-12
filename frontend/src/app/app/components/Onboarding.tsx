"use client";

import React, { useState, useEffect } from "react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  action?: {
    label: string;
    href: string;
  };
}

const steps: OnboardingStep[] = [
  {
    title: "Добро пожаловать! 🎉",
    description: "Это платформа для создания контента с помощью AI. Давай быстро пройдёмся по основам.",
    icon: "👋",
  },
  {
    title: "1️⃣ Добавь конкурента",
    description: "Перейди в раздел «Конкуренты» и добавь аккаунты конкурентов. Система будет парсить их посты и показывать метрики.",
    icon: "👀",
    action: { label: "Перейти к конкурентам", href: "/app/competitors" },
  },
  {
    title: "2️⃣ Создай первый пост",
    description: "Добавь ссылку на пост или профиль конкурента и нажми «Обработать». AI создаст подпись, скрипт, заголовок и описание.",
    icon: "📝",
    action: { label: "Создать пост", href: "/app" },
  },
  {
    title: "3️⃣ Настрой промпты",
    description: "В разделе «Промпты» ты можешь настроить шаблоны для AI. По умолчанию уже установлены 5 оптимальных промптов.",
    icon: "💬",
    action: { label: "Открыть промпты", href: "/app/prompts" },
  },
  {
    title: "4️⃣ Управляй клиентами",
    description: "Если работаешь с клиентами, добавляй их в разделе «Клиенты». Отслеживай активности и заметки.",
    icon: "👥",
    action: { label: "Открыть клиентов", href: "/app/clients" },
  },
  {
    title: "Готово! 🚀",
    description: "Ты готов к работе! Не стесняйся исследовать все разделы платформы. Удачи в создании контента!",
    icon: "✨",
    action: { label: "Начать работу", href: "/app" },
  },
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[10001] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Icon */}
          <div className="text-6xl mb-6 text-center">{step.icon}</div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-4">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-300 text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? "bg-white w-6"
                    : i < currentStep
                    ? "bg-gray-500"
                    : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Назад
              </button>
            )}
            
            {step.action && !isLast && (
              <a
                href={step.action.href}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg text-center transition-colors"
              >
                {step.action.label}
              </a>
            )}
            
            <button
              onClick={handleNext}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-100 text-black text-sm font-bold rounded-lg transition-all"
            >
              {isLast ? "🚀 Начать работу" : "Далее →"}
            </button>
          </div>

          {/* Skip */}
          <button
            onClick={onClose}
            className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Пропустить онбординг
          </button>
        </div>
      </div>
    </div>
  );
}
