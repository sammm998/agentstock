import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/server/session";
import { signUpAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Join Hustera" };

export default async function SignUp() {
  if (await getViewer()) redirect("/home");
  return (
    <>
      <h1 className="text-xl font-bold">Join Hustera</h1>
      <p className="mt-1 text-sm text-muted">Free to join. Build your profile, find your people and start collaborating.</p>
      <ActionForm action={signUpAction} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="displayName">Name</label>
            <input id="displayName" name="displayName" autoComplete="name" required maxLength={50} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="handle">Handle</label>
            <input id="handle" name="handle" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" title="Letters, numbers and underscores" className="input" aria-describedby="handle-hint" />
            <p id="handle-hint" className="mt-1 text-xs text-muted">hustera.app/u/your_handle</p>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} className="input" aria-describedby="pw-hint" />
          <p id="pw-hint" className="mt-1 text-xs text-muted">At least 10 characters.</p>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name="acceptGuidelines" required className="mt-1 accent-indigo" />
          <span>
            I agree to the <Link href="/legal/guidelines" className="text-cloud underline" target="_blank">community guidelines</Link> and understand that Sparks have no cash value.
          </span>
        </label>
        <button className="btn-primary w-full">Create account</button>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Already a member? <Link href="/signin" className="font-semibold text-cloud hover:underline">Sign in</Link>
      </p>
    </>
  );
}
