import Link from "next/link";
import { Lock, Users } from "lucide-react";
import type { SpaceView } from "@/server/spaces";
import { joinSpaceAction } from "@/app/actions";
import { ActionForm } from "./action-form";

export function SpaceIcon({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo to-[#3b2fc9] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function SpaceCard({ space, signedIn = true }: { space: SpaceView; signedIn?: boolean }) {
  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <SpaceIcon name={space.name} />
        <div className="min-w-0 flex-1">
          <Link href={`/s/${space.slug}`} className="font-semibold hover:underline">
            {space.name}
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            {space.visibility === "private" ? <Lock size={12} aria-hidden="true" /> : <Users size={12} aria-hidden="true" />}
            {space.member_count} {space.member_count === 1 ? "member" : "members"}
            {space.visibility === "private" && " · Private"}
          </p>
        </div>
      </div>
      {space.description && <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">{space.description}</p>}
      <div className="mt-4">
        {space.role ? (
          <Link href={`/s/${space.slug}`} className="btn-secondary btn-sm">
            Open
          </Link>
        ) : signedIn && space.visibility === "public" ? (
          <ActionForm action={joinSpaceAction}>
            <input type="hidden" name="spaceId" value={space.id} />
            <button className="btn-primary btn-sm">Join Space</button>
          </ActionForm>
        ) : (
          <Link href={`/s/${space.slug}`} className="btn-secondary btn-sm">
            View
          </Link>
        )}
      </div>
    </li>
  );
}
