import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Sparkles, Star } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { isUuid } from "@/server/core";
import { getViewer } from "@/server/session";
import { getService, serviceReviews } from "@/server/marketplace";
import { requestContractAction, serviceStatusAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Avatar, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Service" };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [service, viewer] = await Promise.all([getService(id), getViewer()]);
  if (!service || (service.status !== "active" && service.seller_id !== viewer?.id)) notFound();
  const reviews = await serviceReviews(id);
  const own = viewer?.id === service.seller_id;
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Link href="/marketplace" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> Marketplace</Link>
        <article className="card p-6">
          <p className="chip w-fit">{service.category}</p>
          <h1 className="mt-3 text-2xl font-bold">{service.title}</h1>
          <Link href={`/u/${service.handle}`} className="mt-3 flex items-center gap-2 text-sm">
            <Avatar name={service.display_name} seed={service.handle} size={30} />
            <span className="font-medium">{service.display_name}</span>
            <span className="text-muted">@{service.handle}</span>
          </Link>
          {service.ai_assisted && <p className="mt-3 flex items-center gap-1.5 text-sm text-[#b8b0ff]"><Sparkles size={14} aria-hidden="true" /> The seller uses AI tools for this service.</p>}
          <p className="mt-5 whitespace-pre-wrap leading-relaxed">{service.description}</p>
        </article>
        <section className="card p-6" aria-labelledby="reviews-h">
          <h2 id="reviews-h" className="font-semibold">Reviews from completed contracts ({service.review_count})</h2>
          {reviews.length ? (
            <ul className="mt-4 space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <p className="flex items-center gap-2"><span className="font-medium">{r.display_name}</span><span className="text-warning" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span><span className="text-xs text-muted"><TimeAgo date={r.created_at} /></span></p>
                  {r.body && <p className="mt-1 text-muted">{r.body}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">No reviews yet. Reviews can only be left after a completed contract.</p>
          )}
        </section>
      </div>
      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <p className="text-3xl font-bold">{formatCents(service.price_cents)}</p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>Delivery in {service.delivery_days} days</li>
          <li>{service.revisions} revision{service.revisions === 1 ? "" : "s"} included</li>
          <li>{service.review_count ? <><Star size={13} className="inline text-warning" aria-hidden="true" /> {service.rating_avg} average</> : "No ratings yet"} · {service.completed} completed</li>
        </ul>
        {own ? (
          <ActionForm action={serviceStatusAction} className="mt-5">
            <input type="hidden" name="serviceId" value={service.id} />
            <button name="status" value={service.status === "active" ? "paused" : "active"} className="btn-secondary w-full">{service.status === "active" ? "Pause service" : "Resume service"}</button>
          </ActionForm>
        ) : viewer ? (
          <ActionForm action={requestContractAction} className="mt-5 space-y-3">
            <input type="hidden" name="serviceId" value={service.id} />
            <label className="label" htmlFor="requirements">What do you need?</label>
            <textarea id="requirements" name="requirements" required minLength={10} maxLength={3000} rows={4} className="input" />
            <button className="btn-primary w-full">Send request</button>
            <p className="text-xs text-muted">You pay only after the seller accepts.</p>
          </ActionForm>
        ) : (
          <Link href={`/signin?next=/marketplace/${service.id}`} className="btn-primary mt-5 w-full">Sign in to hire</Link>
        )}
      </aside>
    </div>
  );
}
