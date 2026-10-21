import { useState } from "react";
import { api, type FollowResult } from "@/services/api";

/** Follow / Following toggle used on profiles, search results and suggestions. */
export function FollowButton({
  username,
  initialIsFollowing,
  size = "md",
  onChange,
}: {
  username: string;
  initialIsFollowing: boolean;
  size?: "sm" | "md";
  onChange?: (result: FollowResult) => void;
}) {
  const [following, setFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.toggleFollow(username);
      setFollowing(result.isFollowing);
      onChange?.(result);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={
        following
          ? "inline-flex items-center justify-center rounded-full border border-border bg-secondary px-4 font-bold text-secondary-foreground transition hover:bg-accent disabled:opacity-60"
          : "inline-flex items-center justify-center rounded-full bg-primary px-4 font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      }
      style={{ paddingBlock: size === "sm" ? "0.3rem" : "0.5rem", fontSize: size === "sm" ? "0.8rem" : "0.875rem" }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
