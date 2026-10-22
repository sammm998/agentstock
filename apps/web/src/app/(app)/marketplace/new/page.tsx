import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { SERVICE_CATEGORIES } from "@/server/marketplace";
import { createServiceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Offer a service" };

export default async function NewServicePage() {
  await requireViewer();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Offer a service" description="Describe exactly what buyers get, how long it takes and how many revisions are included. Be honest about AI assistance and your capacity." />
      <ActionForm action={createServiceAction} className="card grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="title">Title</label><input id="title" name="title" required minLength={5} maxLength={100} placeholder="I will design three original logo concepts" className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">What's included</label><textarea id="description" name="description" required minLength={20} maxLength={5000} rows={5} className="input" /></div>
        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" className="input">{SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div><label className="label" htmlFor="price">Price (€)</label><input id="price" name="price" type="number" min={5} max={10000} step="0.01" required className="input" /></div>
        <div><label className="label" htmlFor="deliveryDays">Delivery (days)</label><input id="deliveryDays" name="deliveryDays" type="number" min={1} max={90} defaultValue={5} required className="input" /></div>
        <div><label className="label" htmlFor="revisions">Revisions included</label><input id="revisions" name="revisions" type="number" min={0} max={10} defaultValue={1} required className="input" /></div>
        <label className="flex items-start gap-2.5 text-sm text-muted sm:col-span-2">
          <input type="checkbox" name="aiAssisted" className="mt-1 accent-indigo" />
          I use AI tools to deliver this service (shown to buyers).
        </label>
        <div className="sm:col-span-2"><button className="btn-primary w-full">Publish service</button></div>
      </ActionForm>
    </div>
  );
}
