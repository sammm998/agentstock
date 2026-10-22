import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { devOutbox } from "@/server/email";
import { PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Dev outbox", robots: { index: false } };

/** Development only: shows emails that would be sent when no email provider is configured. */
export default async function DevOutboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const mails = await devOutbox();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Dev outbox" description="Emails written while no email provider (RESEND_API_KEY) is configured. Not available in production." />
      <ul className="space-y-3">
        {mails.map((m) => (
          <li key={m.id} className="card p-5 text-sm">
            <p className="font-semibold">{m.subject}</p>
            <p className="text-xs text-muted">to {m.to_email} · <TimeAgo date={m.created_at} /> · {m.sent_at ? "delivered" : "not delivered"}</p>
            <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-muted">{m.body}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
