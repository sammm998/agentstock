import "server-only";
import { q } from "./db";

/**
 * Transactional email. Every message is written to an outbox; it is delivered
 * through Resend when RESEND_API_KEY is set. Without a provider, messages stay
 * in the outbox (visible at /dev/outbox outside production).
 */
export async function sendEmail(to: string, subject: string, body: string, fetchImpl: typeof fetch = fetch) {
  const [row] = await q<{ id: string }>(`insert into email_outbox (to_email, subject, body) values ($1, $2, $3) returning id`, [to, subject, body]);
  const key = process.env.RESEND_API_KEY;
  if (!key) return { delivered: false };
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Hustera <no-reply@hustera.app>", to: [to], subject, text: body }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(data.message ?? `Email provider error ${res.status}`);
    await q(`update email_outbox set sent_at = now(), provider_message_id = $2 where id = $1`, [row!.id, data.id ?? null]);
    return { delivered: true };
  } catch (e) {
    await q(`update email_outbox set error = $2 where id = $1`, [row!.id, e instanceof Error ? e.message : "unknown"]);
    return { delivered: false };
  }
}

export async function devOutbox() {
  if (process.env.NODE_ENV === "production") return [];
  return q<{ id: string; to_email: string; subject: string; body: string; sent_at: Date | null; created_at: Date }>(
    `select id, to_email, subject, body, sent_at, created_at from email_outbox order by created_at desc limit 50`,
  );
}
