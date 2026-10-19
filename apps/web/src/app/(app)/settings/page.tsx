import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireViewer } from "@/server/session";
import { getProfile } from "@/server/accounts";
import { blockedAccounts } from "@/server/social";
import { actionsAgainst } from "@/server/moderation";
import { appealAction, blockAction, changePasswordAction, deleteAccountAction, signOutAction, updateProfileAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const [profile, blocked, actions] = await Promise.all([getProfile(viewer.id), blockedAccounts(viewer.id), actionsAgainst(viewer.id)]);
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description={`Signed in as ${viewer.email}`} actions={<form action={signOutAction}><button className="btn-secondary btn-sm">Sign out</button></form>} />

      <section className="card p-6" aria-labelledby="profile">
        <h2 id="profile" className="font-semibold">Profile</h2>
        <ActionForm action={updateProfileAction} showOk className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="displayName">Name</label><input id="displayName" name="displayName" defaultValue={profile.display_name} required maxLength={50} className="input" /></div>
            <div>
              <label className="label" htmlFor="kind">Profile type</label>
              <select id="kind" name="kind" defaultValue={profile.kind} className="input">
                <option value="personal">Member</option>
                <option value="creator">Creator</option>
                <option value="freelancer">Freelancer</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>
          <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={280} rows={3} placeholder="What do you build? What are you looking for?" className="input" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" defaultValue={profile.location} maxLength={60} className="input" /></div>
            <div><label className="label" htmlFor="website">Website</label><input id="website" name="website" type="url" defaultValue={profile.website ?? ""} maxLength={200} placeholder="https://" className="input" /></div>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-line p-3">
            <input type="checkbox" name="isPrivate" defaultChecked={profile.is_private} className="mt-1 accent-indigo" />
            <span><span className="block text-sm font-semibold">Private account</span><span className="text-xs text-muted">Only followers you approve can see your posts. Your name, handle and bio stay visible.</span></span>
          </label>
          <button className="btn-primary">Save profile</button>
        </ActionForm>
      </section>

      <section className="card p-6" aria-labelledby="blocked">
        <h2 id="blocked" className="font-semibold">Blocked accounts</h2>
        {blocked.length ? (
          <ul className="mt-3 divide-y divide-line">
            {blocked.map((b) => (
              <li key={b.user_id} className="flex items-center justify-between py-2.5 text-sm">
                <span><span className="font-semibold">{b.display_name}</span> <span className="text-muted">@{b.handle}</span></span>
                <ActionForm action={blockAction}>
                  <input type="hidden" name="userId" value={b.user_id} />
                  <input type="hidden" name="op" value="unblock" />
                  <button className="btn-ghost btn-sm">Unblock</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">You haven&apos;t blocked anyone.</p>
        )}
      </section>

      <section id="moderation" className="card p-6" aria-labelledby="mod">
        <h2 id="mod" className="font-semibold">Moderation decisions</h2>
        <p className="mt-1 text-sm text-muted">Actions taken on your content. You can appeal each decision once.</p>
        {actions.length ? (
          <ul className="mt-3 space-y-3">
            {actions.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.action.replace(".", " ")}{a.space_name ? ` in ${a.space_name}` : ""}</span>
                  <span className="text-xs text-muted"><TimeAgo date={a.created_at} /></span>
                </div>
                {a.note && <p className="mt-1 text-muted">Reason: {a.note}</p>}
                {a.appeal_status ? (
                  <p className="mt-2 text-xs">Appeal: <span className="capitalize text-mint">{a.appeal_status}</span></p>
                ) : (
                  <ActionForm action={appealAction} showOk className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="actionId" value={a.id} />
                    <input name="body" required maxLength={1000} placeholder="Explain why this decision should be reversed" aria-label="Appeal" className="input flex-1" />
                    <button className="btn-secondary btn-sm">Appeal</button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No actions have been taken on your account.</p>
        )}
      </section>

      <section className="card p-6" aria-labelledby="password">
        <h2 id="password" className="font-semibold">Password</h2>
        <ActionForm action={changePasswordAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="current" type="password" autoComplete="current-password" required placeholder="Current password" aria-label="Current password" className="input" />
          <input name="next" type="password" autoComplete="new-password" required minLength={10} placeholder="New password (10+ chars)" aria-label="New password" className="input" />
          <button className="btn-secondary">Change</button>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">Changing your password signs you out everywhere.</p>
      </section>

      <section className="card p-6" aria-labelledby="data">
        <h2 id="data" className="font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Download everything Hustera stores about you as JSON.</p>
        <Link href="/api/account/export" prefetch={false} className="btn-secondary mt-3"><Download size={16} aria-hidden="true" /> Export my data</Link>
      </section>

      <section className="card border-danger/30 p-6" aria-labelledby="delete">
        <h2 id="delete" className="font-semibold text-danger">Delete account</h2>
        <p className="mt-1 text-sm text-muted">Permanently deletes your profile, posts, comments, messages and Sparks. This cannot be undone.</p>
        <ActionForm action={deleteAccountAction} confirm="Permanently delete your Hustera account?" className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="confirm" required placeholder={`Type ${viewer.handle}`} aria-label="Type your handle to confirm" className="input" />
          <input name="password" type="password" autoComplete="current-password" required placeholder="Password" aria-label="Password" className="input" />
          <button className="btn-danger">Delete</button>
        </ActionForm>
      </section>
    </div>
  );
}
