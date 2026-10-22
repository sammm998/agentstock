import Link from "next/link";
import type { Metadata } from "next";
import { requestResetAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new password.</p>
      <ActionForm action={requestResetAction} showOk className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <button className="btn-primary w-full">Send reset link</button>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted"><Link href="/signin" className="font-semibold text-cloud hover:underline">Back to sign in</Link></p>
    </>
  );
}
