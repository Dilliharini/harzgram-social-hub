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
