CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9._]{3,20}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (LOWER(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT posts_text_length CHECK (
    char_length(text) <= 280 AND (char_length(text) >= 1 OR image_url IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_created_at_idx ON posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comments_text_length CHECK (char_length(text) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS comments_post_created_at_idx ON comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);

CREATE TABLE IF NOT EXISTS likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS likes_post_idx ON likes (post_id);

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT stories_caption_length CHECK (caption IS NULL OR char_length(caption) <= 280),
  CONSTRAINT stories_expiration CHECK (expires_at = created_at + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS stories_active_idx ON stories (expires_at, author_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_not_self CHECK (recipient_id <> actor_id),
  CONSTRAINT notifications_post_type CHECK (
    (type = 'follow' AND post_id IS NULL) OR
    type IN ('like', 'comment')
  )
);
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (recipient_id) WHERE NOT is_read;
