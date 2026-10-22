import type { Metadata } from "next";
import { resetPasswordAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">You&apos;ll be signed out on all devices.</p>
      <ActionForm action={resetPasswordAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="input" />
        </div>
        <button className="btn-primary w-full">Save password</button>
      </ActionForm>
    </>
  );
}
