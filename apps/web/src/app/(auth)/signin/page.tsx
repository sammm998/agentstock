import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/server/session";
import { signInAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; changed?: string }> }) {
  if (await getViewer()) redirect("/home");
  const { next, changed } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your Hustera account.</p>
      {changed && <p className="mt-3 text-sm text-mint">Password changed. Please sign in again.</p>}
      <ActionForm action={signInAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? "/home"} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <button className="btn-primary w-full">Sign in</button>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href="/signup" className="font-semibold text-cloud hover:underline">Create an account</Link>
      </p>
    </>
  );
}
