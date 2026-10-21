import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import type { UserSummary } from "@/services/api";

/** Compact row of a user, used in search results and follow lists. */
export function UserRow({ user }: { user: UserSummary }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link to="/profile/$username" params={{ username: user.username }}>
        <Avatar user={user} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to="/profile/$username"
          params={{ username: user.username }}
          className="block truncate text-sm font-bold text-foreground hover:underline"
        >
          {user.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
      </div>
      {user.isSelf ? null : (
        <FollowButton username={user.username} initialIsFollowing={user.isFollowing} size="sm" />
      )}
    </div>
  );
}
