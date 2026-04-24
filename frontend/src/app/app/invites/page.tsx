"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getWorkspaces,
  getInviteTokens,
  createInviteToken,
  deleteInviteToken,
  issueAccount,
  Workspace,
  InviteToken,
} from "@/lib/api";

export default function InvitesPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);
  const [role, setRole] = useState("editor");
  const [email, setEmail] = useState("");
  const [expiresIn, setExpiresIn] = useState("7"); // days
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueUsername, setIssueUsername] = useState("");
  const [issueEmail, setIssueEmail] = useState("");
  const [issuePassword, setIssuePassword] = useState("");
  const [issueRole, setIssueRole] = useState("viewer");
  const [issueWorkspace, setIssueWorkspace] = useState<string>("");
  const [issueCreating, setIssueCreating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) { router.push("/login"); return; }
    setAccessToken(token);
  }, [router]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      getWorkspaces(accessToken),
      getInviteTokens(accessToken),
    ])
      .then(([ws, inv]) => {
        setWorkspaces(ws);
        setInvites(inv);
        if (ws.length > 0) setSelectedWorkspace(ws[0].id);
        setIsAdmin(true);
      })
      .catch((err) => {
        if (err instanceof Error && err.message.includes("403")) {
          // Not admin
          setError("Доступ только для администраторов");
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load data");
        if (err instanceof Error && err.message === "Unauthorized") router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedWorkspace) return;
    setCreating(true);
    setError(null);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      const invite = await createInviteToken(accessToken, {
        workspace: selectedWorkspace,
        role,
        email: email || undefined,
        expires_at: expiresAt.toISOString(),
      });
      setNewToken(invite.token);
      const list = await getInviteTokens(accessToken);
      setInvites(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!accessToken) return;
    if (!confirm("Delete this invite token?")) return;
    try {
      await deleteInviteToken(accessToken, id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleIssueAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setIssueCreating(true);
    setError(null);
    try {
      const payload: {
        username: string;
        email?: string;
        password: string;
        workspace?: number;
        role?: "admin" | "editor" | "viewer";
      } = {
        username: issueUsername,
        password: issuePassword,
        role: issueRole as "admin" | "editor" | "viewer",
      };
      if (issueEmail.trim()) payload.email = issueEmail.trim();
      if (issueWorkspace) payload.workspace = Number(issueWorkspace);
      await issueAccount(accessToken, payload);
      setIssueUsername("");
      setIssueEmail("");
      setIssuePassword("");
      setIssueRole("viewer");
      setIssueWorkspace("");
      alert("Аккаунт выдан");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue account");
    } finally {
      setIssueCreating(false);
    }
  };

  const getInviteLink = (token: string) =>
    `${window.location.origin}/register?token=${token}`;

  const roleLabels: Record<string, string> = {
    owner: "Владелец",
    admin: "Администратор",
    editor: "Редактор",
    viewer: "Наблюдатель",
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getInviteLink(token));
    alert("Link copied!");
  };

  if (!accessToken) return null;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-black text-white">
      <aside className="w-56 sm:w-64 border-r border-zinc-800 bg-black/95 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold text-lg text-white">mini_notion</span>
          <button onClick={() => router.push("/app")} className="text-xs text-gray-400 hover:text-white">
            ← Назад
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">🔑 Токены приглашений</h1>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">{error}</div>
          )}

          {newToken && (
            <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
              <p className="text-sm text-emerald-300 mb-2">✅ Токен создан!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-black/50 px-3 py-2 rounded break-all">{getInviteLink(newToken)}</code>
                <button onClick={() => copyLink(newToken)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-medium">📋 Copy</button>
              </div>
              <button onClick={() => setNewToken(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
            </div>
          )}

          <button
            onClick={() => setShowForm(!showForm)}
            className="mb-6 px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium"
          >
            ➕ Новый токен
          </button>
          <button
            onClick={() => setShowIssueForm(!showIssueForm)}
            className="mb-6 ml-2 px-4 py-2 bg-gray-700 text-white hover:bg-gray-600 rounded-lg text-sm font-medium"
          >
            👤 Выдать аккаунт
          </button>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl space-y-3">
              <div>
                <label className="block text-xs mb-1 text-white font-medium">Воркспейс</label>
                <select
                  value={selectedWorkspace ?? ""}
                  onChange={(e) => setSelectedWorkspace(Number(e.target.value))}
                  className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
                  required
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Роль</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
                    <option value="editor">Редактор</option>
                    <option value="viewer">Наблюдатель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Срок (дней)</label>
                  <input type="number" min="1" max="365" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-white font-medium">Email (опционально)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-60">
                  {creating ? "Создаём..." : "🔑 Создать"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Отмена</button>
              </div>
            </form>
          )}

          {showIssueForm && (
            <form onSubmit={handleIssueAccount} className="mb-6 p-4 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-xl space-y-3">
              <div className="text-sm font-medium">Выдача аккаунта без приглашения</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Логин *</label>
                  <input type="text" value={issueUsername} onChange={(e) => setIssueUsername(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" required />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Пароль *</label>
                  <input type="password" minLength={6} value={issuePassword} onChange={(e) => setIssuePassword(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Email (опционально)</label>
                  <input type="email" value={issueEmail} onChange={(e) => setIssueEmail(e.target.value)} placeholder="user@example.com" className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-white font-medium">Роль</label>
                  <select value={issueRole} onChange={(e) => setIssueRole(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
                    <option value="viewer">Наблюдатель</option>
                    <option value="editor">Редактор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-white font-medium">Воркспейс (опционально)</label>
                <select value={issueWorkspace} onChange={(e) => setIssueWorkspace(e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
                  <option value="">Личный воркспейс (автосоздание)</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={String(w.id)}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={issueCreating} className="px-4 py-2 bg-white text-black hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-60">
                  {issueCreating ? "Создаём..." : "Выдать аккаунт"}
                </button>
                <button type="button" onClick={() => setShowIssueForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Отмена</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-sm text-gray-400">Загрузка...</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Нет токенов. Создай первый!</div>
          ) : (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="p-3 bg-gradient-to-br from-gray-900/60 to-gray-800/40 border border-gray-700/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{inv.workspace_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${inv.used ? "bg-gray-600 text-gray-300" : inv.is_expired ? "bg-red-600/30 text-red-300" : "bg-emerald-600/30 text-emerald-300"}`}>
                          {inv.used ? "✅ Использован" : inv.is_expired ? "❌ Истёк" : "🟢 Активен"}
                        </span>
                        <span className="text-[10px] text-gray-500">• {roleLabels[inv.role] || inv.role}</span>
                      </div>
                      <code className="text-[10px] text-gray-500 break-all">{inv.token}</code>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        Created: {new Date(inv.created_at).toLocaleDateString("ru-RU")} • Expires: {new Date(inv.expires_at).toLocaleDateString("ru-RU")}
                        {inv.created_by_name && ` • by ${inv.created_by_name}`}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      {!inv.used && !inv.is_expired && (
                        <button onClick={() => copyLink(inv.token)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs" title="Copy link">📋</button>
                      )}
                      <button onClick={() => handleDelete(inv.id)} className="px-2 py-1 bg-gray-700 hover:bg-red-700 rounded text-xs" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
