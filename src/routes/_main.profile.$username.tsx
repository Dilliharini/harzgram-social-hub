import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImagePlus, LogOut, Pencil, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { PostCard } from "@/components/post-card";
import { api, type FeedPost, type UserProfile } from "@/services/api";
import { formatCount } from "@/lib/time";

const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024;

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!image) {
      setImagePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setImagePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function startEditing() {
    setName(profile?.name ?? "");
    setEditUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setImage(null);
    setRemoveAvatar(false);
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setImage(null);
    setRemoveAvatar(false);
    setSaveError(null);
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    setSaveError(null);
    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      setImage(null);
      setSaveError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setImage(null);
      setSaveError("Images must be 10 MB or smaller.");
      return;
    }
    setImage(file);
    setRemoveAvatar(false);
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const nextUsername = editUsername.trim().toLowerCase();
    const nextName = name.trim();
    const nextBio = bio.trim();
    if (!/^[a-z0-9._]{3,20}$/.test(nextUsername)) {
      setSaveError("Usernames are 3–20 characters: letters, numbers, dots or underscores.");
      return;
    }
    if (!nextName || nextName.length > 80) {
      setSaveError("Name must be between 1 and 80 characters.");
      return;
    }
    if (nextBio.length > 280) {
      setSaveError("Bio must be 280 characters or fewer.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateProfile({
        username: nextUsername,
        name: nextName,
        bio: nextBio,
        image,
        removeAvatar,
      });
      setProfile((current) => (current ? { ...current, ...updated } : current));
      setEditing(false);
      setImage(null);
      setRemoveAvatar(false);
      window.dispatchEvent(new CustomEvent("harzgram:profile-updated", { detail: updated }));
      if (updated.username !== username) {
        await navigate({ to: "/profile/$username", params: { username: updated.username } });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

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
          {editing && (imagePreviewUrl || (removeAvatar ? null : profile.avatarUrl)) ? (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              <img
                src={imagePreviewUrl ?? (removeAvatar ? "" : (profile.avatarUrl ?? ""))}
                alt="Profile picture preview"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <Avatar
              user={{
                ...profile,
                avatarUrl: editing && removeAvatar ? null : profile.avatarUrl,
              }}
              size="xl"
            />
          )}
          <div className="mt-4 flex-1 sm:mt-0 sm:ml-6">
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-left">
                <label className="block text-sm font-semibold" htmlFor="profile-name">
                  Display name
                </label>
                <input
                  id="profile-name"
                  className="field"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSaveError(null);
                  }}
                  maxLength={80}
                  required
                  disabled={saving}
                />
                <label className="block text-sm font-semibold" htmlFor="profile-username">
                  Username
                </label>
                <input
                  id="profile-username"
                  className="field"
                  value={editUsername}
                  onChange={(event) => {
                    setEditUsername(event.target.value);
                    setSaveError(null);
                  }}
                  maxLength={20}
                  autoComplete="username"
                  required
                  disabled={saving}
                />
                <label className="block text-sm font-semibold" htmlFor="profile-bio">
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  className="field min-h-24 resize-y"
                  value={bio}
                  onChange={(event) => {
                    setBio(event.target.value);
                    setSaveError(null);
                  }}
                  maxLength={280}
                  disabled={saving}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={imageInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    aria-label="Choose a profile picture"
                    onChange={(event) => {
                      selectImage(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => imageInput.current?.click()}
                    className="btn-secondary !py-2 text-xs"
                    disabled={saving}
                  >
                    <ImagePlus size={15} />
                    {image ? "Choose a different picture" : "Change picture"}
                  </button>
                  {profile.avatarUrl && !removeAvatar ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setRemoveAvatar(true);
                      }}
                      className="btn-ghost !py-2 text-xs"
                      disabled={saving}
                    >
                      <X size={15} />
                      Remove picture
                    </button>
                  ) : null}
                  {image ? (
                    <span className="text-xs text-muted-foreground">{image.name}</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP, up to 10 MB.</p>
                {saveError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {saveError}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary !py-2 text-xs" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-2 text-xs"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="font-display text-xl font-extrabold tracking-tight">
                  {profile.name}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{profile.bio}</p>
              </>
            )}

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
                editing ? null : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      className="btn-secondary !py-2 text-xs"
                    >
                      <Pencil size={14} />
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="btn-secondary !ml-2 !py-2 text-xs"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </>
                )
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
