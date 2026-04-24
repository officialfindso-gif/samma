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
  updatePost,
  getCurrentUser,
} from "@/lib/api";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import FiltersBar from "./components/FiltersBar";
import PostsList from "./components/PostsList";
import PostDetail from "./components/PostDetail";
import EditPostModal from "./components/EditPostModal";
import CreatePostModal from "./components/CreatePostModal";
import Onboarding from "./components/Onboarding";
import { formatNumber } from "@/lib/utils";

const DEFAULT_COLUMN_ORDER = [
  "source", "original", "result", "description", "views", "likes", "comments", "er", "plays", "saves", "followers", "platform", "status", "actions",
];
const METRIC_SORT_COLUMNS = ["views", "likes", "comments", "er", "plays", "saves", "followers"] as const;
type MetricKey = (typeof METRIC_SORT_COLUMNS)[number];
type MetricSort = { key: MetricKey; order: "asc" | "desc" };

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

  const [editOpen, setEditOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [minER, setMinER] = useState<string>("");
  const [metricSort, setMetricSort] = useState<MetricSort | null>(null);

  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    source: true,
    original: true,
    result: true,
    views: true,
    likes: true,
    comments: true,
    er: true,
    plays: false,
    saves: false,
    followers: false,
    platform: true,
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);

  const columnLabels: Record<string, string> = {
    source: "РСЃС‚РѕС‡РЅРёРє",
    original: "РћСЂРёРіРёРЅР°Р»",
    result: "Р РµР·СѓР»СЊС‚Р°С‚",
    description: "РћРїРёСЃР°РЅРёРµ",
    views: "РџСЂРѕСЃРјРѕС‚СЂС‹",
    likes: "Р›Р°Р№РєРё",
    comments: "РљРѕРјРјРµРЅС‚Р°СЂРёРё",
    er: "ER%",
    plays: "Р’РѕСЃРїСЂРѕРёР·РІРµРґРµРЅРёСЏ",
    saves: "РЎРѕС…СЂР°РЅРµРЅРёСЏ",
    followers: "РџРѕРґРїРёСЃС‡РёРєРё",
    platform: "РџР»Р°С‚С„РѕСЂРјР°",
    status: "РЎС‚Р°С‚СѓСЃ",
    actions: "Р”РµР№СЃС‚РІРёСЏ",
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tableColumns") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // РњРµСЂРґР¶РёРј СЃ РґРµС„РѕР»С‚РѕРј вЂ” РЅРѕРІС‹Рµ РєРѕР»РѕРЅРєРё РїРѕСЏРІСЏС‚СЃСЏ, СЃС‚Р°СЂС‹Рµ СЃРѕС…СЂР°РЅСЏС‚СЃСЏ
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Р•СЃР»Рё РѕС€РёР±РєР° РїР°СЂСЃРёРЅРіР° вЂ” РѕСЃС‚Р°РІР»СЏРµРј РґРµС„РѕР»С‚
      }
    }
    // Load saved column order
    const savedOrder = typeof window !== "undefined" ? localStorage.getItem("columnOrder") : null;
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        if (Array.isArray(parsedOrder)) {
          const cleaned = parsedOrder.filter((key) => DEFAULT_COLUMN_ORDER.includes(key));
          const normalized = [
            ...cleaned,
            ...DEFAULT_COLUMN_ORDER.filter((key) => !cleaned.includes(key)),
          ];
          setColumnOrder(normalized);
          localStorage.setItem("columnOrder", JSON.stringify(normalized));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleColumn = (column: string) => {
    const newSettings = { ...visibleColumns, [column]: !visibleColumns[column] };
    setVisibleColumns(newSettings);
    if (typeof window !== "undefined") localStorage.setItem("tableColumns", JSON.stringify(newSettings));
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);
    setColumnOrder(newOrder);
    if (typeof window !== "undefined") localStorage.setItem("columnOrder", JSON.stringify(newOrder));
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

    // РџСЂРѕРІРµСЂСЏРµРј, РїРѕРєР°Р·С‹РІР°Р»Рё Р»Рё СѓР¶Рµ РѕРЅР±РѕСЂРґРёРЅРі
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [router]);

  useEffect(() => {
    if (!accessToken) return;
    
    // Р—Р°РіСЂСѓР¶Р°РµРј РёРЅС„РѕСЂРјР°С†РёСЋ Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»Рµ
    handleApiCall(() => getCurrentUser(accessToken))
        .then((user) => {
        setIsStaff(!!(user.is_staff || user.is_superuser));
      })
      .catch((err) => {
        console.error("РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ:", err);
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
        setError(err instanceof Error ? err.message : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РІРѕСЂРєСЃРїРµР№СЃС‹");
      })
      .finally(() => setLoading(false));
  }, [accessToken, handleApiCall]);

  useEffect(() => {
    if (!accessToken || !activeWorkspaceId) return;
    setLoadingPosts(true);
    setError(null);
    // РќРµ РѕС‚РїСЂР°РІР»СЏРµРј min_er РЅР° СЃРµСЂРІРµСЂ вЂ” С„РёР»СЊС‚СЂСѓРµРј С‚РѕР»СЊРєРѕ РЅР° РєР»РёРµРЅС‚Рµ
    handleApiCall(() => getPosts(accessToken, activeWorkspaceId, { sort: sortBy, ordering: sortOrder }))
      .then((data) => setPosts(data))
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕСЃС‚С‹");
      })
      .finally(() => setLoadingPosts(false));
  }, [accessToken, activeWorkspaceId, sortBy, sortOrder, minER, handleApiCall]);

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
        console.error("РћС€РёР±РєР° Р°РІС‚РѕРѕР±РЅРѕРІР»РµРЅРёСЏ:", err);
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
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° Р·Р°РїСѓСЃРєР° РѕР±СЂР°Р±РѕС‚РєРё");
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
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° РјР°СЃСЃРѕРІРѕР№ РѕР±СЂР°Р±РѕС‚РєРё");
    }
  };

  const handleDelete = async (postId: number) => {
    if (!accessToken) return;
    if (!confirm("Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ СЌС‚РѕС‚ РїРѕСЃС‚? Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.")) return;
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
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РїРѕСЃС‚Р°");
    }
  };

  const handleEditPost = async (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPost(updated);
    setEditingPost(null);
    setEditOpen(false);
  };

  const handleBulkDelete = async () => {
    if (!accessToken || selectedPosts.size === 0) return;
    if (!confirm(`Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ ${selectedPosts.size} РїРѕСЃС‚РѕРІ? Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.`)) return;
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
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° РјР°СЃСЃРѕРІРѕРіРѕ СѓРґР°Р»РµРЅРёСЏ");
    }
  };

  const getMetricValue = (post: Post, key: MetricKey): number | null => {
    switch (key) {
      case "views":
        return post.views_count ?? null;
      case "likes":
        return post.likes_count ?? null;
      case "comments":
        return post.comments_count ?? null;
      case "er":
        return post.engagement_rate != null
          ? typeof post.engagement_rate === "string"
            ? parseFloat(post.engagement_rate)
            : post.engagement_rate
          : null;
      case "plays":
        return post.play_count ?? null;
      case "saves":
        return post.saves_count ?? null;
      case "followers":
        return post.author_followers ?? null;
      default:
        return null;
    }
  };

  const handleMetricHeaderClick = (key: string) => {
    if (!METRIC_SORT_COLUMNS.includes(key as MetricKey)) return;
    const metricKey = key as MetricKey;
    setMetricSort((prev) => {
      if (prev && prev.key === metricKey) {
        return { key: metricKey, order: prev.order === "desc" ? "asc" : "desc" };
      }
      return { key: metricKey, order: "desc" };
    });
  };

  const filteredPosts = posts.filter((post) => {
    if (filterStatus !== "all" && post.status !== filterStatus) return false;
    if (filterPlatform !== "all" && post.platform !== filterPlatform) return false;
    if (searchQuery && !((post.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (post.original_text || "").toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    // Р¤РёР»СЊС‚СЂ РїРѕ РјРёРЅРёРјР°Р»СЊРЅРѕРјСѓ Engagement Rate
    if (minER) {
      const minErNum = parseFloat(minER);
      if (!isNaN(minErNum) && post.engagement_rate != null) {
        const er = typeof post.engagement_rate === "string" ? parseFloat(post.engagement_rate) : post.engagement_rate;
        if (er < minErNum) return false;
      }
    }
    return true;
  });

  const sortedPosts = metricSort
    ? [...filteredPosts].sort((a, b) => {
        const aValue = getMetricValue(a, metricSort.key);
        const bValue = getMetricValue(b, metricSort.key);
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return metricSort.order === "asc" ? aValue - bValue : bValue - aValue;
      })
    : filteredPosts;

  const togglePostSelection = (postId: number) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) newSelected.delete(postId); else newSelected.add(postId);
    setSelectedPosts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPosts.size === sortedPosts.length) setSelectedPosts(new Set()); else setSelectedPosts(new Set(sortedPosts.map((p) => p.id)));
  };

  const handleProcessAll = async () => {
    if (!accessToken) return;
    const newPosts = posts.filter((p) => p.status === "new");
    if (newPosts.length === 0) return;
    
    if (!confirm(`РћР±СЂР°Р±РѕС‚Р°С‚СЊ РІСЃРµ РЅРѕРІС‹Рµ РїРѕСЃС‚С‹ (${newPosts.length} С€С‚.)?`)) return;
    
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
      setError(err instanceof Error ? err.message : "РћС€РёР±РєР° РјР°СЃСЃРѕРІРѕР№ РѕР±СЂР°Р±РѕС‚РєРё");
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
      setError("Р’С‹Р±РµСЂРё РІРѕСЂРєСЃРїРµР№СЃ РїРµСЂРµРґ СЃРѕР·РґР°РЅРёРµРј РїРѕСЃС‚Р°.");
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
      setError(err instanceof Error ? err.message : "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїРѕСЃС‚");
    } finally { setCreateLoading(false); }
  };

  if (!accessToken) return null;

  return (
    <div className="min-h-screen w-full flex bg-black text-white">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <Sidebar workspaces={workspaces} loading={loading} activeWorkspaceId={activeWorkspaceId} setActiveWorkspaceId={setActiveWorkspaceId} handleLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isStaff={isStaff} />

      <main className="flex-1 min-w-0 w-full bg-black">
        <div className="w-full h-full p-3 sm:p-4 lg:p-6 2xl:p-8 max-w-8xl mx-auto">
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

          {error && <div className="mb-4 lg:mb-6 text-xs sm:text-sm text-gray-400 p-3 sm:p-4 bg-gray-800/30 rounded border border-gray-800/50">{error}</div>}

          <FiltersBar postsExist={filteredPosts.length > 0 || posts.length > 0} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterPlatform={filterPlatform} setFilterPlatform={setFilterPlatform} sortBy={sortBy} setSortBy={setSortBy} sortOrder={sortOrder} setSortOrder={setSortOrder} minER={minER} setMinER={setMinER} columnSettingsOpen={columnSettingsOpen} setColumnSettingsOpen={setColumnSettingsOpen} visibleColumns={visibleColumns} toggleColumn={toggleColumn} columnOrder={columnOrder} moveColumn={moveColumn} columnLabels={columnLabels} selectedCount={selectedPosts.size} handleBulkProcess={handleBulkProcess} handleBulkDelete={handleBulkDelete} />

          {loadingPosts ? (
            <div className="text-xs sm:text-sm text-gray-400">Р—Р°РіСЂСѓР¶РєР° РїРѕСЃС‚РѕРІ...</div>
          ) : sortedPosts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 lg:py-20">
              <p className="text-base sm:text-lg lg:text-xl 2xl:text-2xl text-gray-400 mb-6 lg:mb-8">
                {posts.length === 0
                  ? "РџРѕСЃС‚РѕРІ РїРѕРєР° РЅРµС‚. РЎРѕР·РґР°Р№С‚Рµ РїРµСЂРІС‹Р№!"
                  : filterStatus !== "all" || filterPlatform !== "all" || searchQuery || minER 
                  ? "РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ РїРѕ С„РёР»СЊС‚СЂР°Рј. РџРѕРїСЂРѕР±СѓР№С‚Рµ РёР·РјРµРЅРёС‚СЊ РїР°СЂР°РјРµС‚СЂС‹."
                  : "РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ."}
              </p>
              {posts.length === 0 && <button onClick={() => setCreateOpen(true)} className="text-xs sm:text-sm px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg bg-white hover:bg-gray-100 text-black transition-all font-medium min-h-[40px] sm:min-h-[44px]">РЎРѕР·РґР°С‚СЊ РїРѕСЃС‚</button>}
              {posts.length > 0 && (filterStatus !== "all" || filterPlatform !== "all" || searchQuery || minER ) && (
                <button onClick={() => { setFilterStatus("all"); setFilterPlatform("all"); setSearchQuery(""); setMinER(""); setMetricSort(null); }} className="text-xs sm:text-sm px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all font-medium min-h-[40px] sm:min-h-[44px]">РЎР±СЂРѕСЃРёС‚СЊ С„РёР»СЊС‚СЂС‹</button>
              )}
            </div>
          ) : (
            <PostsList filteredPosts={sortedPosts} selectedPosts={selectedPosts} togglePostSelection={togglePostSelection} selectedPost={selectedPost} setSelectedPost={setSelectedPost} visibleColumns={visibleColumns} columnOrder={columnOrder} columnLabels={columnLabels} toggleSelectAll={toggleSelectAll} handleProcess={handleProcess} handleDelete={handleDelete} formatNumber={formatNumber} activeMetricSortKey={metricSort?.key ?? null} metricSortOrder={metricSort?.order ?? "desc"} onMetricHeaderClick={handleMetricHeaderClick} />
          )}

          {selectedPost && <PostDetail selectedPost={selectedPost} setSelectedPost={setSelectedPost} handleProcess={handleProcess} handleDelete={handleDelete} onEdit={() => { setEditingPost(selectedPost); setEditOpen(true); setSelectedPost(null); }} formatNumber={formatNumber} accessToken={accessToken} />}

          {editOpen && editingPost && accessToken && (
            <EditPostModal post={editingPost} accessToken={accessToken} onSave={handleEditPost} onClose={() => { setEditOpen(false); setSelectedPost(editingPost); setEditingPost(null); }} />
          )}

          <CreatePostModal createOpen={createOpen} setCreateOpen={setCreateOpen} createTitle={createTitle} setCreateTitle={setCreateTitle} createSourceUrl={createSourceUrl} setCreateSourceUrl={setCreateSourceUrl} createOriginalText={createOriginalText} setCreateOriginalText={setCreateOriginalText} handleCreateSubmit={handleCreateSubmit} createLoading={createLoading} />
        </div>
      </main>

      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding onClose={() => {
          setShowOnboarding(false);
          if (typeof window !== "undefined") {
            localStorage.setItem("hasSeenOnboarding", "true");
          }
        }} />
      )}
    </div>
  );
}


