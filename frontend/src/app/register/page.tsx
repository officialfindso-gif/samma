"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerWithInvite } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Токен приглашения не указан. Перейдите по ссылке-приглашению.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithInvite({
        username,
        email,
        password,
        invite_token: token,
      });
      localStorage.setItem("accessToken", result.access);
      localStorage.setItem("refreshToken", result.refresh);
      router.push("/app");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (msg.includes("Token")) {
        setError("Недействительный или истёкший токен приглашения");
      } else if (msg.includes("username")) {
        setError("Это имя пользователя уже занято");
      } else if (msg.includes("email")) {
        setError("Этот email уже зарегистрирован");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">mini_notion</h1>
          <p className="text-gray-400 text-sm">Регистрация по приглашению</p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl p-6">
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">{error}</div>
          )}

          {token ? (
            <div className="mb-4 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-2">
              🔑 Токен: {token.slice(0, 16)}...
            </div>
          ) : (
            <div className="mb-4 text-xs text-gray-500 text-center">
              Нет токена приглашения
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1 text-white font-medium">Имя пользователя *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
                required
                disabled={!token}
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-white font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
                disabled={!token}
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-white font-medium">Пароль *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
                required
                disabled={!token}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-white font-medium">Подтвердите пароль *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
                required
                disabled={!token}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full px-4 py-2.5 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Уже есть аккаунт? Войти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Загрузка...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
