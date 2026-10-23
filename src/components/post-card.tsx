import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api, type FeedPost } from "@/services/api";
import { timeAgo } from "@/lib/time";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** A single post in the feed, on a profile, or at the top of a comments page. */
export function PostCard({
  post,
  canDelete = false,
  onDeleted,
}: {
  post: FeedPost;
  canDelete?: boolean;
  onDeleted?: (postId: string) => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likeCount);
  }, [post.id, post.likedByMe, post.likeCount]);

  async function handleLike() {
    if (busy) return;
    const previouslyLiked = liked;
    const previouslyCount = likeCount;
    setBusy(true);
    setLiked(!previouslyLiked);
    setLikeCount(previouslyCount + (previouslyLiked ? -1 : 1));
    try {
      const result = await api.toggleLike(post.id);
      setLiked(result.likedByMe);
      setLikeCount(result.likeCount);
    } catch (error) {
      console.error(error);
      setLiked(previouslyLiked);
      setLikeCount(previouslyCount);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await api.deletePost(post.id);
      if (result.imageCleanupPending) {
        toast.error("Post deleted, but its uploaded image could not be removed from disk.");
      }
      onDeleted?.(post.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Couldn't delete this post.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <article className="card-panel overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link to="/profile/$username" params={{ username: post.author.username }}>
          <Avatar user={post.author} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/profile/$username"
            params={{ username: post.author.username }}
            className="block truncate text-sm font-bold text-foreground hover:underline"
          >
            {post.author.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            @{post.author.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Delete your post"
                className="btn-ghost !p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={18} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your post, its comments and likes, and any image uploaded
                  with it. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteBusy}
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteBusy ? "Deleting…" : "Delete post"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {deleteError ? (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-destructive">
          {deleteError}
        </p>
      ) : null}

      {post.text ? (
        <p className="whitespace-pre-line px-4 pb-3 text-[0.95rem] leading-relaxed text-foreground">
          {post.text}
        </p>
      ) : null}

      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt={`Photo posted by ${post.author.name}`}
          loading="lazy"
          width={1200}
          height={900}
          className="w-full object-cover"
        />
      ) : null}

      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={handleLike}
          disabled={busy}
          aria-pressed={liked}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground ${
            liked ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Heart size={18} strokeWidth={2.2} fill={liked ? "currentColor" : "none"} />
          {likeCount}
        </button>
        <Link
          to="/post/$postId"
          params={{ postId: post.id }}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <MessageCircle size={18} strokeWidth={2.2} />
          {post.commentCount}
        </Link>
      </div>
    </article>
  );
}
