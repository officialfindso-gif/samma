"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Workspace, Post } from "@/lib/api";
import {
  getWorkspaces,
  getPosts,
  processPost,
  createPost,
  refreshToken,
  deletePost,
  getCurrentUser,
} from "@/lib/api";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import FiltersBar from "./components/FiltersBar";
import PostsList from "./components/PostsList";
import PostDetail from "./components/PostDetail";
import CreatePostModal from "./components/CreatePostModal";
import { formatNumber } from "@/lib/utils";

export default function AppPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createSourceUrl, setCreateSourceUrl] = useState("");
  const [createOriginalText, setCreateOriginalText] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    source: true,
    original: true,
    result: true,
    views: true,
    likes: true,
    comments: true,
    plays: false,
    saves: false,
    followers: false,
    platform: true,
  });

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tableColumns") : null;
    if (saved) setVisibleColumns(JSON.parse(saved));
  }, []);

  const toggleColumn = (column: string) => {
    const newSettings = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newSettings);
    if (typeof window !== "undefined") localStorage.setItem("tableColumns", JSON.stringify(newSettings));
  };

  const handleApiCall = useCallback(async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    try {
      return await apiCall();
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unauthorized")) {
        const refreshTok = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        if (refreshTok) {
          try {
            const { access } = await refreshToken(refreshTok);
            if (typeof window !== "undefined") localStorage.setItem("accessToken", access);
            setAccessToken(access);
            return await apiCall();
          } catch (refreshErr) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
            }
            router.push("/login");
            throw refreshErr;
          }
        } else {
          router.push("/login");
          throw err;
        }
      }
      throw err;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  useEffect(() => {
    if (!accessToken) return;
    
    // Загружаем информацию о пользователе
    handleApiCall(() => getCurrentUser(accessToken))
        .then((user) => {
        setIsStaff(!!(user.is_staff || user.is_superuser));
      })
      .catch((err) => {
        console.error("Ошибка загрузки пользователя:", err);
      });
    
    setLoading(true);
    setError(null);
    handleApiCall(() => getWorkspaces(accessToken))
      .then((ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) setActiveWorkspaceId((id) => id ?? ws[0].id);
      })
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить воркспейсы");
      })
      .finally(() => setLoading(false));
  }, [accessToken, handleApiCall]);

  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;
    setLoadingPosts(true);
    setError(null);
    handleApiCall(() => getPosts(accessToken, activeWorkspaceId))
      .then((data) => setPosts(data))
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось загрузить посты");
      })
      .finally(() => setLoadingPosts(false));
  }, [accessToken, activeWorkspaceId, handleApiCall]);

  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;
    const hasProcessing = posts.some((p) => p.status === "in_progress");
    if (!hasProcessing) return;
    const interval = setInterval(async () => {
      try {
        const data = await handleApiCall(() => getPosts(accessToken!, activeWorkspaceId));
        setPosts(data);
        if (selectedPost) {
          const updated = data.find((p) => p.id === selectedPost.id);
          if (updated && updated.status !== selectedPost.status) setSelectedPost(updated);
        }
      } catch (err) {
        console.error("Ошибка автообновления:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [accessToken, activeWorkspaceId, posts, selectedPost, handleApiCall]);

  const handleProcess = async (postId: number) => {
    if (!accessToken) return;
    try {
      setError(null);
      await handleApiCall(() => processPost(accessToken, postId));
      if (activeWorkspaceId) {
        const data = await handleApiCall(() => getPosts(accessToken, activeWorkspaceId));
        setPosts(data);
        const updated = data.find((p) => p.id === postId);
        if (updated) setSelectedPost(updated);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка запуска обработки");
    }
  };

  const handleBulkProcess = async () => {
    if (!accessToken || selectedPosts.size === 0) return;
    try {
      setError(null);
      for (const postId of Array.from(selectedPosts)) {
        // intentionally sequential for simplicity
        // eslint-disable-next-line no-await-in-loop
        await processPost(accessToken, postId);
      }
      if (activeWorkspaceId) {
        const data = await getPosts(accessToken, activeWorkspaceId);
        setPosts(data);
      }
      setSelectedPosts(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка массовой обработки");
    }
  };

  const handleDelete = async (postId: number) => {
    if (!accessToken) return;
    if (!confirm("Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.")) return;
    try {
      setError(null);
      await handleApiCall(() => deletePost(accessToken!, postId));
      if (activeWorkspaceId) {
        const data = await handleApiCall(() => getPosts(accessToken!, activeWorkspaceId));
        setPosts(data);
        if (selectedPost?.id === postId) setSelectedPost(null);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка удаления поста");
    }
  };

  const handleBulkDelete = async () => {
    if (!accessToken || selectedPosts.size === 0) return;
    if (!confirm(`Вы уверены, что хотите удалить ${selectedPosts.size} постов? Это действие нельзя отменить.`)) return;
    try {
      setError(null);
      for (const postId of Array.from(selectedPosts)) {
        // eslint-disable-next-line no-await-in-loop
        await deletePost(accessToken, postId);
      }
      if (activeWorkspaceId) {
        const data = await getPosts(accessToken, activeWorkspaceId);
        setPosts(data);
        if (selectedPost && selectedPosts.has(selectedPost.id)) setSelectedPost(null);
      }
      setSelectedPosts(new Set());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка массового удаления");
    }
  };

  const togglePostSelection = (postId: number) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) newSelected.delete(postId); else newSelected.add(postId);
    setSelectedPosts(newSelected);
  };

  const filteredPosts = posts.filter((post) => {
    if (filterStatus !== "all" && post.status !== filterStatus) return false;
    if (filterPlatform !== "all" && post.platform !== filterPlatform) return false;
    if (searchQuery && !((post.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (post.original_text || "").toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedPosts.size === filteredPosts.length) setSelectedPosts(new Set()); else setSelectedPosts(new Set(filteredPosts.map((p) => p.id)));
  };

  const handleProcessAll = async () => {
    if (!accessToken) return;
    const newPosts = posts.filter((p) => p.status === "new");
    if (newPosts.length === 0) return;
    
    if (!confirm(`Обработать все новые посты (${newPosts.length} шт.)?`)) return;
    
    try {
      setError(null);
      for (const post of newPosts) {
        // eslint-disable-next-line no-await-in-loop
        await handleApiCall(() => processPost(accessToken, post.id));
      }
      if (activeWorkspaceId) {
        const data = await handleApiCall(() => getPosts(accessToken, activeWorkspaceId));
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка массовой обработки");
    }
  };

  const newPostsCount = posts.filter((p) => p.status === "new").length;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    router.push("/login");
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken || !activeWorkspaceId) {
      setError("Выбери воркспейс перед созданием поста.");
      return;
    }
    try {
      setCreateLoading(true);
      setError(null);
      const newPost = await createPost(accessToken, {
        workspace: activeWorkspaceId,
        title: createTitle || undefined,
        source_url: createSourceUrl || undefined,
        original_text: createOriginalText || undefined,
      });
      const data = await getPosts(accessToken, activeWorkspaceId);
      setPosts(data);
      setSelectedPost(newPost);
      setCreateTitle(""); setCreateSourceUrl(""); setCreateOriginalText(""); setCreateOpen(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось создать пост");
    } finally { setCreateLoading(false); }
  };

  if (!accessToken) return null;

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <Sidebar workspaces={workspaces} loading={loading} activeWorkspaceId={activeWorkspaceId} setActiveWorkspaceId={setActiveWorkspaceId} handleLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isStaff={isStaff} />

      <main className="flex-1 min-w-0 w-full bg-gradient-to-br from-indigo-900/5 via-transparent to-purple-900/5">
        <div className="w-full h-full p-4 lg:p-6">
          <Header 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
            activeWorkspaceId={activeWorkspaceId} 
            setCreateOpen={setCreateOpen} 
            newPostsCount={newPostsCount} 
            handleProcessAll={handleProcessAll}
            workspaces={workspaces}
            setActiveWorkspaceId={setActiveWorkspaceId}
          />

          {error && <div className="mb-4 text-sm text-red-400 p-3 bg-red-950/30 rounded border border-red-800/50">{error}</div>}

          <FiltersBar postsExist={posts.length > 0} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterPlatform={filterPlatform} setFilterPlatform={setFilterPlatform} columnSettingsOpen={columnSettingsOpen} setColumnSettingsOpen={setColumnSettingsOpen} visibleColumns={visibleColumns} toggleColumn={toggleColumn} selectedCount={selectedPosts.size} handleBulkProcess={handleBulkProcess} handleBulkDelete={handleBulkDelete} toggleSelectAll={toggleSelectAll} filteredLength={filteredPosts.length} />

          {loadingPosts ? (
            <div className="text-sm text-slate-400">Загрузка постов...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-slate-400 mb-6">{posts.length === 0 ? "Постов пока нет. Создайте первый!" : "Ничего не найдено по фильтрам"}</p>
              {posts.length === 0 && <button onClick={() => setCreateOpen(true)} className="text-sm px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all font-medium">Создать пост</button>}
            </div>
          ) : (
            <PostsList filteredPosts={filteredPosts} selectedPosts={selectedPosts} togglePostSelection={togglePostSelection} selectedPost={selectedPost} setSelectedPost={setSelectedPost} visibleColumns={visibleColumns} toggleSelectAll={toggleSelectAll} handleProcess={handleProcess} handleDelete={handleDelete} formatNumber={formatNumber} />
          )}

          {selectedPost && <PostDetail selectedPost={selectedPost} setSelectedPost={setSelectedPost} handleProcess={handleProcess} handleDelete={handleDelete} formatNumber={formatNumber} />}

          <CreatePostModal createOpen={createOpen} setCreateOpen={setCreateOpen} createTitle={createTitle} setCreateTitle={setCreateTitle} createSourceUrl={createSourceUrl} setCreateSourceUrl={setCreateSourceUrl} createOriginalText={createOriginalText} setCreateOriginalText={setCreateOriginalText} handleCreateSubmit={handleCreateSubmit} createLoading={createLoading} />
        </div>
      </main>
    </div>
  );
}
