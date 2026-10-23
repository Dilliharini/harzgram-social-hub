import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { Avatar } from "@/components/avatar";
import { StoriesBar } from "@/components/stories-bar";
import { UserRow } from "@/components/user-row";
import { api, type AppUser, type FeedPost, type UserSummary } from "@/services/api";

export const Route = createFileRoute("/_main/feed")({
  head: () => ({
    meta: [
      { title: "Home · HarzGram" },
      {
        name: "description",
        content: "Your HarzGram home feed — the latest posts from the community.",
      },
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
  const [suggestions, setSuggestions] = useState<UserSummary[] | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
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
    api
      .getSuggestedUsers()
      .then(setSuggestions)
      .catch((err) =>
        setSuggestionError(err instanceof Error ? err.message : "Couldn't load suggestions."),
      );
  }, []);

  return (
    <div className="space-y-4 lg:mx-auto lg:max-w-[640px] xl:mx-auto xl:grid xl:max-w-[960px] xl:grid-cols-[minmax(0,620px)_280px] xl:items-start xl:gap-10">
      <div className="min-w-0 space-y-4 xl:max-w-[620px]">
        {me ? <StoriesBar me={me} /> : null}

        <Link
          to="/compose"
          className="card-panel flex items-center gap-3 p-4 transition hover:bg-accent/40"
        >
          {me ? (
            <Avatar user={me} size="md" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-muted" />
          )}
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

        {posts?.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            canDelete={me?.id === post.author.id}
            onDeleted={(postId) =>
              setPosts((current) => current?.filter((item) => item.id !== postId) ?? null)
            }
          />
        ))}

        {posts?.length === 0 ? (
          <div className="card-panel p-8 text-center">
            <p className="font-display text-lg font-bold">It's quiet in here…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to post something — hit the button above.
            </p>
          </div>
        ) : null}
      </div>

      <aside className="hidden xl:sticky xl:top-8 xl:block">
        <section className="card-panel p-4">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Sparkles size={16} className="text-primary" />
            <h2 className="font-display text-sm font-extrabold">People to follow</h2>
          </div>
          {suggestionError ? (
            <p className="px-1 py-3 text-sm text-destructive">{suggestionError}</p>
          ) : suggestions === null ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="divide-y divide-border">
              {suggestions.slice(0, 4).map((user) => (
                <UserRow key={user.username} user={user} />
              ))}
            </div>
          ) : (
            <p className="px-1 py-3 text-sm text-muted-foreground">
              You're already following everyone here.
            </p>
          )}
          <Link
            to="/discover"
            className="mt-2 block rounded-xl px-2 py-2 text-sm font-bold text-primary transition hover:bg-accent"
          >
            See everyone
          </Link>
        </section>
      </aside>
    </div>
  );
}
