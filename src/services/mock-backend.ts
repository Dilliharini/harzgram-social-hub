import { seedComments, seedFollows, seedPosts, seedUsers } from "@/data/sample-data";
import { clearSessionUsername, getSessionUsername, setSessionUsername } from "@/lib/session";
import type {
  AppUser,
  FeedPost,
  FollowResult,
  LikeResult,
  PostComment,
  SignUpInput,
  SignInInput,
  UserSummary,
  UserProfile,
} from "./api";

/**
 * In-browser mock backend. Simulates the REST API described in
 * src/services/api.ts with realistic sample data, small latency, and
 * localStorage persistence so likes/follows survive a page refresh.
 *
 * Delete this file once the real backend is connected (set
 * VITE_USE_MOCK_API=false and remove the mock delegation in api.ts).
 */

interface MockUser extends AppUser {
  baseFollowerCount: number;
  baseFollowingCount: number;
}

interface StoredPost {
  id: string;
  authorUsername: string;
  text: string;
  imageUrl: string | null;
  createdAt: number;
  likeCount: number;
}

interface StoredComment {
  id: string;
  postId: string;
  authorUsername: string;
  text: string;
  createdAt: number;
}

interface MockDb {
  users: MockUser[];
  posts: StoredPost[];
  comments: StoredComment[];
  /** `${username}:${postId}` */
  likes: string[];
  /** `${followerUsername}:${targetUsername}` */
  follows: string[];
}

const DB_KEY = "harzgram_mock_db_v1";
let db: MockDb | null = null;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function seedDb(): MockDb {
  const now = Date.now();
  return {
    users: seedUsers.map((u) => ({
      id: `u-${u.username}`,
      username: u.username,
      name: u.name,
      bio: u.bio,
      baseFollowerCount: u.baseFollowerCount,
      baseFollowingCount: u.baseFollowingCount,
      joinedAt: now - u.joinedDaysAgo * 86_400_000,
    })),
    posts: seedPosts.map((p) => ({
      id: p.id,
      authorUsername: p.author,
      text: p.text,
      imageUrl: p.image ?? null,
      createdAt: now - p.minutesAgo * 60_000,
      likeCount: p.likeCount,
    })),
    comments: seedComments.map((c) => ({
      id: c.id,
      postId: c.postId,
      authorUsername: c.author,
      text: c.text,
      createdAt: now - c.minutesAgo * 60_000,
    })),
    likes: [],
    follows: seedFollows.map(([follower, target]) => `${follower}:${target}`),
  };
}

function loadDb(): MockDb {
  if (db) return db;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        db = JSON.parse(raw) as MockDb;
        return db;
      } catch {
        // corrupted storage; reseed below
      }
    }
  }
  db = seedDb();
  persist();
  return db;
}

function persist(): void {
  if (typeof window === "undefined" || !db) return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // storage full/unavailable — mock keeps working in memory
  }
}

const delay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 250));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findUser(username: string): MockUser | undefined {
  const needle = username.toLowerCase();
  return loadDb().users.find((u) => u.username.toLowerCase() === needle);
}

function requireMe(): MockUser {
  const username = getSessionUsername();
  const me = username ? findUser(username) : undefined;
  if (!me) {
    clearSessionUsername();
    throw new Error("You're signed out. Please sign in again.");
  }
  return me;
}

function toAppUser(user: MockUser): AppUser {
  const { id, username, name, bio, joinedAt } = user;
  return { id, username, name, bio, joinedAt };
}

function fallbackAuthor(username: string): AppUser {
  return { id: username, username, name: username, bio: "", joinedAt: 0 };
}

function liveFollowerCount(user: MockUser): number {
  return loadDb().follows.filter((f) => f.endsWith(`:${user.username}`)).length;
}

function liveFollowingCount(user: MockUser): number {
  return loadDb().follows.filter((f) => f.startsWith(`${user.username}:`)).length;
}

function commentCount(postId: string): number {
  return loadDb().comments.filter((c) => c.postId === postId).length;
}

function toFeedPost(post: StoredPost): FeedPost {
  const database = loadDb();
  const me = getSessionUsername()?.toLowerCase() ?? "";
  const author = findUser(post.authorUsername);
  return {
    id: post.id,
    author: author ? toAppUser(author) : fallbackAuthor(post.authorUsername),
    text: post.text,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt,
    likeCount: post.likeCount,
    likedByMe: database.likes.includes(`${me}:${post.id}`),
    commentCount: commentCount(post.id),
  };
}

function toUserSummary(user: MockUser): UserSummary {
  const me = getSessionUsername()?.toLowerCase() ?? "";
  return {
    ...toAppUser(user),
    isFollowing: loadDb().follows.includes(`${me}:${user.username}`),
    isSelf: user.username.toLowerCase() === me,
  };
}

// ---------------------------------------------------------------------------
// Mock endpoints
// ---------------------------------------------------------------------------

export const mockApi = {
  async signUp(input: SignUpInput): Promise<AppUser> {
    await delay();
    const username = input.username.trim();
    if (!/^[a-z0-9._]{3,20}$/i.test(username)) {
      throw new Error("Usernames are 3–20 characters: letters, numbers, dots or underscores.");
    }
    if (findUser(username)) {
      throw new Error(`The username "${username}" is already taken. Try another one.`);
    }
    const user: MockUser = {
      id: `u-${Date.now()}`,
      username,
      name: input.name.trim() || username,
      bio: "New on HarzGram — saying hi! 👋",
      baseFollowerCount: 0,
      baseFollowingCount: 0,
      joinedAt: Date.now(),
    };
    loadDb().users.push(user);
    setSessionUsername(username);
    persist();
    return toAppUser(user);
  },

  async signIn(input: SignInInput): Promise<AppUser> {
    await delay();
    const user = findUser(input.username.trim());
    if (!user) {
      throw new Error(`We couldn't find anyone with the username "${input.username.trim()}". Try maya.chen!`);
    }
    // The mock accepts any password — the real backend enforces credentials.
    setSessionUsername(user.username);
    return toAppUser(user);
  },

  async signOut(): Promise<{ ok: boolean }> {
    await delay();
    clearSessionUsername();
    return { ok: true };
  },

  async getSessionUser(): Promise<AppUser | null> {
    await delay();
    try {
      return toAppUser(requireMe());
    } catch {
      return null;
    }
  },

  async getFeed(): Promise<FeedPost[]> {
    await delay();
    requireMe();
    return loadDb()
      .posts.slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toFeedPost);
  },

  async getPost(postId: string): Promise<FeedPost> {
    await delay();
    requireMe();
    const post = loadDb().posts.find((p) => p.id === postId);
    if (!post) throw new Error("That post no longer exists.");
    return toFeedPost(post);
  },

  async createPost(text: string): Promise<FeedPost> {
    await delay();
    const me = requireMe();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Your post needs some text.");
    if (trimmed.length > 280) throw new Error("Posts are limited to 280 characters.");
    const post: StoredPost = {
      id: `p-${Date.now()}`,
      authorUsername: me.username,
      text: trimmed,
      imageUrl: null,
      createdAt: Date.now(),
      likeCount: 0,
    };
    loadDb().posts.push(post);
    persist();
    return toFeedPost(post);
  },

  async toggleLike(postId: string): Promise<LikeResult> {
    await delay();
    const me = requireMe();
    const post = loadDb().posts.find((p) => p.id === postId);
    if (!post) throw new Error("That post no longer exists.");
    const key = `${me.username}:${postId}`;
    const likes = loadDb().likes;
    const index = likes.indexOf(key);
    if (index >= 0) {
      likes.splice(index, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      likes.push(key);
      post.likeCount += 1;
    }
    persist();
    return { likedByMe: index < 0, likeCount: post.likeCount };
  },

  async getComments(postId: string): Promise<PostComment[]> {
    await delay();
    requireMe();
    return loadDb()
      .comments.filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((c) => {
        const author = findUser(c.authorUsername);
        const comment: PostComment = {
          id: c.id,
          author: author ? toAppUser(author) : fallbackAuthor(c.authorUsername),
          text: c.text,
          createdAt: c.createdAt,
        };
        return comment;
      });
  },

  async addComment(postId: string, text: string): Promise<PostComment> {
    await delay();
    const me = requireMe();
    const post = loadDb().posts.find((p) => p.id === postId);
    if (!post) throw new Error("That post no longer exists.");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Comments can't be empty.");
    const comment: StoredComment = {
      id: `c-${Date.now()}`,
      postId,
      authorUsername: me.username,
      text: trimmed,
      createdAt: Date.now(),
    };
    loadDb().comments.push(comment);
    persist();
    return {
      id: comment.id,
      author: toAppUser(me),
      text: comment.text,
      createdAt: comment.createdAt,
    };
  },

  async getUserProfile(username: string): Promise<UserProfile> {
    await delay();
    const me = requireMe();
    const target = findUser(username);
    if (!target) throw new Error("That profile doesn't exist (yet).");
    const database = loadDb();
    return {
      ...toAppUser(target),
      postCount: database.posts.filter((p) => p.authorUsername === target.username).length,
      followerCount: target.baseFollowerCount + liveFollowerCount(target),
      followingCount: target.baseFollowingCount + liveFollowingCount(target),
      isFollowing: database.follows.includes(`${me.username}:${target.username}`),
      isSelf: target.username.toLowerCase() === me.username.toLowerCase(),
    };
  },

  async getUserPosts(username: string): Promise<FeedPost[]> {
    await delay();
    requireMe();
    const target = findUser(username);
    if (!target) throw new Error("That profile doesn't exist (yet).");
    return loadDb()
      .posts.filter((p) => p.authorUsername === target.username)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toFeedPost);
  },

  async searchUsers(query: string): Promise<UserSummary[]> {
    await delay();
    requireMe();
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return loadDb()
      .users.filter(
        (u) =>
          u.username.toLowerCase().includes(needle) ||
          u.name.toLowerCase().includes(needle) ||
          u.bio.toLowerCase().includes(needle),
      )
      .sort((a, b) => b.baseFollowerCount - a.baseFollowerCount)
      .map(toUserSummary);
  },

  async getSuggestedUsers(): Promise<UserSummary[]> {
    await delay();
    const me = requireMe();
    const database = loadDb();
    return database.users
      .filter(
        (u) =>
          u.username.toLowerCase() !== me.username.toLowerCase() &&
          !database.follows.includes(`${me.username}:${u.username}`),
      )
      .sort((a, b) => b.baseFollowerCount - a.baseFollowerCount)
      .slice(0, 5)
      .map(toUserSummary);
  },

  async toggleFollow(username: string): Promise<FollowResult> {
    await delay();
    const me = requireMe();
    const target = findUser(username);
    if (!target) throw new Error("That profile doesn't exist (yet).");
    if (target.username.toLowerCase() === me.username.toLowerCase()) {
      throw new Error("You can't follow yourself — you're already great.");
    }
    const key = `${me.username}:${target.username}`;
    const follows = loadDb().follows;
    const index = follows.indexOf(key);
    if (index >= 0) {
      follows.splice(index, 1);
    } else {
      follows.push(key);
    }
    persist();
    return { isFollowing: index < 0, followerCount: target.baseFollowerCount + liveFollowerCount(target) };
  },
};
