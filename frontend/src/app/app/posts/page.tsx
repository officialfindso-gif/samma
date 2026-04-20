"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPosts, Post, processPostWithAI } from "@/lib/api";

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const workspaceId = params ? params.get("workspace") : null;
      
      let allPosts: Post[] = [];
      if (workspaceId) {
        allPosts = await getPosts(token, Number(workspaceId));
      } else {
        allPosts = await getPosts(token);
      }
      setPosts(allPosts);
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        router.push("/login");
      } else {
        console.error("Failed to load posts:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAIProcess(postId: number) {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    setProcessingId(postId);
    try {
      const result = await processPostWithAI(token, postId);
      alert(`✅ ${result.message}`);
      loadPosts(); // Обновить список
    } catch (error: any) {
      alert(`❌ Ошибка: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return <div className="text-white p-8">⏳ Загрузка постов...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Посты</h1>
        {posts.length === 0 ? (
          <div className="text-gray-400">Нет постов для этого клиента.</div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => {
              const hasTranscript = post.transcript && post.transcript.trim().length > 0;
              const hasGeneratedContent = post.generated_content && Object.keys(post.generated_content).length > 0;
              const showAIBtn = hasTranscript && !hasGeneratedContent;

              return (
                <li key={post.id} className="bg-gray-800/60 rounded-lg p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-lg mb-2">{post.title || `Пост #${post.id}`}</div>
                      <div className="text-gray-300 mb-1">Статус: {post.status}</div>
                      <div className="text-gray-400 text-sm mb-2">
                        Создан: {new Date(post.created_at).toLocaleString("ru-RU")}
                      </div>
                      {post.source_url && (
                        <a href={post.source_url} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-400 hover:text-blue-300 text-sm underline">
                          🔗 Источник
                        </a>
                      )}
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      {showAIBtn ? (
                        <button
                          onClick={() => handleAIProcess(post.id)}
                          disabled={processingId === post.id}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            processingId === post.id
                              ? "bg-gray-600 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700 active:scale-95"
                          }`}
                        >
                          {processingId === post.id ? "⏳ Обработка..." : "🤖 AI Обработка"}
                        </button>
                      ) : hasGeneratedContent ? (
                        <span className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm font-medium border border-green-600/30">
                          ✅ Готово
                        </span>
                      ) : null}
                      
                      {!hasTranscript && (
                        <span className="px-4 py-2 bg-gray-700/50 text-gray-500 rounded-lg text-xs">
                          Нет транскрибации
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
