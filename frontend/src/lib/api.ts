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
  created_at: string;
  updated_at: string;
  posts_count: number;
  recent_activities: Activity[];
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

  return res.json();
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
  type: "caption" | "script" | "other";
  content: string;
  is_active: boolean;
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
 * GET /api/posts/?workspace={id}
 */
export async function getPosts(
  accessToken: string,
  workspaceId?: number
): Promise<Post[]> {
  const url = workspaceId ? `${API_URL}/api/posts/?workspace=${workspaceId}` : `${API_URL}/api/posts/`;
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

  return res.json();
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

  return res.json();
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
  }
): Promise<Prompt> {
  const res = await fetch(`${API_URL}/api/prompts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "caption",
      is_active: true,
      ...data,
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

  return res.json();
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

  return res.json();
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

  return res.json();
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
  last_scraping_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateSystemSettings {
  auto_scraping_enabled?: boolean;
  scraping_hour?: number;
  scraping_minute?: number;
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

  return res.json();
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

