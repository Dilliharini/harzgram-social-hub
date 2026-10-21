import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/services/api";

export const Route = createFileRoute("/_main/compose")({
  head: () => ({
    meta: [
      { title: "New post · HarzGram" },
      { name: "description", content: "Share a new post with the HarzGram community." },
      { property: "og:title", content: "New post · HarzGram" },
      { property: "og:description", content: "Share a new post with the HarzGram community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComposePage,
});

const MAX_LENGTH = 280;
const EMOJI_PICKS = ["🌤", "🐶", "☕", "🏃", "🎨", "🍜", "✨", "📸"];

function ComposePage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createPost(text);
      await navigate({ to: "/feed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish your post.");
      setBusy(false);
    }
  }

  function appendEmoji(emoji: string) {
    setText((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${emoji}`.slice(0, MAX_LENGTH));
  }

  return (
    <div className="space-y-4">
      <Link to="/feed" className="btn-ghost !px-2">
        ← Cancel
      </Link>

      <form onSubmit={handleSubmit} className="card-panel p-5">
        <h1 className="font-display text-xl font-extrabold tracking-tight">New post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What's going on? Keep it kind, keep it fun.
        </p>

        <textarea
          className="field mt-4 min-h-36 resize-none leading-relaxed"
          placeholder="Share a moment…"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          autoFocus
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {EMOJI_PICKS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => appendEmoji(emoji)}
              className="rounded-full bg-muted px-2.5 py-1 text-base transition hover:bg-accent"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <span
            className={`ml-auto text-xs font-semibold ${
              text.length >= MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {text.length}/{MAX_LENGTH}
          </span>
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}

        <button type="submit" disabled={busy || !text.trim()} className="btn-primary mt-4 w-full">
          {busy ? "Publishing…" : "Publish post"}
        </button>
      </form>
    </div>
  );
}
