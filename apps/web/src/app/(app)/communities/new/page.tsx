import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { createSpaceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New Space" };

export default async function NewSpacePage() {
  await requireViewer();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create a Space" description="You'll be the owner. We'll set up #announcements and #general channels for you." />
      <ActionForm action={createSpaceAction} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required minLength={3} maxLength={48} placeholder="E-commerce Builders" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="slug">Address</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">/s/</span>
            <input id="slug" name="slug" required minLength={3} maxLength={32} pattern="[a-z0-9-]+" title="Lowercase letters, numbers and dashes" placeholder="ecommerce-builders" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" maxLength={280} rows={3} placeholder="What is this Space about? Who is it for?" className="input" />
        </div>
        <fieldset>
          <legend className="label">Visibility</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="visibility" value="public" defaultChecked className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Public</span><span className="text-xs text-muted">Anyone can find and join.</span></span>
            </label>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-indigo has-[:checked]:bg-indigo/10">
              <input type="radio" name="visibility" value="private" className="mt-1 accent-indigo" />
              <span><span className="block text-sm font-semibold">Private</span><span className="text-xs text-muted">Invite-only and hidden from search.</span></span>
            </label>
          </div>
        </fieldset>
        <button className="btn-primary w-full">Create Space</button>
      </ActionForm>
    </div>
  );
}
