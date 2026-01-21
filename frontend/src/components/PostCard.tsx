import { Post } from "@/lib/api";

interface PostCardProps {
  post: Post;
  onProcess: (postId: number) => void;
  onSelect: (post: Post) => void;
  isSelected: boolean;
}

export default function PostCard({ post, onProcess, onSelect, isSelected }: PostCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-slate-700 text-slate-300";
      case "in_progress":
        return "bg-indigo-700 text-indigo-100 animate-pulse";
      case "ready":
        return "bg-emerald-800 text-emerald-100";
      case "error":
        return "bg-red-900 text-red-200";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return "○";
      case "in_progress":
        return "⏳";
      case "ready":
        return "✓";
      case "error":
        return "✕";
      default:
        return "○";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Новый";
      case "in_progress":
        return "Обработка...";
      case "ready":
        return "Готов";
      case "error":
        return "Ошибка";
      default:
        return status;
    }
  };

  return (
    <div
      onClick={() => onSelect(post)}
      className={`
        p-3 lg:p-4 rounded-lg border cursor-pointer transition-all
        ${
          isSelected
            ? "border-indigo-600 bg-indigo-950/30 shadow-md"
            : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
        }
      `}
    >
      {/* Заголовок и статус */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-100 flex-1 mr-2 line-clamp-2">
          {post.title || `Пост #${post.id}`}
        </h3>
        <span
          className={`
            px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
            ${getStatusColor(post.status)}
          `}
        >
          <span>{getStatusIcon(post.status)}</span>
          <span>{getStatusText(post.status)}</span>
        </span>
      </div>

      {/* Исходный текст */}
      {post.original_text && (
        <div className="mb-2">
          <p className="text-xs text-slate-400 line-clamp-2">
            {post.original_text}
          </p>
        </div>
      )}

      {/* Сгенерированный контент */}
      {post.generated_caption && (
        <div className="mb-2 p-2 bg-emerald-950/30 rounded border border-emerald-800/50">
          <p className="text-xs text-emerald-300 line-clamp-2">
            {post.generated_caption}
          </p>
        </div>
      )}

      {/* Ошибка */}
      {post.error_message && (
        <div className="mb-2 p-2 bg-red-950/30 rounded border border-red-800/50">
          <p className="text-xs text-red-300 line-clamp-1">
            {post.error_message}
          </p>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700 gap-2">
        <span className="text-xs text-slate-500 truncate">
          {new Date(post.created_at).toLocaleDateString("ru-RU")}
        </span>

        {post.status === "new" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProcess(post.id);
            }}
            className="
              px-2 lg:px-3 py-1 text-xs font-medium rounded
              bg-indigo-700 hover:bg-indigo-800 text-white
              transition-colors whitespace-nowrap flex-shrink-0
            "
          >
            Обработать
          </button>
        )}

        {post.status === "error" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProcess(post.id);
            }}
            className="
              px-2 lg:px-3 py-1 text-xs font-medium rounded
              bg-red-800 hover:bg-red-900 text-white
              transition-colors whitespace-nowrap flex-shrink-0
            "
          >
            Повторить
          </button>
        )}

        {post.status === "in_progress" && (
          <span className="text-xs text-blue-400 animate-pulse">
            Обработка...
          </span>
        )}
      </div>
    </div>
  );
}
