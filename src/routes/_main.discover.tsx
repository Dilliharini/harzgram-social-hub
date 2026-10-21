import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { UserRow } from "@/components/user-row";
import { api, type UserSummary } from "@/services/api";

export const Route = createFileRoute("/_main/discover")({
  head: () => ({
    meta: [
      { title: "Discover · HarzGram" },
      { name: "description", content: "Search for people and find new accounts to follow on HarzGram." },
      { property: "og:title", content: "Discover · HarzGram" },
      {
        property: "og:description",
        content: "Search for people and find new accounts to follow on HarzGram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[] | null>(null);
  const [suggestions, setSuggestions] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => {
      if (!q) {
        setResults(null);
        api
          .getSuggestedUsers()
          .then(setSuggestions)
          .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load suggestions."));
        return;
      }
      api
        .searchUsers(q)
        .then(setResults)
        .catch((err) => setError(err instanceof Error ? err.message : "Search failed."));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Discover</h1>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className="field !pl-11"
          placeholder="Search people by name, username or bio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
        />
      </div>

      {error ? (
        <div className="card-panel p-6 text-center text-sm text-destructive">{error}</div>
      ) : null}

      {results !== null ? (
        <section>
          <h2 className="mb-1 px-1 text-sm font-bold text-muted-foreground">
            {results.length > 0 ? `${results.length} ${results.length === 1 ? "person" : "people"} found` : "No results"}
          </h2>
          {results.length === 0 ? (
            <div className="card-panel p-8 text-center text-sm text-muted-foreground">
              Nobody matches “{query.trim()}”. Try another name or username.
            </div>
          ) : (
            <div className="card-panel divide-y divide-border px-4">
              {results.map((user) => (
                <UserRow key={user.username} user={user} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-bold text-muted-foreground">
            <Sparkles size={16} className="text-primary" />
            Suggested for you
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((user) => (
              <div key={user.username} className="card-panel flex flex-col items-center p-5 text-center">
                <Avatar user={user} size="lg" />
                <p className="mt-3 text-sm font-bold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">
                  {user.bio}
                </p>
                <div className="mt-3">
                  <FollowButton username={user.username} initialIsFollowing={user.isFollowing} size="sm" />
                </div>
              </div>
            ))}
          </div>
          {suggestions.length === 0 ? (
            <div className="card-panel p-8 text-center text-sm text-muted-foreground">
              You're already following everyone here. Popular!
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
