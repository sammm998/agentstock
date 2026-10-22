import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { isUuid } from "@/server/core";
import { requireViewer } from "@/server/session";
import { getContract } from "@/server/marketplace";
import { contractAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Contract" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getContract(viewer.id, id);
  if (!data) notFound();
  const { contract: c, events, reviewed } = data;
  const seller = c.seller_id === viewer.id;
  const hidden = <input type="hidden" name="contractId" value={c.id} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/contracts" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> Contracts</Link>
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{c.title}</h1>
            <p className="text-sm text-muted">{seller ? `You are delivering for @${c.buyer_handle ?? "deleted"}` : `Hired @${c.seller_handle ?? "deleted"}`} · {c.delivery_days} days · revisions {c.revisions_used}/{c.revisions_allowed}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{formatCents(c.price_cents)}</p>
            <span className="chip capitalize">{c.status.replace("_", " ")}</span>
          </div>
        </div>
        <h2 className="eyebrow mt-5">Requirements</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm">{c.requirements}</p>
        {c.delivery && (<><h2 className="eyebrow mt-5">Latest delivery</h2><p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.delivery}</p></>)}
        {c.due_at && c.status === "in_progress" && <p className="mt-4 text-sm text-muted">Due <TimeAgo date={c.due_at} /></p>}
        {c.dispute_reason && <p className="mt-4 text-sm text-warning">Dispute: {c.dispute_reason}</p>}
        {c.resolution && <p className="mt-2 text-sm text-muted">Resolution: {c.resolution}</p>}
      </header>

      <section className="card space-y-4 p-6" aria-labelledby="next-h">
        <h2 id="next-h" className="font-semibold">Next step</h2>
        {c.status === "requested" && seller && (
          <ActionForm action={contractAction} className="flex gap-2">{hidden}<button name="op" value="accept" className="btn-primary">Accept request</button><button name="op" value="decline" className="btn-secondary">Decline</button></ActionForm>
        )}
        {c.status === "requested" && !seller && <p className="text-sm text-muted">Waiting for the seller to accept.</p>}
        {c.status === "accepted" && !seller && (
          <ActionForm action={contractAction} className="flex flex-wrap gap-2">{hidden}<button name="op" value="pay" className="btn-primary">Pay {formatCents(c.price_cents)}</button><button name="op" value="cancel" className="btn-ghost">Cancel</button></ActionForm>
        )}
        {c.status === "accepted" && seller && <p className="text-sm text-muted">Waiting for the buyer&apos;s payment. Start work once it&apos;s in progress.</p>}
        {c.status === "in_progress" && seller && (
          <ActionForm action={contractAction} className="space-y-3">{hidden}<input type="hidden" name="op" value="deliver" />
            <label className="label" htmlFor="delivery">Delivery message and links</label>
            <textarea id="delivery" name="delivery" required minLength={5} maxLength={5000} rows={3} className="input" />
            <button className="btn-primary">Deliver work</button>
          </ActionForm>
        )}
        {c.status === "in_progress" && !seller && <p className="text-sm text-muted">The seller is working on it.</p>}
        {c.status === "delivered" && !seller && (
          <ActionForm action={contractAction} className="space-y-3">{hidden}
            <input name="note" maxLength={500} placeholder="What should change? (for revisions)" aria-label="Revision note" className="input" />
            <div className="flex flex-wrap gap-2">
              <button name="op" value="complete" className="btn-primary">Accept & complete</button>
              {c.revisions_used < c.revisions_allowed && <button name="op" value="revise" className="btn-secondary">Request revision</button>}
            </div>
          </ActionForm>
        )}
        {c.status === "delivered" && seller && <p className="text-sm text-muted">Waiting for the buyer to review your delivery.</p>}
        {c.status === "completed" && !reviewed && (
          <ActionForm action={contractAction} showOk className="space-y-3">{hidden}<input type="hidden" name="op" value="review" />
            <label className="label" htmlFor="rating">Rate {seller ? "the buyer" : "the seller"}</label>
            <select id="rating" name="rating" defaultValue="5" className="input w-auto">{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}</select>
            <textarea name="body" maxLength={1000} rows={2} placeholder="Share your experience (optional)" aria-label="Review" className="input" />
            <button className="btn-primary">Leave review</button>
          </ActionForm>
        )}
        {c.status === "completed" && reviewed && <p className="text-sm text-mint">Contract completed. Thanks for your review!</p>}
        {(c.status === "cancelled" || c.status === "disputed") && <p className="text-sm text-muted">{c.status === "disputed" ? "A Hustera moderator is reviewing this dispute." : "This contract is closed."}</p>}
        {(c.status === "in_progress" || c.status === "delivered") && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">Something wrong? Open a dispute</summary>
            <ActionForm action={contractAction} className="mt-3 space-y-2">{hidden}<input type="hidden" name="op" value="dispute" />
              <textarea name="reason" required minLength={10} maxLength={2000} rows={2} placeholder="Explain the problem" aria-label="Dispute reason" className="input" />
              <button className="btn-danger btn-sm">Open dispute</button>
            </ActionForm>
          </details>
        )}
      </section>

      <section className="card p-6" aria-labelledby="hist-h">
        <h2 id="hist-h" className="font-semibold">History</h2>
        <ol className="mt-3 space-y-2 text-sm">
          {events.map((e) => (<li key={e.id} className="flex gap-2"><span className="text-muted"><TimeAgo date={e.created_at} /></span><span>{e.handle ? `@${e.handle}: ` : ""}{e.message}</span></li>))}
        </ol>
      </section>
    </div>
  );
}
