import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api, type FeedPost } from "@/services/api";
import { timeAgo } from "@/lib/time";

/** A single post in the feed, on a profile, or at the top of a comments page. */
export function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);

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
      </div>

      <p className="whitespace-pre-line px-4 pb-3 text-[0.95rem] leading-relaxed text-foreground">
        {post.text}
      </p>

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
