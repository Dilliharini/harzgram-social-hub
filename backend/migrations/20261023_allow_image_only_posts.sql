ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_text_length,
  ADD CONSTRAINT posts_text_length CHECK (
    char_length(text) <= 280 AND (char_length(text) >= 1 OR image_url IS NOT NULL)
  );
