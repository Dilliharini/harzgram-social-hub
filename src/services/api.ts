import { mockApi } from "@/services/mock-backend";

/**
 * ============================================================================
 * HarzGram API service — the ONLY place the app talks to a backend.
 * ============================================================================
 *
 * Right now the app runs on an in-browser mock (no backend), so every method
 * below delegates to `mockApi`. To connect your real REST backend later:
 *
 *   1. Start your backend (e.g. Express/FastAPI in VS Code).
 *   2. Point the app at it:  VITE_API_BASE_URL=http://localhost:3000/api
 *      in a `.env` file at the project root (or edit the fallback below).
 *   3. Set  VITE_USE_MOCK_API=false  — every method then performs real
 *      HTTP requests using the REST paths listed next to each call.
 *
 * The UI components never call fetch directly; they only import `api` from
 * this file, so swapping the transport is a one-line change.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3000/api";

const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK_API !== "false";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface AppUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  joinedAt: number;
}

export interface UserSummary extends AppUser {
  isFollowing: boolean;
  isSelf: boolean;
}

export interface FeedPost {
  id: string;
  author: AppUser;
  text: string;
  imageUrl: string | null;
  createdAt: number;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export interface PostComment {
  id: string;
  author: AppUser;
  text: string;
  createdAt: number;
}

export interface UserProfile extends AppUser {
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface LikeResult {
  likedByMe: boolean;
  likeCount: number;
}

export interface FollowResult {
  isFollowing: boolean;
  followerCount: number;
}

// ---------------------------------------------------------------------------
// REST transport (used when USE_MOCK is false)
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function call<T>(
  path: string,
  mock: () => Promise<T>,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  return USE_MOCK ? mock() : request<T>(path, options);
}

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

export interface SignUpInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface SignInInput {
  username: string;
  password: string;
}

export const api = {
  /** POST /auth/signup */
  signUp: (input: SignUpInput): Promise<AppUser> =>
    call("/auth/signup", () => mockApi.signUp(input), { method: "POST", body: input }),

  /** POST /auth/login */
  signIn: (input: SignInInput): Promise<AppUser> =>
    call("/auth/login", () => mockApi.signIn(input), { method: "POST", body: input }),

  /** POST /auth/logout */
  signOut: (): Promise<{ ok: boolean }> =>
    call("/auth/logout", () => mockApi.signOut(), { method: "POST" }),

  /** GET /auth/me */
  getSessionUser: (): Promise<AppUser | null> =>
    call("/auth/me", () => mockApi.getSessionUser()),

  /** GET /feed */
  getFeed: (): Promise<FeedPost[]> => call("/feed", () => mockApi.getFeed()),

  /** GET /posts/:id */
  getPost: (postId: string): Promise<FeedPost> =>
    call(`/posts/${postId}`, () => mockApi.getPost(postId)),

  /** POST /posts  body: { text } */
  createPost: (text: string): Promise<FeedPost> =>
    call("/posts", () => mockApi.createPost(text), { method: "POST", body: { text } }),

  /** POST /posts/:id/like (toggles) */
  toggleLike: (postId: string): Promise<LikeResult> =>
    call(`/posts/${postId}/like`, () => mockApi.toggleLike(postId), { method: "POST" }),

  /** GET /posts/:id/comments */
  getComments: (postId: string): Promise<PostComment[]> =>
    call(`/posts/${postId}/comments`, () => mockApi.getComments(postId)),

  /** POST /posts/:id/comments  body: { text } */
  addComment: (postId: string, text: string): Promise<PostComment> =>
    call(`/posts/${postId}/comments`, () => mockApi.addComment(postId, text), {
      method: "POST",
      body: { text },
    }),

  /** GET /users/:username */
  getUserProfile: (username: string): Promise<UserProfile> =>
    call(`/users/${encodeURIComponent(username)}`, () => mockApi.getUserProfile(username)),

  /** GET /users/:username/posts */
  getUserPosts: (username: string): Promise<FeedPost[]> =>
    call(`/users/${encodeURIComponent(username)}/posts`, () => mockApi.getUserPosts(username)),

  /** GET /users?q=<query> */
  searchUsers: (query: string): Promise<UserSummary[]> =>
    call(`/users?q=${encodeURIComponent(query)}`, () => mockApi.searchUsers(query)),

  /** GET /users/suggested */
  getSuggestedUsers: (): Promise<UserSummary[]> =>
    call("/users/suggested", () => mockApi.getSuggestedUsers()),

  /** POST /users/:username/follow (toggles follow/unfollow) */
  toggleFollow: (username: string): Promise<FollowResult> =>
    call(`/users/${encodeURIComponent(username)}/follow`, () => mockApi.toggleFollow(username), {
      method: "POST",
    }),
};
