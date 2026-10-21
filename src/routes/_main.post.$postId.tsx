import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PostCard } from "@/components/post-card";
import { api, type FeedPost, type PostComment } from "@/services/api";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/_main/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post · HarzGram" },
      { name: "description", content: "Read and add comments on this HarzGram post." },
      { property: "og:title", content: "Post · HarzGram" },
      { property: "og:description", content: "Read and add comments on this HarzGram post." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { postId } = Route.useParams();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPost(postId)
      .then(setPost)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this post."));
    api
      .getComments(postId)
      .then(setComments)
      .catch(() => undefined);
  }, [postId]);

  async function handleComment(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.addComment(postId, text);
      setComments((prev) => [...(prev ?? []), created]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post your comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/feed" className="btn-ghost !px-2 self-start">
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      {error && !post ? (
        <div className="card-panel p-10 text-center">
          <p className="font-display text-lg font-bold">Post unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : null}

      {post ? <PostCard post={post} /> : !error ? <div className="card-panel h-48 animate-pulse" /> : null}

      <section className="card-panel p-4">
        <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
          Comments {comments ? `(${comments.length})` : ""}
        </h2>

        <form onSubmit={handleComment} className="mb-4 flex items-center gap-2">
          <input
            className="field flex-1"
            placeholder="Add a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            aria-label="Add a comment"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="btn-primary !px-4" aria-label="Send comment">
            <Send size={16} />
          </button>
        </form>

        {comments === null ? <div className="h-20 animate-pulse rounded-2xl bg-muted" /> : null}

        {comments?.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No comments yet. Say something nice!
          </p>
        ) : null}

        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Link to="/profile/$username" params={{ username: comment.author.username }}>
                <Avatar user={comment.author} size="sm" />
              </Link>
              <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-muted px-4 py-2.5">
                <div className="flex items-baseline gap-2">
                  <Link
                    to="/profile/$username"
                    params={{ username: comment.author.username }}
                    className="truncate text-xs font-bold text-foreground hover:underline"
                  >
                    {comment.author.name}
                  </Link>
                  <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed break-words text-foreground">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>

        {error && post ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>
    </div>
  );
}
