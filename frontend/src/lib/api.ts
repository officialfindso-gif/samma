const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

/**
 * Paginated response from DRF PageNumberPagination
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Helper: extract results from paginated or non-paginated response.
 * Handles both formats safely:
 * - Paginated: { count, next, previous, results: [...] }
 * - Non-paginated: [...] (plain array)
 */
async function parsePaginated<T>(res: Response): Promise<T[]> {
  const data = await res.json();
  // If it's a paginated response with a "results" array, use it
  if (data && typeof data === "object" && Array.isArray(data.results)) {
    return data.results;
  }
  // If it's already an array, return it directly
  if (Array.isArray(data)) {
    return data;
  }
  // Fallback: empty array for unexpected formats
  console.warn("Unexpected API response format:", data);
  return [];
}

/**
 * Логин через JWT эндпоинт Django:
 * POST /api/auth/token/
 */
export async function login(
  username: string,
  password: string
): Promise<TokenPair> {
  const res = await fetch(`${API_URL}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Обновление access токена через refresh токен:
 * POST /api/auth/token/refresh/
 */
export async function refreshToken(
  refreshToken: string
): Promise<{ access: string }> {
  const res = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) {
    throw new Error("REFRESH_TOKEN_EXPIRED");
  }

  return res.json();
}

export interface Workspace {
  id: number;
  name: string;
  seats_limit: number;
  is_client: boolean;
  client_name: string;
  client_contact: string;
  client_notes: string;
  color: string;
  tags: string;
  tags_list: string[];
  auto_scraping_enabled: boolean;
  scraping_hour: number;
  scraping_minute: number;
  last_auto_scrape_at: string | null;
  created_at: string;
  updated_at: string;
  posts_count: number;
  recent_activities: Activity[];
  current_user_role: "owner" | "admin" | "editor" | "viewer" | null;
}

export interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

export interface CreateWorkspace {
  name: string;
  seats_limit?: number;
  is_client?: boolean;
  client_name?: string;
  client_contact?: string;
  client_notes?: string;
  color?: string;
  tags?: string;
  auto_scraping_enabled?: boolean;
  scraping_hour?: number;
  scraping_minute?: number;
}

/**
 * GET /api/workspaces/
 */
export async function getWorkspaces(
  accessToken: string
): Promise<Workspace[]> {
  const res = await fetch(`${API_URL}/api/workspaces/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load workspaces: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * POST /api/workspaces/
 */
export async function createWorkspace(
  accessToken: string,
  data: CreateWorkspace
): Promise<Workspace> {
  const res = await fetch(`${API_URL}/api/workspaces/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create workspace: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PATCH /api/workspaces/{id}/
 */
export async function updateWorkspace(
  accessToken: string,
  id: number,
  data: Partial<CreateWorkspace>
): Promise<Workspace> {
  const res = await fetch(`${API_URL}/api/workspaces/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update workspace: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * DELETE /api/workspaces/{id}/
 */
export async function deleteWorkspace(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/workspaces/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete workspace: ${res.status} ${text}`);
  }
}

export interface Post {
  id: number;
  workspace: number;
  title: string;
  source_url: string;
  platform: string;
  status: string;
  original_text: string;
  transcript: string;
  generated_caption: string;
  generated_script: string;
  generated_title: string;
  generated_description: string;
  generated_original: string;
  description: string;
  error_message: string;
  // Метрики вирусности
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number | null;
  engagement_rate: string | null;  // DecimalField приходит как string
  video_duration: number | null;
  published_at: string | null;
  // Дополнительные метрики
  play_count: number | null;
  saves_count: number | null;
  author_followers: number | null;
  has_audio: boolean | null;
  is_video: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: number;
  workspace: number;
  name: string;
  type: "caption" | "script" | "title" | "description" | "original" | "other";
  content: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  period_months: number;
  max_workspaces: number;
  max_seats_per_workspace: number;
  max_posts_per_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: number;
  user: number;
  plan: number | SubscriptionPlan;  // Может быть ID или вложенным объектом
  workspace: number | Workspace;    // Может быть ID или вложенным объектом
  start_date: string;
  end_date: string;
  is_active: boolean;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}


/**
 * GET /api/posts/?workspace={id}&sort={field}&ordering={asc|desc}&min_er={value}
 */
export async function getPosts(
  accessToken: string,
  workspaceId?: number,
  params?: { sort?: string; ordering?: "asc" | "desc"; min_er?: number }
): Promise<Post[]> {
  const searchParams = new URLSearchParams();
  if (workspaceId) searchParams.set("workspace", String(workspaceId));
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.ordering) searchParams.set("ordering", params.ordering);
  if (params?.min_er != null && !isNaN(params.min_er)) searchParams.set("min_er", String(params.min_er));

  const url = searchParams.toString()
    ? `${API_URL}/api/posts/?${searchParams.toString()}`
    : `${API_URL}/api/posts/`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load posts: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * POST /api/posts/{id}/process/
 * Запуск фоновой обработки поста.
 */
export async function processPost(
  accessToken: string,
  postId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/process/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    throw new Error(`Failed to process post: ${res.status} ${text}`);
  }
}

export interface CreatePostPayload {
  workspace: number;
  title?: string;
  source_url?: string;
  original_text?: string;
  platform?: string;
}

/**
 * POST /api/posts/
 * Создание нового поста.
 */
export async function createPost(
  accessToken: string,
  payload: CreatePostPayload
): Promise<Post> {
  const res = await fetch(`${API_URL}/api/posts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform: "instagram",
      ...payload,
    }),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create post: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PATCH /api/posts/{id}/
 * Обновление поста.
 */
export async function updatePost(
  accessToken: string,
  postId: number,
  data: { title?: string; original_text?: string; transcript?: string }
): Promise<Post> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update post: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * DELETE /api/posts/{id}/
 * Удаление поста.
 */
export async function deletePost(
  accessToken: string,
  postId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete post: ${res.status} ${text}`);
  }
}

/**
 * GET /api/prompts/?workspace={id}
 */
export async function getPrompts(
  accessToken: string,
  workspaceId: number
): Promise<Prompt[]> {
  const res = await fetch(
    `${API_URL}/api/prompts/?workspace=${workspaceId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load prompts: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * PATCH /api/prompts/{id}/
 */
export async function updatePrompt(
  accessToken: string,
  promptId: number,
  data: Partial<Pick<Prompt, "name" | "type" | "content" | "is_active">>
): Promise<Prompt> {
  const res = await fetch(`${API_URL}/api/prompts/${promptId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update prompt: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * DELETE /api/prompts/{id}/
 */
export async function deletePrompt(
  accessToken: string,
  promptId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/prompts/${promptId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete prompt: ${res.status} ${text}`);
  }
}

/**
 * POST /api/prompts/
 */
export async function createPrompt(
  accessToken: string,
  data: {
    workspace: number;
    name: string;
    type?: Prompt["type"];
    content: string;
    is_active?: boolean;
    is_default?: boolean;
  }
): Promise<Prompt> {
  const res = await fetch(`${API_URL}/api/prompts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspace: data.workspace,
      name: data.name,
      type: data.type || "caption",
      content: data.content,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_default: data.is_default || false,
    }),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create prompt: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * POST /api/prompts/{id}/set_default/
 */
export async function setDefaultPrompt(
  accessToken: string,
  promptId: number
): Promise<{ detail: string; is_default: boolean }> {
  const res = await fetch(`${API_URL}/api/prompts/${promptId}/set_default/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to set default prompt: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * GET /api/subscription-plans/
 */
export async function getSubscriptionPlans(
  accessToken: string
): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${API_URL}/api/subscription-plans/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load subscription plans: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * GET /api/user-subscriptions/
 */
export async function getUserSubscriptions(
  accessToken: string
): Promise<UserSubscription[]> {
  const res = await fetch(`${API_URL}/api/user-subscriptions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load user subscriptions: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * POST /api/user-subscriptions/
 */
export async function createUserSubscription(
  accessToken: string,
  data: {
    plan: number;
    workspace: number;
  }
): Promise<UserSubscription> {
  const res = await fetch(`${API_URL}/api/user-subscriptions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create user subscription: ${res.status} ${text}`);
  }

  return res.json();
}


// ========================
// CompetitorAccount API
// ========================

export interface CompetitorAccount {
  id: number;
  workspace: number;
  workspace_name: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  url: string;
  is_active: boolean;
  last_scraped_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompetitorAccount {
  workspace: number;
  platform: 'instagram' | 'tiktok' | 'youtube';
  username: string;
  url: string;
  is_active?: boolean;
  notes?: string;
}

/**
 * GET /api/competitors/
 */
export async function getCompetitorAccounts(
  accessToken: string
): Promise<CompetitorAccount[]> {
  const res = await fetch(`${API_URL}/api/competitors/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load competitor accounts: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * POST /api/competitors/
 */
export async function createCompetitorAccount(
  accessToken: string,
  data: CreateCompetitorAccount
): Promise<CompetitorAccount> {
  const res = await fetch(`${API_URL}/api/competitors/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create competitor account: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PATCH /api/competitors/{id}/
 */
export async function updateCompetitorAccount(
  accessToken: string,
  id: number,
  data: Partial<CreateCompetitorAccount>
): Promise<CompetitorAccount> {
  const res = await fetch(`${API_URL}/api/competitors/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update competitor account: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * DELETE /api/competitors/{id}/
 */
export async function deleteCompetitorAccount(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/competitors/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete competitor account: ${res.status} ${text}`);
  }
}

/**
 * POST /api/competitors/{id}/scrape/
 */
export async function scrapeCompetitorAccount(
  accessToken: string,
  id: number
): Promise<{ message: string; task_id: string; competitor_id: number }> {
  const res = await fetch(`${API_URL}/api/competitors/${id}/scrape/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to scrape competitor account: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * POST /api/competitors/scrape_all/
 */
export async function scrapeAllCompetitors(
  accessToken: string
): Promise<{ message: string; task_id: string }> {
  const res = await fetch(`${API_URL}/api/competitors/scrape_all/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to scrape all competitors: ${res.status} ${text}`);
  }

  return res.json();
}


// ============= System Settings API =============

export interface SystemSettings {
  id: number;
  auto_scraping_enabled: boolean;
  scraping_hour: number;
  scraping_minute: number;
  max_parse_depth: number;
  max_workspaces_per_user: number;
  max_api_calls_per_day: number;
  last_scraping_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateSystemSettings {
  auto_scraping_enabled?: boolean;
  scraping_hour?: number;
  scraping_minute?: number;
  max_parse_depth?: number;
  max_workspaces_per_user?: number;
  max_api_calls_per_day?: number;
}

/**
 * GET /api/settings/current/
 */
export async function getSystemSettings(
  accessToken: string
): Promise<SystemSettings> {
  const res = await fetch(`${API_URL}/api/settings/current/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get system settings: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PATCH /api/settings/1/
 */
export async function updateSystemSettings(
  accessToken: string,
  data: UpdateSystemSettings
): Promise<SystemSettings> {
  const res = await fetch(`${API_URL}/api/settings/1/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update system settings: ${res.status} ${text}`);
  }

  return res.json();
}

// ===== WORKSPACE ACTIVITIES =====

export interface WorkspaceActivity {
  id: number;
  workspace: number;
  activity_type: 'note' | 'call' | 'meeting' | 'email' | 'post_created' | 'post_approved' | 'payment' | 'other';
  title: string;
  description: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface CreateWorkspaceActivity {
  workspace: number;
  activity_type: 'note' | 'call' | 'meeting' | 'email' | 'post_created' | 'post_approved' | 'payment' | 'other';
  title: string;
  description?: string;
}

/**
 * GET /api/activities/
 */
export async function getActivities(
  accessToken: string,
  workspaceId?: number
): Promise<WorkspaceActivity[]> {
  let url = `${API_URL}/api/activities/`;
  if (workspaceId) {
    url += `?workspace=${workspaceId}`;
  }
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load activities: ${res.status} ${text}`);
  }

  return parsePaginated(res);
}

/**
 * POST /api/activities/
 */
export async function createActivity(
  accessToken: string,
  data: CreateWorkspaceActivity
): Promise<WorkspaceActivity> {
  const res = await fetch(`${API_URL}/api/activities/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create activity: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * PATCH /api/activities/{id}/
 */
export async function updateActivity(
  accessToken: string,
  id: number,
  data: { title?: string; description?: string; activity_type?: WorkspaceActivity['activity_type'] }
): Promise<WorkspaceActivity> {
  const res = await fetch(`${API_URL}/api/activities/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update activity: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * DELETE /api/activities/{id}/
 */
export async function deleteActivity(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/activities/${id}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete activity: ${res.status} ${text}`);
  }
}

/**
 * GET /api/auth/me/
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get current user: ${res.status} ${text}`);
  }

  return res.json();
}

export interface AdminStats {
  total_workspaces: number;
  total_posts: number;
  recent_posts_week: number;
  status_stats: Record<string, number>;
  platform_stats: Record<string, number>;
  latest_posts: {
    id: number;
    title: string;
    status: string;
    platform: string;
    workspace_name: string;
    created_at: string;
  }[];
  top_workspaces: {
    id: number;
    name: string;
    posts_count: number;
    is_client: boolean;
  }[];
}

/**
 * GET /api/admin/stats/
 */
export async function getAdminStats(accessToken: string): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/api/admin/stats/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get admin stats: ${res.status} ${text}`);
  }

  return res.json();
}

// ========================
// Admin API Errors
// ========================

export interface AdminApiErrors {
  today_total: number;
  today_errors: number;
  week_errors: number;
  success_rate: number;
  platform_errors: Record<string, number>;
  recent_errors: {
    id: number;
    username: string;
    platform: string;
    url: string;
    error_message: string;
    created_at: string;
  }[];
  top_error_users: {
    username: string;
    error_count: number;
  }[];
}

/**
 * GET /api/admin/api-errors/
 */
export async function getAdminApiErrors(accessToken: string): Promise<AdminApiErrors> {
  const res = await fetch(`${API_URL}/api/admin/api-errors/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get API errors: ${res.status} ${text}`);
  }
  return res.json();
}

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  workspaces_count: number;
  posts_count: number;
  license_start_date: string | null;
  license_end_date: string | null;
}

export interface AdminUsersResponse {
  total_users: number;
  active_users: number;
  users: AdminUserRow[];
}

/**
 * GET /api/admin/users/
 */
export async function getAdminUsers(accessToken: string): Promise<AdminUsersResponse> {
  const res = await fetch(`${API_URL}/api/admin/users/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get admin users: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * POST /api/admin/users/{id}/revoke/
 */
export async function revokeUserAccount(accessToken: string, userId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/revoke/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to revoke user: ${res.status} ${text}`);
  }
}

/**
 * PATCH /api/admin/users/{id}/license/
 */
export async function updateUserLicense(
  accessToken: string,
  userId: number,
  data: { license_start_date: string | null; license_end_date: string | null }
): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users/${userId}/license/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update user license: ${res.status} ${text}`);
  }
}


// ========================
// Invite Token API
// ========================

export interface InviteToken {
  id: number;
  token: string;
  email: string;
  workspace: number;
  workspace_name: string;
  role: string;
  expires_at: string;
  used: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  is_expired: boolean;
}

export interface CreateInviteToken {
  workspace: number;
  role?: string;
  email?: string;
  expires_at: string;
}

export interface IssueAccountPayload {
  username: string;
  email?: string;
  password: string;
  workspace?: number | null;
  role?: "admin" | "editor" | "viewer";
  create_personal_workspace?: boolean;
}

/**
 * GET /api/invites/
 */
export async function getInviteTokens(
  accessToken: string
): Promise<InviteToken[]> {
  const res = await fetch(`${API_URL}/api/invites/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load invites: ${res.status} ${text}`);
  }
  return parsePaginated(res);
}

/**
 * POST /api/invites/
 */
export async function createInviteToken(
  accessToken: string,
  data: CreateInviteToken
): Promise<InviteToken> {
  const res = await fetch(`${API_URL}/api/invites/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create invite: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * DELETE /api/invites/{id}/
 */
export async function deleteInviteToken(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/invites/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete invite: ${res.status} ${text}`);
  }
}

/**
 * POST /api/auth/register/
 */
export async function registerWithInvite(
  data: { username: string; email: string; password: string; invite_token: string }
): Promise<{ access: string; refresh: string; user: { id: number; username: string; email: string } }> {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registration failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * POST /api/auth/issue-account/
 */
export async function issueAccount(
  accessToken: string,
  data: IssueAccountPayload
): Promise<{ user: { id: number; username: string; email: string } }> {
  const res = await fetch(`${API_URL}/api/auth/issue-account/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to issue account: ${res.status} ${text}`);
  }
  return res.json();
}


// ========================
// Post Notes API
// ========================

export interface PostNote {
  id: number;
  post: number;
  content: string;
  author: number | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePostNote {
  post: number;
  content: string;
}

/**
 * GET /api/post-notes/?post={postId}
 */
export async function getPostNotes(
  accessToken: string,
  postId: number
): Promise<PostNote[]> {
  const res = await fetch(`${API_URL}/api/post-notes/?post=${postId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load notes: ${res.status} ${text}`);
  }
  return parsePaginated(res);
}

/**
 * POST /api/post-notes/
 */
export async function createPostNote(
  accessToken: string,
  data: CreatePostNote
): Promise<PostNote> {
  const res = await fetch(`${API_URL}/api/post-notes/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create note: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * DELETE /api/post-notes/{id}/
 */
export async function deletePostNote(
  accessToken: string,
  id: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/post-notes/${id}/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete note: ${res.status} ${text}`);
  }
}


/**
 * Запустить AI-обработку поста (генерация контента из транскрибации)
 */
export async function processPostWithAI(
  accessToken: string,
  postId: number
): Promise<{ message: string; status: string }> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/process_with_ai/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Ошибка обработки: ${res.status}`);
  }

  return res.json();
}
