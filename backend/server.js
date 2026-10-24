import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import session from "express-session";
import pg from "pg";

const BACKEND_DIRECTORY = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(BACKEND_DIRECTORY, ".env") });

const isProduction = process.env.NODE_ENV === "production";
const {
  DATABASE_URL,
  SESSION_SECRET,
  FRONTEND_ORIGIN = isProduction ? "" : "http://localhost:5173",
  PORT = "3000",
  SESSION_COOKIE_SECURE = "false",
  PUBLIC_API_URL = `http://localhost:${PORT}`,
  UPLOAD_DIR = "uploads",
} = process.env;

if (!DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!SESSION_SECRET || SESSION_SECRET.length < 32 || SESSION_SECRET.startsWith("replace-with-")) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}
if (!/^\d+$/.test(PORT) || Number(PORT) < 1 || Number(PORT) > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}
if (!["true", "false"].includes(SESSION_COOKIE_SECURE)) {
  throw new Error("SESSION_COOKIE_SECURE must be true or false.");
}

const allowedOrigins = new Set(
  FRONTEND_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (allowedOrigins.size === 0) throw new Error("FRONTEND_ORIGIN must include at least one origin.");

function isLocalFrontendOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function isAllowedFrontendOrigin(origin) {
  return allowedOrigins.has(origin) || (!isProduction && isLocalFrontendOrigin(origin));
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const PgSessionStore = connectPgSimple(session);
const app = express();
const uploadDirectory = resolve(BACKEND_DIRECTORY, UPLOAD_DIR);
const publicApiUrl = PUBLIC_API_URL.replace(/\/+$/, "");
const publicApiOrigin = new URL(publicApiUrl);
if (
  !["http:", "https:"].includes(publicApiOrigin.protocol) ||
  publicApiOrigin.username ||
  publicApiOrigin.password ||
  publicApiOrigin.pathname !== "/" ||
  publicApiOrigin.search ||
  publicApiOrigin.hash
) {
  throw new Error(
    "PUBLIC_API_URL must be an HTTP(S) origin without credentials, path, query, or hash.",
  );
}
await mkdir(uploadDirectory, { recursive: true });

const cookieName = "harzgram.sid";
const cookieOptions = {
  httpOnly: true,
  secure: SESSION_COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/",
};

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedFrontendOrigin(origin)) {
        callback(null, origin ?? true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(
  "/uploads",
  express.static(uploadDirectory, {
    dotfiles: "deny",
    index: false,
    maxAge: "1y",
    immutable: true,
    setHeaders(res) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS" &&
    origin &&
    !isAllowedFrontendOrigin(origin)
  ) {
    res.status(403).json({ message: "Origin is not allowed." });
    return;
  }
  next();
});
app.use(express.json({ limit: "32kb" }));
app.use(
  session({
    name: cookieName,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    cookie: { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 },
  }),
);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireString(value, field, { min = 1, max = 280, trim = true } = {}) {
  if (typeof value !== "string") throw httpError(400, `${field} must be a string.`);
  const result = trim ? value.trim() : value;
  if (result.length < min || result.length > max) {
    throw httpError(400, `${field} must be between ${min} and ${max} characters.`);
  }
  return result;
}

function normalizeUsername(value) {
  const username = requireString(value, "Username", { min: 3, max: 20 }).toLowerCase();
  if (!/^[a-z0-9._]{3,20}$/.test(username)) {
    throw httpError(400, "Usernames are 3–20 characters: letters, numbers, dots or underscores.");
  }
  return username;
}

function normalizeEmail(value) {
  if (value === undefined || value === null || value === "") return null;
  const email = requireString(value, "Email", { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, "Enter a valid email address.");
  }
  return email;
}

function requireUuid(value, field) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw httpError(400, `${field} must be a valid ID.`);
  }
  return value;
}

function toAppUser(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    bio: row.bio,
    joinedAt: new Date(row.joined_at).getTime(),
  };
}

function toFeedPost(row) {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      username: row.author_username,
      name: row.author_name,
      bio: row.author_bio,
      joinedAt: new Date(row.author_joined_at).getTime(),
    },
    text: row.text,
    imageUrl: row.image_url,
    createdAt: new Date(row.created_at).getTime(),
    likeCount: Number(row.like_count),
    likedByMe: row.liked_by_me,
    commentCount: Number(row.comment_count),
  };
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ message: "You're signed out. Please sign in again." });
    return;
  }
  next();
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

const userColumns = "id, username, name, bio, joined_at";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024 },
  fileFilter(_req, file, callback) {
    if (!allowedImageTypes.has(file.mimetype)) {
      callback(httpError(400, "Choose a JPEG, PNG, or WebP image."));
      return;
    }
    callback(null, true);
  },
});

function imageExtension(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return ".png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }
  throw httpError(400, "The uploaded file is not a supported JPEG, PNG, or WebP image.");
}

function getLocalUploadPath(imageUrl) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (url.origin !== publicApiOrigin.origin) return null;
    const match =
      /^\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i.exec(
        url.pathname,
      );
    if (!match) return null;
    const filename = basename(match[1]);
    const filePath = resolve(uploadDirectory, filename);
    return filePath.startsWith(`${uploadDirectory}${process.platform === "win32" ? "\\" : "/"}`)
      ? filePath
      : null;
  } catch {
    return null;
  }
}

async function cleanupExpiredStories() {
  const expired = await pool.query(
    "DELETE FROM stories WHERE expires_at <= NOW() RETURNING id, image_url",
  );
  for (const story of expired.rows) {
    const imagePath = getLocalUploadPath(story.image_url);
    if (!imagePath) continue;
    try {
      await unlink(imagePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(
          `Expired story ${story.id} was removed, but its image could not be deleted.`,
          error,
        );
      }
    }
  }
}

async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT ${userColumns} FROM users WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  return result.rows[0] ?? null;
}

const feedSelect = `
  SELECT
    p.id, p.text, p.image_url, p.created_at,
    u.id AS author_id, u.username AS author_username, u.name AS author_name,
    u.bio AS author_bio, u.joined_at AS author_joined_at,
    (SELECT COUNT(*)::int FROM likes l WHERE l.post_id = p.id) AS like_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked_by_me,
    (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count
  FROM posts p
  JOIN users u ON u.id = p.author_id`;

app.get(
  "/health",
  route(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  }),
);

app.post(
  "/auth/signup",
  route(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const name =
      req.body?.name === undefined || req.body?.name === ""
        ? username
        : requireString(req.body.name, "Name", { max: 80 });
    const email = normalizeEmail(req.body?.email);
    const password = requireString(req.body?.password, "Password", {
      min: 8,
      max: 72,
      trim: false,
    });
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw httpError(400, "Password must be at most 72 bytes.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let result;
    try {
      result = await pool.query(
        `INSERT INTO users (id, username, name, email, password_hash, bio)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${userColumns}`,
        [randomUUID(), username, name, email, passwordHash, "New on HarzGram — saying hi! 👋"],
      );
    } catch (error) {
      if (error.code === "23505") {
        throw httpError(
          409,
          error.constraint?.includes("email")
            ? "That email address is already in use."
            : `The username "${username}" is already taken. Try another one.`,
        );
      }
      throw error;
    }

    await regenerateSession(req);
    req.session.userId = result.rows[0].id;
    await saveSession(req);
    res.status(201).json(toAppUser(result.rows[0]));
  }),
);

app.post(
  "/auth/login",
  route(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = requireString(req.body?.password, "Password", { max: 72, trim: false });
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw httpError(400, "Password must be at most 72 bytes.");
    }
    const result = await pool.query(
      `SELECT ${userColumns}, password_hash FROM users WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw httpError(401, "Invalid username or password.");
    }

    await regenerateSession(req);
    req.session.userId = user.id;
    await saveSession(req);
    res.json(toAppUser(user));
  }),
);

app.post(
  "/auth/logout",
  route(async (req, res) => {
    await destroySession(req);
    res.clearCookie(cookieName, cookieOptions);
    res.json({ ok: true });
  }),
);

app.get(
  "/auth/me",
  route(async (req, res) => {
    if (!req.session.userId) {
      res.json(null);
      return;
    }
    const result = await pool.query(`SELECT ${userColumns} FROM users WHERE id = $1`, [
      req.session.userId,
    ]);
    if (!result.rows[0]) {
      await destroySession(req);
      res.clearCookie(cookieName, cookieOptions);
      res.json(null);
      return;
    }
    res.json(toAppUser(result.rows[0]));
  }),
);

app.get(
  "/feed",
  requireAuth,
  route(async (req, res) => {
    const result = await pool.query(`${feedSelect} ORDER BY p.created_at DESC`, [
      req.session.userId,
    ]);
    res.json(result.rows.map(toFeedPost));
  }),
);

app.get(
  "/notifications",
  requireAuth,
  route(async (req, res) => {
    const result = await pool.query(
      `SELECT n.id, n.type, n.post_id, n.is_read, n.created_at,
              u.id AS actor_id, u.username AS actor_username, u.name AS actor_name,
              u.bio AS actor_bio, u.joined_at AS actor_joined_at
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.recipient_id = $1
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT 100`,
      [req.session.userId],
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        postId: row.post_id,
        isRead: row.is_read,
        createdAt: new Date(row.created_at).getTime(),
        actor: {
          id: row.actor_id,
          username: row.actor_username,
          name: row.actor_name,
          bio: row.actor_bio,
          joinedAt: new Date(row.actor_joined_at).getTime(),
        },
      })),
    );
  }),
);

app.get(
  "/notifications/unread-count",
  requireAuth,
  route(async (req, res) => {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE recipient_id = $1 AND NOT is_read",
      [req.session.userId],
    );
    res.json({ count: Number(result.rows[0].count) });
  }),
);

app.patch(
  "/notifications/read-all",
  requireAuth,
  route(async (req, res) => {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1 AND NOT is_read",
      [req.session.userId],
    );
    res.json({ ok: true });
  }),
);

app.patch(
  "/notifications/:id/read",
  requireAuth,
  route(async (req, res) => {
    const notificationId = requireUuid(req.params.id, "Notification ID");
    const result = await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2 RETURNING id",
      [notificationId, req.session.userId],
    );
    if (!result.rows[0]) throw httpError(404, "That notification doesn't exist.");
    res.json({ ok: true });
  }),
);

app.get(
  "/stories",
  requireAuth,
  route(async (req, res) => {
    const result = await pool.query(
      `SELECT s.id, s.image_url, s.caption, s.created_at, s.expires_at,
              u.id AS author_id, u.username AS author_username, u.name AS author_name,
              u.bio AS author_bio, u.joined_at AS author_joined_at
       FROM stories s
       JOIN users u ON u.id = s.author_id
       WHERE s.expires_at > NOW()
       ORDER BY (s.author_id = $1) DESC, s.author_id, s.created_at ASC`,
      [req.session.userId],
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        author: {
          id: row.author_id,
          username: row.author_username,
          name: row.author_name,
          bio: row.author_bio,
          joinedAt: new Date(row.author_joined_at).getTime(),
        },
        imageUrl: row.image_url,
        caption: row.caption,
        createdAt: new Date(row.created_at).getTime(),
        expiresAt: new Date(row.expires_at).getTime(),
      })),
    );
  }),
);

app.post(
  "/stories",
  requireAuth,
  imageUpload.single("image"),
  route(async (req, res) => {
    if (!req.file) throw httpError(400, "Choose an image for your story.");
    if (req.body?.caption !== undefined && typeof req.body.caption !== "string") {
      throw httpError(400, "Story caption must be a string.");
    }
    const caption = typeof req.body?.caption === "string" ? req.body.caption.trim() : "";
    if (caption.length > 280) throw httpError(400, "Story captions are limited to 280 characters.");

    const extension = imageExtension(req.file.buffer);
    const expectedMimeType = {
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[extension];
    if (req.file.mimetype !== expectedMimeType) {
      throw httpError(400, "The image content does not match its file type.");
    }

    const filename = `${randomUUID()}${extension}`;
    const imagePath = resolve(uploadDirectory, filename);
    const imageUrl = `${publicApiUrl}/uploads/${filename}`;
    await writeFile(imagePath, req.file.buffer, { flag: "wx" });

    let authorUser;
    let row;
    try {
      const author = await pool.query(`SELECT ${userColumns} FROM users WHERE id = $1`, [
        req.session.userId,
      ]);
      if (!author.rows[0]) throw httpError(401, "Your session user no longer exists.");
      authorUser = author.rows[0];

      const result = await pool.query(
        `INSERT INTO stories (id, author_id, image_url, caption)
         VALUES ($1, $2, $3, $4)
         RETURNING id, image_url, caption, created_at, expires_at`,
        [randomUUID(), req.session.userId, imageUrl, caption || null],
      );
      row = result.rows[0];
    } catch (error) {
      try {
        await unlink(imagePath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Could not remove story image after a failed story save.", cleanupError);
        }
      }
      throw error;
    }
    res.status(201).json({
      id: row.id,
      author: toAppUser(authorUser),
      imageUrl: row.image_url,
      caption: row.caption,
      createdAt: new Date(row.created_at).getTime(),
      expiresAt: new Date(row.expires_at).getTime(),
    });
  }),
);

app.get(
  "/posts/:id",
  requireAuth,
  route(async (req, res) => {
    const postId = requireUuid(req.params.id, "Post ID");
    const result = await pool.query(`${feedSelect} WHERE p.id = $2`, [req.session.userId, postId]);
    if (!result.rows[0]) throw httpError(404, "That post no longer exists.");
    res.json(toFeedPost(result.rows[0]));
  }),
);

app.delete(
  "/posts/:id",
  requireAuth,
  route(async (req, res) => {
    const postId = requireUuid(req.params.id, "Post ID");
    const client = await pool.connect();
    let deletedPost;
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM posts WHERE id = $1 AND author_id = $2 RETURNING image_url",
        [postId, req.session.userId],
      );
      if (!result.rows[0]) {
        throw httpError(404, "That post doesn't exist or you can't delete it.");
      }
      deletedPost = result.rows[0];
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    let imageCleanupPending = false;
    const imagePath = getLocalUploadPath(deletedPost.image_url);
    if (imagePath) {
      try {
        await unlink(imagePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          imageCleanupPending = true;
          console.error(
            `Post ${postId} was deleted, but its uploaded image could not be removed.`,
            error,
          );
        }
      }
    }
    res.json({ ok: true, imageCleanupPending });
  }),
);

app.post(
  "/posts",
  requireAuth,
  imageUpload.single("image"),
  route(async (req, res) => {
    if (req.body?.text !== undefined && typeof req.body.text !== "string") {
      throw httpError(400, "Post text must be a string.");
    }
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (text.length > 280) throw httpError(400, "Posts are limited to 280 characters.");
    if (!text && !req.file) throw httpError(400, "Add some text or choose an image for your post.");

    let imageUrl = null;
    let imagePath = null;
    if (req.file) {
      const extension = imageExtension(req.file.buffer);
      const expectedMimeType = {
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      }[extension];
      if (req.file.mimetype !== expectedMimeType) {
        throw httpError(400, "The image content does not match its file type.");
      }
      const filename = `${randomUUID()}${extension}`;
      imagePath = resolve(uploadDirectory, filename);
      imageUrl = `${publicApiUrl}/uploads/${filename}`;
      await writeFile(imagePath, req.file.buffer, { flag: "wx" });
    }

    let postId;
    try {
      const result = await pool.query(
        `INSERT INTO posts (id, author_id, text, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [randomUUID(), req.session.userId, text, imageUrl],
      );
      postId = result.rows[0].id;
    } catch (error) {
      if (imagePath) {
        try {
          await unlink(imagePath);
        } catch (cleanupError) {
          console.error("Could not remove image after a failed post insert.", cleanupError);
        }
      }
      throw error;
    }

    const post = await pool.query(`${feedSelect} WHERE p.id = $2`, [req.session.userId, postId]);
    res.status(201).json(toFeedPost(post.rows[0]));
  }),
);

app.post(
  "/posts/:id/like",
  requireAuth,
  route(async (req, res) => {
    const postId = requireUuid(req.params.id, "Post ID");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const post = await client.query("SELECT id, author_id FROM posts WHERE id = $1 FOR UPDATE", [
        postId,
      ]);
      if (!post.rows[0]) throw httpError(404, "That post no longer exists.");
      const removed = await client.query(
        "DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING user_id",
        [req.session.userId, postId],
      );
      const likedByMe = removed.rowCount === 0;
      if (likedByMe) {
        await client.query(
          "INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [req.session.userId, postId],
        );
        if (post.rows[0].author_id !== req.session.userId) {
          await client.query(
            `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
             VALUES ($1, $2, $3, 'like', $4)`,
            [randomUUID(), post.rows[0].author_id, req.session.userId, postId],
          );
        }
      }
      const count = await client.query(
        "SELECT COUNT(*)::int AS count FROM likes WHERE post_id = $1",
        [postId],
      );
      await client.query("COMMIT");
      res.json({ likedByMe, likeCount: Number(count.rows[0].count) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.get(
  "/posts/:id/comments",
  requireAuth,
  route(async (req, res) => {
    const postId = requireUuid(req.params.id, "Post ID");
    const result = await pool.query(
      `SELECT c.id, c.text, c.created_at,
              u.id AS author_id, u.username AS author_username, u.name AS author_name,
              u.bio AS author_bio, u.joined_at AS author_joined_at
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId],
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        author: {
          id: row.author_id,
          username: row.author_username,
          name: row.author_name,
          bio: row.author_bio,
          joinedAt: new Date(row.author_joined_at).getTime(),
        },
        text: row.text,
        createdAt: new Date(row.created_at).getTime(),
      })),
    );
  }),
);

app.post(
  "/posts/:id/comments",
  requireAuth,
  route(async (req, res) => {
    const postId = requireUuid(req.params.id, "Post ID");
    const text = requireString(req.body?.text, "Comment", { max: 2000 });
    const id = randomUUID();
    const client = await pool.connect();
    let result;
    let user;
    try {
      await client.query("BEGIN");
      const post = await client.query("SELECT author_id FROM posts WHERE id = $1", [postId]);
      if (!post.rows[0]) throw httpError(404, "That post no longer exists.");
      result = await client.query(
        `INSERT INTO comments (id, post_id, author_id, text)
         VALUES ($1, $2, $3, $4)
         RETURNING id, text, created_at`,
        [id, postId, req.session.userId, text],
      );
      if (post.rows[0].author_id !== req.session.userId) {
        await client.query(
          `INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
           VALUES ($1, $2, $3, 'comment', $4)`,
          [randomUUID(), post.rows[0].author_id, req.session.userId, postId],
        );
      }
      user = await client.query(`SELECT ${userColumns} FROM users WHERE id = $1`, [
        req.session.userId,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.status(201).json({
      id,
      author: toAppUser(user.rows[0]),
      text: result.rows[0].text,
      createdAt: new Date(result.rows[0].created_at).getTime(),
    });
  }),
);

app.get(
  "/users/suggested",
  requireAuth,
  route(async (req, res) => {
    const result = await pool.query(
      `SELECT u.${userColumns.replaceAll(", ", ", u.")},
              EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = $1 AND f.following_id = u.id
              ) AS is_following,
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS follower_count
       FROM users u
       WHERE u.id <> $1
         AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = u.id)
       ORDER BY follower_count DESC, u.username ASC
       LIMIT 5`,
      [req.session.userId],
    );
    res.json(
      result.rows.map((row) => ({
        ...toAppUser(row),
        isFollowing: row.is_following,
        isSelf: false,
      })),
    );
  }),
);

app.get(
  "/users",
  requireAuth,
  route(async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
      res.json([]);
      return;
    }
    const needle = requireString(query, "Search query", { max: 100 });
    const result = await pool.query(
      `SELECT u.${userColumns.replaceAll(", ", ", u.")},
              EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = $1 AND f.following_id = u.id
              ) AS is_following
       FROM users u
       WHERE POSITION(LOWER($2) IN LOWER(u.username)) > 0
          OR POSITION(LOWER($2) IN LOWER(u.name)) > 0
          OR POSITION(LOWER($2) IN LOWER(u.bio)) > 0
       ORDER BY (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) DESC,
                u.username ASC
       LIMIT 50`,
      [req.session.userId, needle],
    );
    res.json(
      result.rows.map((row) => ({
        ...toAppUser(row),
        isFollowing: row.is_following,
        isSelf: row.id === req.session.userId,
      })),
    );
  }),
);

app.get(
  "/users/:username/posts",
  requireAuth,
  route(async (req, res) => {
    const username = normalizeUsername(req.params.username);
    const user = await findUserByUsername(username);
    if (!user) throw httpError(404, "That profile doesn't exist (yet).");
    const result = await pool.query(
      `${feedSelect} WHERE p.author_id = $2 ORDER BY p.created_at DESC`,
      [req.session.userId, user.id],
    );
    res.json(result.rows.map(toFeedPost));
  }),
);

app.get(
  "/users/:username",
  requireAuth,
  route(async (req, res) => {
    const username = normalizeUsername(req.params.username);
    const result = await pool.query(
      `SELECT u.${userColumns.replaceAll(", ", ", u.")},
              (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id) AS post_count,
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS follower_count,
              (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id) AS following_count,
              EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = $1 AND f.following_id = u.id
              ) AS is_following
       FROM users u
       WHERE LOWER(u.username) = LOWER($2)`,
      [req.session.userId, username],
    );
    const row = result.rows[0];
    if (!row) throw httpError(404, "That profile doesn't exist (yet).");
    res.json({
      ...toAppUser(row),
      postCount: Number(row.post_count),
      followerCount: Number(row.follower_count),
      followingCount: Number(row.following_count),
      isFollowing: row.is_following,
      isSelf: row.id === req.session.userId,
    });
  }),
);

app.post(
  "/users/:username/follow",
  requireAuth,
  route(async (req, res) => {
    const username = normalizeUsername(req.params.username);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1) FOR UPDATE",
        [username],
      );
      if (!target.rows[0]) throw httpError(404, "That profile doesn't exist (yet).");
      const targetId = target.rows[0].id;
      if (targetId === req.session.userId) {
        throw httpError(400, "You can't follow yourself — you're already great.");
      }
      const removed = await client.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING follower_id",
        [req.session.userId, targetId],
      );
      const isFollowing = removed.rowCount === 0;
      if (isFollowing) {
        await client.query(
          "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [req.session.userId, targetId],
        );
        await client.query(
          `INSERT INTO notifications (id, recipient_id, actor_id, type)
           VALUES ($1, $2, $3, 'follow')`,
          [randomUUID(), targetId, req.session.userId],
        );
      }
      const count = await client.query(
        "SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1",
        [targetId],
      );
      await client.query("COMMIT");
      res.json({ isFollowing, followerCount: Number(count.rows[0].count) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

app.use((req, _res, next) => next(httpError(404, `No route for ${req.method} ${req.path}.`)));
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Images must be 10 MB or smaller."
        : "Upload one image file per post.";
    res.status(400).json({ message });
    return;
  }
  if (error.code === "23505") {
    res.status(409).json({ message: "That value is already in use." });
    return;
  }
  if (error.type === "entity.parse.failed") {
    res.status(400).json({ message: "Request body must contain valid JSON." });
    return;
  }
  if (error.type === "entity.too.large") {
    res.status(413).json({ message: "Request body is too large." });
    return;
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    message: status >= 500 ? "An unexpected server error occurred." : error.message,
  });
});

const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`HarzGram API listening on 0.0.0.0:${PORT}`);
  void cleanupExpiredStories().catch((error) => {
    console.error("Could not clean up expired story images.", error);
  });
});
const storyCleanupTimer = setInterval(
  () => {
    void cleanupExpiredStories().catch((error) => {
      console.error("Could not clean up expired story images.", error);
    });
  },
  15 * 60 * 1000,
);
storyCleanupTimer.unref();

async function shutdown() {
  clearInterval(storyCleanupTimer);
  server.close();
  await pool.end();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
