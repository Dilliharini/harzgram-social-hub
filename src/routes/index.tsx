import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/services/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in · HarzGram" },
      {
        name: "description",
        content: "Create your HarzGram account or sign in to see what your friends are posting.",
      },
      { property: "og:title", content: "Sign in · HarzGram" },
      {
        property: "og:description",
        content: "Create your HarzGram account or sign in to see what your friends are posting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-2xl font-extrabold tracking-tight ${className}`}>
      HarzGram<span className="text-primary">.</span>
    </span>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Straight to the feed.
  useEffect(() => {
    api
      .getSessionUser()
      .then((user) => {
        if (user) void navigate({ to: "/feed" });
      })
      .catch(() => undefined);
  }, [navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        await api.signIn({ username, password });
      } else {
        await api.signUp({ name, username, email, password });
      }
      await navigate({ to: "/feed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <div className="brand-panel hidden flex-col justify-between p-10 lg:flex">
        <Wordmark className="text-3xl text-primary-foreground" />
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-primary-foreground">
            Share the small
            <br />
            moments that
            <br />
            make your day.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/85">
            HarzGram is a friendly corner of the internet for coffee runs, dog photos and
            golden-hour hikes — with the people you actually like.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["☕ café runs", "🐶 dog photos", "📷 golden hour", "🍜 street food"].map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-primary-foreground backdrop-blur"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-primary-foreground/70">Made for sharing, not for scrolling.</p>
      </div>

      {/* Auth card */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Wordmark />
          </div>

          <div className="card-panel p-6 sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-full py-2 text-sm font-bold transition ${
                  mode === "signin"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-full py-2 text-sm font-bold transition ${
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" ? (
                <input
                  className="field"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              ) : null}

              <input
                className="field"
                placeholder="Username (try maya.chen)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

              {mode === "signup" ? (
                <input
                  className="field"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              ) : null}

              <input
                className="field"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />

              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {mode === "signin" ? (
              <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-center text-xs text-muted-foreground">
                Demo mode — sign in as <span className="font-bold text-foreground">maya.chen</span>{" "}
                (any password works).
              </p>
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By joining you agree to be nice in the comments. That's the whole rulebook.
          </p>
        </div>
      </div>
    </div>
  );
}
