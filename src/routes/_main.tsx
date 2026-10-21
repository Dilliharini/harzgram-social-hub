import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Home, Plus, Search, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api, type AppUser } from "@/services/api";

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});

const NAV_ITEMS = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Search },
] as const;

function MainLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

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

  if (!ready || !me) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link to="/feed" className="mr-2">
            <span className="font-display text-xl font-extrabold tracking-tight">
              HarzGram<span className="text-primary">.</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
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

      <main className="mx-auto max-w-2xl px-4 pt-5 pb-28 sm:pb-12">
        <Outlet />
      </main>

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
