import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImagePlus, X } from "lucide-react";
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
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const EMOJI_PICKS = ["🌤", "🐶", "☕", "🏃", "🎨", "🍜", "✨", "📸"];
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ComposePage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || (!text.trim() && !image)) return;
    setBusy(true);
    setError(null);
    try {
      await api.createPost(text, image ?? undefined);
      await navigate({ to: "/feed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish your post.");
    } finally {
      setBusy(false);
    }
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Images must be 10 MB or smaller.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    setError(null);
    setImage(file);
  }

  function removeImage() {
    setImage(null);
    if (imageInput.current) imageInput.current.value = "";
  }

  function appendEmoji(emoji: string) {
    setText((prev) =>
      `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${emoji}`.slice(0, MAX_LENGTH),
    );
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

        <div className="mt-4">
          <input
            ref={imageInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            aria-label="Choose a post image"
            onChange={(event) => selectImage(event.currentTarget.files?.[0])}
          />
          <button
            type="button"
            onClick={() => imageInput.current?.click()}
            className="btn-secondary"
            disabled={busy}
          >
            <ImagePlus size={18} />
            {image ? "Choose a different image" : "Add an image"}
          </button>
        </div>

        {previewUrl ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={previewUrl}
              alt="Selected post preview"
              className="max-h-[28rem] w-full object-contain"
            />
            <button
              type="button"
              onClick={removeImage}
              disabled={busy}
              aria-label="Remove selected image"
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/80 text-background transition hover:bg-foreground"
            >
              <X size={18} />
            </button>
            <p className="truncate bg-card px-3 py-2 text-xs text-muted-foreground">
              {image?.name}
            </p>
          </div>
        ) : null}

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

        <button
          type="submit"
          disabled={busy || (!text.trim() && !image)}
          className="btn-primary mt-4 w-full"
        >
          {busy ? "Publishing…" : "Publish post"}
        </button>
      </form>
    </div>
  );
}
