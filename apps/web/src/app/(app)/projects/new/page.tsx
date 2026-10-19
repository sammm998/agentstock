import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { createMissionAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New mission" };

export default async function NewMissionPage() {
  await requireViewer();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New mission" description="Hustera Core will plan the work and hand tasks to specialist agents. You stay in control of budget and approvals." />
      <ActionForm action={createMissionAction} className="card space-y-6 p-6">
        <fieldset>
          <legend className="label">What should we do?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="kind" value="start_business" defaultChecked className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Start a business for me</span><span className="text-xs text-muted">Validate a new idea and prepare a first offer.</span></span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="kind" value="sell_existing" className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Sell my existing product</span><span className="text-xs text-muted">Prepare offer, checklist and listing for something you own.</span></span>
            </label>
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div><label className="label" htmlFor="title">Mission name</label><input id="title" name="title" required minLength={3} maxLength={80} placeholder="Printable study planners" className="input" /></div>
          <div><label className="label" htmlFor="region">Market</label><input id="region" name="region" required defaultValue="Sweden" maxLength={60} className="input" /></div>
        </div>
        <div>
          <label className="label" htmlFor="brief">Brief</label>
          <textarea id="brief" name="brief" required minLength={10} maxLength={2000} rows={4} placeholder="What is the idea or product, who is it for, and what do you already have?" className="input" />
        </div>
        <fieldset>
          <legend className="label">Budget limits (test mode)</legend>
          <p className="mb-3 text-xs text-muted">No real money is used yet — sandbox tools record simulated costs so you can see the budget engine work. Limits are enforced before every task.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="text-xs text-muted" htmlFor="total">Total (€)</label><input id="total" name="total" type="number" min={0} max={100} step="0.01" defaultValue="2.00" required className="input" /></div>
            <div><label className="text-xs text-muted" htmlFor="perDay">Per day (€)</label><input id="perDay" name="perDay" type="number" min={0} max={100} step="0.01" defaultValue="1.00" required className="input" /></div>
            <div><label className="text-xs text-muted" htmlFor="perTask">Per task (€)</label><input id="perTask" name="perTask" type="number" min={0} max={100} step="0.01" defaultValue="0.50" required className="input" /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">How much autonomy?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="mode" value="approve_each" defaultChecked className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Approve each step</span><span className="text-xs text-muted">Agents ask before every task.</span></span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="mode" value="autonomous" className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Autonomous drafts</span><span className="text-xs text-muted">Drafting runs on its own; listings and publishing still need approval.</span></span>
            </label>
          </div>
        </fieldset>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="ownershipConfirmed" className="mt-1 accent-indigo" />
          <span>If selling an existing product: I own it or am authorised to sell it.</span>
        </label>
        <button className="btn-primary w-full">Create mission</button>
      </ActionForm>
    </div>
  );
}
