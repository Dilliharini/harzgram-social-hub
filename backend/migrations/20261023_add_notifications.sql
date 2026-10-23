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
