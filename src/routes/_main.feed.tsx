import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PostCard } from "@/components/post-card";
import { Avatar } from "@/components/avatar";
import { api, type AppUser, type FeedPost } from "@/services/api";

export const Route = createFileRoute("/_main/feed")({
  head: () => ({
    meta: [
      { title: "Home · HarzGram" },
      { name: "description", content: "Your HarzGram home feed — the latest posts from the community." },
      { property: "og:title", content: "Home · HarzGram" },
      {
        property: "og:description",
        content: "Your HarzGram home feed — the latest posts from the community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [me, setMe] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSessionUser()
      .then(setMe)
      .catch(() => undefined);
    api
      .getFeed()
      .then(setPosts)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the feed."));
  }, []);

  return (
    <div className="space-y-4">
      {/* Quick composer */}
      <Link to="/compose" className="card-panel flex items-center gap-3 p-4 transition hover:bg-accent/40">
        {me ? <Avatar user={me} size="md" /> : <div className="h-10 w-10 rounded-full bg-muted" />}
        <span className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground">
          What's happening{me ? `, ${me.name.split(" ")[0]}` : ""}?
        </span>
      </Link>

      {error ? (
        <div className="card-panel p-6 text-center text-sm text-destructive">{error}</div>
      ) : null}

      {posts === null && !error
        ? [0, 1, 2].map((i) => <div key={i} className="card-panel h-48 animate-pulse" />)
        : null}

      {posts?.map((post) => <PostCard key={post.id} post={post} />)}

      {posts?.length === 0 ? (
        <div className="card-panel p-8 text-center">
          <p className="font-display text-lg font-bold">It's quiet in here…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to post something — hit the button above.
          </p>
        </div>
      ) : null}
    </div>
  );
}
