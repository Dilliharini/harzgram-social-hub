import type { AppUser } from "@/services/api";

/** Deterministic initials avatar: same user always gets the same warm hue. */

const AVATAR_SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
} as const;

function hueIndex(username: string): number {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return hash % 6;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const second = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return `${first}${second}`.toUpperCase();
}

export function Avatar({
  user,
  size = "md",
}: {
  user: Pick<AppUser, "username" | "name" | "avatarUrl">;
  size?: keyof typeof AVATAR_SIZES;
}) {
  return (
    <div
      className={`avatar-hue-${hueIndex(user.username)} relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-bold ${AVATAR_SIZES[size]}`}
      aria-hidden="true"
    >
      <span>{initials(user.name || user.username)}</span>
      {user.avatarUrl ? (
        <img
          key={user.avatarUrl}
          src={user.avatarUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
