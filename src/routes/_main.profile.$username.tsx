import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { PostCard } from "@/components/post-card";
import { api, type FeedPost, type UserProfile } from "@/services/api";
import { formatCount } from "@/lib/time";

export const Route = createFileRoute("/_main/profile/$username")({
  head: () => ({
    meta: [
      { title: "Profile · HarzGram" },
      { name: "description", content: "A HarzGram profile — bio, posts and follower counts." },
      { property: "og:title", content: "Profile · HarzGram" },
      {
        property: "og:description",
        content: "A HarzGram profile — bio, posts and follower counts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    setProfile(null);
    setPosts(null);
    setError(null);
    api
      .getUserProfile(username)
      .then((p) => {
        setProfile(p);
        setFollowerCount(p.followerCount);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this profile."));
    api
      .getUserPosts(username)
      .then(setPosts)
      .catch(() => undefined);
  }, [username]);

  async function handleSignOut() {
    await api.signOut().catch(() => undefined);
    await navigate({ to: "/" });
  }

  if (error) {
    return (
      <div className="card-panel p-10 text-center">
        <p className="font-display text-lg font-bold">Profile not found</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="card-panel h-64 animate-pulse" />;
  }

  const stats = [
    { label: "Posts", value: String(profile.postCount) },
    { label: "Followers", value: formatCount(followerCount ?? profile.followerCount) },
    { label: "Following", value: formatCount(profile.followingCount) },
  ];

  return (
    <div className="space-y-5">
      <section className="card-panel p-6">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar user={profile} size="xl" />
          <div className="mt-4 flex-1 sm:mt-0 sm:ml-6">
            <h1 className="font-display text-xl font-extrabold tracking-tight">{profile.name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{profile.bio}</p>

            <dl className="mt-4 flex justify-center gap-6 sm:justify-start">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="font-display text-lg font-extrabold">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex justify-center sm:justify-start">
              {profile.isSelf ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn-secondary !py-2 text-xs"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              ) : (
                <FollowButton
                  username={profile.username}
                  initialIsFollowing={profile.isFollowing}
                  onChange={(result) => setFollowerCount(result.followerCount)}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <h2 className="px-1 text-sm font-bold text-muted-foreground">
        {profile.isSelf ? "Your posts" : `Posts by ${profile.name.split(" ")[0]}`}
      </h2>

      {posts === null ? <div className="card-panel h-40 animate-pulse" /> : null}

      {posts?.length === 0 ? (
        <div className="card-panel p-8 text-center text-sm text-muted-foreground">
          No posts yet. {profile.isSelf ? "Time for a first post!" : "Give them a nudge."}
        </div>
      ) : null}

      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          canDelete={profile.isSelf}
          onDeleted={(postId) => {
            setPosts((current) => current?.filter((item) => item.id !== postId) ?? null);
            setProfile((current) =>
              current ? { ...current, postCount: Math.max(0, current.postCount - 1) } : current,
            );
          }}
        />
      ))}
    </div>
  );
}
