"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPosts, Post } from "@/lib/api";

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

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
      let allPosts: Post[] = [];
      // read workspace from query string on the client
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const workspaceId = params ? params.get("workspace") : null;
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

  if (loading) {
    return <div className="text-white p-8">⏳ Загрузка постов...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Посты</h1>
        {posts.length === 0 ? (
          <div className="text-gray-400">Нет постов для этого клиента.</div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id} className="bg-slate-800/60 rounded-lg p-4 text-white">
                <div className="font-bold text-lg mb-2">{post.title || `Пост #${post.id}`}</div>
                <div className="text-gray-300 mb-1">{post.status}</div>
                <div className="text-gray-400 text-sm">Создан: {new Date(post.created_at).toLocaleString("ru-RU")}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
