import { Link, createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_main/messages")({
  head: () => ({ meta: [{ title: "Messages · HarzGram" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <section className="card-panel mx-auto max-w-xl px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
        <MessageCircle size={26} />
      </div>
      <h1 className="mt-4 font-display text-2xl font-extrabold">Messages are coming soon</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        HarzGram doesn't have messaging yet. For now, enjoy the community feed and discover new
        people.
      </p>
      <Link to="/discover" className="btn-primary mt-6">
        Explore HarzGram
      </Link>
    </section>
  );
}
