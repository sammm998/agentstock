import Link from "next/link";
import { followAction } from "@/app/actions";
import type { FollowState, PersonView } from "@/server/social";
import { ActionForm } from "./action-form";
import { Avatar, KindChip } from "./ui";

export function FollowButton({ userId, state, small = false }: { userId: string; state: FollowState | null; small?: boolean }) {
  const following = state === "active" || state === "pending";
  return (
    <ActionForm action={followAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="op" value={following ? "unfollow" : "follow"} />
      <button className={`${following ? "btn-secondary" : "btn-primary"} ${small ? "btn-sm" : ""}`}>
        {state === "active" ? "Following" : state === "pending" ? "Requested" : "Follow"}
      </button>
    </ActionForm>
  );
}

export function PersonCard({ person, signedIn = true }: { person: PersonView; signedIn?: boolean }) {
  return (
    <li className="card flex items-start gap-3 p-4">
      <Avatar name={person.display_name} seed={person.handle} size={44} />
      <div className="min-w-0 flex-1">
        <Link href={`/u/${person.handle}`} className="font-semibold hover:underline">
          {person.display_name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>@{person.handle}</span>
          <KindChip kind={person.kind} />
        </div>
        {person.bio && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{person.bio}</p>}
        <p className="mt-1.5 text-xs text-muted">
          {person.followers} {person.followers === 1 ? "follower" : "followers"}
        </p>
      </div>
      {signedIn && <FollowButton userId={person.user_id} state={person.follow_state} small />}
    </li>
  );
}
