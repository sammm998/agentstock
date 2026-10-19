import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/server/session";
import { inviteDetails } from "@/server/spaces";
import { acceptInviteAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { SpaceIcon } from "@/components/spaces";

export const metadata: Metadata = { title: "Invite" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await inviteDetails(code);
  if (!invite) notFound();
  const viewer = await getViewer();
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <div className="flex justify-center"><SpaceIcon name={invite.name} size={64} /></div>
      <p className="eyebrow mt-5">You&apos;ve been invited to join</p>
      <h1 className="mt-1 text-2xl font-bold">{invite.name}</h1>
      {invite.description && <p className="mt-2 text-sm text-muted">{invite.description}</p>}
      <div className="mt-6">
        {viewer ? (
          <ActionForm action={acceptInviteAction}>
            <input type="hidden" name="code" value={code} />
            <button className="btn-primary w-full">Accept invite</button>
          </ActionForm>
        ) : (
          <Link href={`/signin?next=/invite/${code}`} className="btn-primary w-full">Sign in to accept</Link>
        )}
      </div>
    </div>
  );
}
