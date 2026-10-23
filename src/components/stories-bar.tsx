import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { timeAgo } from "@/lib/time";
import { api, type AppUser, type Story } from "@/services/api";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 280;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface StoryGroup {
  author: AppUser;
  stories: Story[];
}

export function StoriesBar({ me }: { me: AppUser }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const activeStories = useMemo(
    () => stories.filter((story) => story.expiresAt > now),
    [stories, now],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, StoryGroup>();
    for (const story of activeStories) {
      const group = grouped.get(story.author.id);
      if (group) {
        group.stories.push(story);
      } else {
        grouped.set(story.author.id, { author: story.author, stories: [story] });
      }
    }
    return [...grouped.values()];
  }, [activeStories]);

  const storyPositions = useMemo(() => {
    const positions = new Map<string, number>();
    activeStories.forEach((story, index) => positions.set(story.id, index));
    return positions;
  }, [activeStories]);
  const activeStoryIndex = activeStoryId ? (storyPositions.get(activeStoryId) ?? -1) : -1;
  const activeStory = activeStoryIndex >= 0 ? activeStories[activeStoryIndex] : null;

  useEffect(() => {
    let mounted = true;
    api
      .getActiveStories()
      .then((result) => {
        if (mounted) setStories(result);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Couldn't load stories.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const moveStory = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = activeStoryIndex + direction;
      if (nextIndex < 0 || nextIndex >= activeStories.length) return;
      setActiveStoryId(activeStories[nextIndex]!.id);
    },
    [activeStoryIndex, activeStories],
  );

  useEffect(() => {
    const nextExpiry = activeStories.reduce<number | null>(
      (nearest, story) =>
        nearest === null || story.expiresAt < nearest ? story.expiresAt : nearest,
      null,
    );
    if (nextExpiry === null) return;
    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextExpiry - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [activeStories]);

  useEffect(() => {
    if (activeStoryId && activeStoryIndex < 0) {
      setActiveStoryId(null);
      setViewerOpen(false);
    }
  }, [activeStoryId, activeStoryIndex]);

  useEffect(() => {
    if (!viewerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") moveStory(1);
      if (event.key === "ArrowLeft") moveStory(-1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewerOpen, moveStory]);

  function openGroup(group: StoryGroup) {
    const firstStory = group.stories[0];
    if (!firstStory) return;
    setActiveStoryId(firstStory.id);
    setViewerOpen(true);
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFormError("Images must be 10 MB or smaller.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    setFormError(null);
    setImage(file);
  }

  function resetComposer() {
    setImage(null);
    setCaption("");
    setFormError(null);
    if (imageInput.current) imageInput.current.value = "";
  }

  async function handleCreateStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      const created = await api.createStory(image, caption);
      setStories((current) => [...current, created]);
      setCreateOpen(false);
      resetComposer();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't share your story.");
    } finally {
      setBusy(false);
    }
  }

  function handleCreateOpenChange(open: boolean) {
    if (busy) return;
    setCreateOpen(open);
    if (!open) resetComposer();
  }

  return (
    <>
      <section className="card-panel p-4" aria-label="Stories">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-extrabold">Stories</h2>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-primary transition hover:bg-accent"
          >
            <Plus size={15} />
            Add story
          </button>
        </div>
        {error ? <p className="px-1 pb-2 text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-4 overflow-x-auto pb-1">
          {groups.some((group) => group.author.id === me.id) ? null : (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="relative rounded-full border-2 border-dashed border-primary/60 p-0.5">
                <Avatar user={me} size="lg" />
                <span className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                  <Plus size={12} />
                </span>
              </span>
              <span className="w-full truncate text-xs font-medium">Your story</span>
            </button>
          )}
          {groups.map((group) => (
            <button
              key={group.author.id}
              type="button"
              onClick={() => openGroup(group)}
              aria-label={`View ${group.author.id === me.id ? "your" : `${group.author.name}'s`} stories`}
              className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="rounded-full bg-gradient-to-br from-primary via-amber-400 to-rose-300 p-0.5">
                <span className="block rounded-full border-2 border-card p-0.5">
                  <Avatar user={group.author} size="lg" />
                </span>
              </span>
              <span className="w-full truncate text-xs font-medium">
                {group.author.id === me.id ? "Your story" : group.author.name.split(" ")[0]}
              </span>
            </button>
          ))}
          {loading
            ? [0, 1, 2].map((index) => (
                <div key={index} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
                  <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))
            : null}
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share a story</DialogTitle>
            <DialogDescription>
              Add a photo and an optional caption. Stories disappear after 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStory} className="space-y-4">
            <input
              ref={imageInput}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              aria-label="Choose a story image"
              onChange={(event) => selectImage(event.currentTarget.files?.[0])}
            />
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-2xl bg-muted">
                <img
                  src={previewUrl}
                  alt="Story image preview"
                  className="max-h-[55vh] w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    if (imageInput.current) imageInput.current.value = "";
                  }}
                  disabled={busy}
                  className="absolute right-3 bottom-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-bold"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/50 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground"
              >
                <ImagePlus size={28} className="text-primary" />
                Choose a photo
                <span className="text-xs font-normal">JPEG, PNG, or WebP · up to 10 MB</span>
              </button>
            )}
            {image ? (
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Choose a different photo
              </button>
            ) : null}
            <textarea
              className="field min-h-20 resize-none"
              placeholder="Add a caption (optional)…"
              value={caption}
              maxLength={MAX_CAPTION_LENGTH}
              onChange={(event) => setCaption(event.target.value)}
              aria-label="Story caption"
            />
            <div className="flex items-center justify-between gap-3">
              {formError ? (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {caption.length}/{MAX_CAPTION_LENGTH}
                </span>
              )}
              <button type="submit" className="btn-primary" disabled={!image || busy}>
                {busy ? "Sharing…" : "Share story"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-md overflow-hidden border-0 bg-foreground p-0 text-background shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {activeStory ? `Story by ${activeStory.author.name}` : "Story unavailable"}
            </DialogTitle>
            <DialogDescription>
              Browse active stories with the previous and next story controls.
            </DialogDescription>
          </DialogHeader>
          {activeStory ? (
            <div className="relative flex h-[min(78vh,760px)] min-h-[400px] flex-col justify-between">
              <img
                src={activeStory.imageUrl}
                alt={`Story by ${activeStory.author.name}`}
                className="absolute inset-0 h-full w-full object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/65" />
              <div className="relative z-10 px-4 pt-4">
                <div className="mb-4 flex gap-1">
                  {groups
                    .find((group) => group.author.id === activeStory.author.id)
                    ?.stories.map((story) => (
                      <span key={story.id} className="h-0.5 flex-1 rounded bg-white/45">
                        <span
                          className={`block h-full rounded bg-white ${
                            story.id === activeStory.id ? "w-full" : "w-0"
                          }`}
                        />
                      </span>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                  <Avatar user={activeStory.author} size="sm" />
                  <div>
                    <p className="text-sm font-bold">{activeStory.author.name}</p>
                    <p className="text-xs text-white/75">{timeAgo(activeStory.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 px-5 pb-6 text-center">
                {activeStory.caption ? (
                  <p className="whitespace-pre-line text-sm font-medium leading-relaxed">
                    {activeStory.caption}
                  </p>
                ) : null}
                <p className="mt-2 text-[0.7rem] text-white/70">Stories disappear after 24 hours</p>
              </div>
              <button
                type="button"
                aria-label="Previous story"
                onClick={() => moveStory(-1)}
                disabled={activeStoryIndex <= 0}
                className="absolute top-1/2 left-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white disabled:opacity-30"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Next story"
                onClick={() => moveStory(1)}
                disabled={activeStoryIndex >= activeStories.length - 1}
                className="absolute top-1/2 right-2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white disabled:opacity-30"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-background">
              This story is no longer available.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
