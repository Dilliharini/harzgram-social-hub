import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api, type AppUser } from "@/services/api";

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});

const NAV_ITEMS = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

function MainLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    api
      .getSessionUser()
      .then((user) => {
        if (!user) {
          void navigate({ to: "/" });
        } else {
          setMe(user);
          setReady(true);
        }
      })
      .catch(() => void navigate({ to: "/" }));
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    function refreshUnreadCount() {
      api
        .getUnreadNotificationCount()
        .then(({ count }) => {
          if (mounted) setUnreadNotificationCount(count);
        })
        .catch((error: unknown) => {
          console.error("Couldn't load unread notification count.", error);
        });
    }
    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 30_000);
    window.addEventListener("focus", refreshUnreadCount);
    window.addEventListener("harzgram:notifications-changed", refreshUnreadCount);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUnreadCount);
      window.removeEventListener("harzgram:notifications-changed", refreshUnreadCount);
    };
  }, []);

  if (!ready || !me) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background px-5 py-7 lg:flex">
        <Link to="/feed" className="mb-9 px-2">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            HarzGram<span className="text-primary">.</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="space-y-1">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: false }}
              className="flex items-center gap-4 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <item.icon size={21} strokeWidth={2} />
              {item.label}
            </Link>
          ))}
          {NAV_ITEMS.slice(2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: false }}
              className="flex items-center gap-4 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            >
              <item.icon size={21} strokeWidth={2} />
              {item.label}
              {item.to === "/notifications" && unreadNotificationCount > 0 ? (
                <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[0.65rem] font-bold leading-none text-primary-foreground">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </Link>
          ))}
          <Link
            to="/compose"
            className="flex items-center gap-4 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            activeOptions={{ exact: false }}
          >
            <Plus size={21} strokeWidth={2} />
            Create
          </Link>
          <Link
            to="/profile/$username"
            params={{ username: me.username }}
            className="flex items-center gap-4 rounded-2xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
            activeOptions={{ exact: false }}
          >
            <UserRound size={21} strokeWidth={2} />
            Profile
          </Link>
        </nav>

        <Link
          to="/profile/$username"
          params={{ username: me.username }}
          className="mt-auto flex items-center gap-3 rounded-2xl p-3 transition hover:bg-accent"
        >
          <Avatar user={me} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{me.name}</span>
            <span className="block truncate text-xs text-muted-foreground">@{me.username}</span>
          </span>
        </Link>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur lg:hidden">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
            <Link to="/feed" className="mr-2">
              <span className="font-display text-xl font-extrabold tracking-tight">
                HarzGram<span className="text-primary">.</span>
              </span>
            </Link>

            <nav className="hidden flex-1 items-center gap-1 sm:flex">
              {NAV_ITEMS.slice(0, 2).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
                  activeOptions={{ exact: false }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex-1 sm:hidden" />

            <Link to="/compose" className="btn-primary !px-4 !py-2 text-xs sm:text-sm">
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">New post</span>
              <span className="sm:hidden">Post</span>
            </Link>

            <Link to="/profile/$username" params={{ username: me.username }} className="sm:hidden">
              <Avatar user={me} size="sm" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-28 sm:pb-12 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          <Link
            to="/feed"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold text-muted-foreground [&.active]:text-primary"
          >
            <Home size={22} strokeWidth={2} />
            Home
          </Link>
          <Link
            to="/discover"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold text-muted-foreground [&.active]:text-primary"
          >
            <Search size={22} strokeWidth={2} />
            Discover
          </Link>
          <Link
            to="/compose"
            className="flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold text-muted-foreground [&.active]:text-primary"
          >
            <span className="-mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Plus size={24} strokeWidth={2.5} />
            </span>
            Create
          </Link>
          <Link
            to="/profile/$username"
            params={{ username: me.username }}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-semibold text-muted-foreground [&.active]:text-primary"
          >
            <UserRound size={22} strokeWidth={2} />
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
