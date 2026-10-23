import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { api, type AppNotification } from "@/services/api";
import { timeAgo } from "@/lib/time";

export const Route = createFileRoute("/_main/notifications")({
  head: () => ({ meta: [{ title: "Notifications · HarzGram" }] }),
  component: NotificationsPage,
});

function notificationMessage(notification: AppNotification): string {
  switch (notification.type) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "follow":
      return "started following you";
  }
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getNotifications()
      .then((result) => {
        if (mounted) setNotifications(result);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Couldn't load notifications.");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function markRead(notificationId: string) {
    const notification = notifications?.find((item) => item.id === notificationId);
    if (!notification || notification.isRead) return;
    setNotifications(
      (current) =>
        current?.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)) ??
        null,
    );
    try {
      await api.markNotificationRead(notificationId);
    } catch (err) {
      setNotifications(
        (current) =>
          current?.map((item) =>
            item.id === notificationId ? { ...item, isRead: false } : item,
          ) ?? null,
      );
      setError(err instanceof Error ? err.message : "Couldn't mark notification as read.");
    }
  }

  async function markAllRead() {
    if (busy || !notifications?.some((notification) => !notification.isRead)) return;
    setBusy(true);
    setError(null);
    const previous = notifications;
    setNotifications(notifications.map((notification) => ({ ...notification, isRead: true })));
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      setError(err instanceof Error ? err.message : "Couldn't mark notifications as read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-primary">
            <Bell size={22} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Likes, comments, and new followers</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={busy || !notifications?.some((notification) => !notification.isRead)}
          className="btn-ghost inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary disabled:opacity-50"
        >
          <CheckCheck size={17} />
          <span className="hidden sm:inline">Mark all read</span>
          <span className="sm:hidden">Read all</span>
        </button>
      </div>

      {error ? (
        <p role="alert" className="card-panel px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {notifications === null && !error ? (
        <div className="card-panel h-36 animate-pulse" aria-label="Loading notifications" />
      ) : null}

      {notifications?.length === 0 ? (
        <div className="card-panel px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <Bell size={26} />
          </div>
          <h2 className="mt-4 font-display text-lg font-extrabold">You’re all caught up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            New likes, comments, and followers will show up here.
          </p>
        </div>
      ) : null}

      {notifications && notifications.length > 0 ? (
        <div className="card-panel divide-y divide-border overflow-hidden">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center gap-3 px-4 py-3 transition ${
                notification.isRead ? "" : "bg-accent/35"
              }`}
            >
              <Link
                to={notification.postId ? "/post/$postId" : "/profile/$username"}
                params={
                  notification.postId
                    ? { postId: notification.postId }
                    : { username: notification.actor.username }
                }
                onClick={() => void markRead(notification.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${notification.actor.name} ${notificationMessage(notification)}. ${timeAgo(notification.createdAt)}.`}
              >
                <Avatar user={notification.actor} size="md" />
                <span className="min-w-0 flex-1 text-sm leading-snug">
                  <span className="font-bold">{notification.actor.name}</span>{" "}
                  <span className="text-muted-foreground">{notificationMessage(notification)}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </span>
                </span>
              </Link>
              {!notification.isRead ? (
                <button
                  type="button"
                  aria-label="Mark notification as read"
                  title="Mark as read"
                  onClick={() => void markRead(notification.id)}
                  className="btn-ghost !p-2 text-primary"
                >
                  <Check size={17} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
