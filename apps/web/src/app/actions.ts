"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  channelSchema,
  commentSchema,
  firstError,
  messageSchema,
  passwordSchema,
  postSchema,
  profileUpdateSchema,
  reportSchema,
  signInSchema,
  signUpSchema,
  spaceSchema,
} from "@hustera/domain";
import { UserError, isUuid } from "@/server/core";
import { authenticate, changePassword, deleteAccount, registerUser, updateProfile } from "@/server/accounts";
import { endSession, requireViewer, startSession } from "@/server/session";
import * as social from "@/server/social";
import * as spaces from "@/server/spaces";
import * as messages from "@/server/messages";
import * as moderation from "@/server/moderation";
import { markAllRead } from "@/server/notifications";
import type { ActionState } from "@/components/action-form";

/** Runs a mutation, converting UserErrors into form state and refreshing the UI. */
async function run(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = await fn();
    revalidatePath("/", "layout");
    return { ok: ok ?? "Done" };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function id(fd: FormData, key: string): string {
  const v = str(fd, key);
  if (!isUuid(v)) throw new UserError("Invalid request");
  return v;
}

function parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: import("zod").ZodError } }, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new UserError(firstError(r.error));
  return r.data;
}

/** Only allow same-site relative redirects. */
function safeNext(value: string, fallback = "/home"): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

// ---------------------------------------------------------------- auth

export async function signUpAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const input = parse(signUpSchema, Object.fromEntries(fd));
    const userId = await registerUser(input);
    await startSession(userId);
  });
  if (r?.error) return r;
  redirect("/home?welcome=1");
}

export async function signInAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const input = parse(signInSchema, Object.fromEntries(fd));
    const userId = await authenticate(input.email, input.password);
    if (!userId) throw new UserError("Email or password is incorrect");
    await startSession(userId);
  });
  if (r?.error) return r;
  redirect(safeNext(str(fd, "next")));
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}

// ---------------------------------------------------------------- profile & settings

export async function updateProfileAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(profileUpdateSchema, {
      displayName: str(fd, "displayName"),
      bio: str(fd, "bio"),
      location: str(fd, "location"),
      website: str(fd, "website"),
      kind: str(fd, "kind"),
      isPrivate: fd.get("isPrivate") === "on",
    });
    await updateProfile(viewer.id, input);
    return "Profile saved";
  });
}

export async function changePasswordAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const viewer = await requireViewer();
    const next = parse(passwordSchema, str(fd, "next"));
    await changePassword(viewer.id, str(fd, "current"), next);
  });
  if (r?.error) return r;
  redirect("/signin?changed=1");
}

export async function deleteAccountAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const viewer = await requireViewer();
    if (str(fd, "confirm") !== viewer.handle) throw new UserError("Type your handle to confirm");
    await deleteAccount(viewer.id, str(fd, "password"));
    await endSession();
  });
  if (r?.error) return r;
  redirect("/?deleted=1");
}

// ---------------------------------------------------------------- social

export async function createPostAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(postSchema, { body: str(fd, "body"), visibility: str(fd, "visibility") || "public" });
    await social.createPost(viewer.id, input.body, input.visibility);
    return "Posted";
  });
}

export async function deletePostAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await social.deleteOwnPost(viewer.id, id(fd, "postId"));
    return "Post deleted";
  });
}

export async function likeAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await social.toggleLike(viewer.id, id(fd, "postId"));
  });
}

export async function saveAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    return (await social.toggleSave(viewer.id, id(fd, "postId"))) ? "Saved" : "Removed from saved";
  });
}

export async function repostAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await social.repost(viewer.id, id(fd, "postId"));
  });
}

export async function commentAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const { body } = parse(commentSchema, { body: str(fd, "body") });
    await social.addComment(viewer.id, id(fd, "postId"), body);
    return "Comment added";
  });
}

export async function deleteCommentAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await social.deleteOwnComment(viewer.id, id(fd, "commentId"));
  });
}

export async function followAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const target = id(fd, "userId");
    if (str(fd, "op") === "unfollow") await social.unfollow(viewer.id, target);
    else return (await social.follow(viewer.id, target)) === "pending" ? "Request sent" : "Following";
  });
}

export async function followRequestAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await social.respondToFollowRequest(viewer.id, id(fd, "userId"), str(fd, "op") === "approve");
  });
}

export async function blockAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const target = id(fd, "userId");
    if (str(fd, "op") === "unblock") await social.unblock(viewer.id, target);
    else await social.block(viewer.id, target);
  });
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await markAllRead(viewer.id);
  });
}

// ---------------------------------------------------------------- messages

export async function startConversationAction(fd: FormData): Promise<ActionState> {
  let convo = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    convo = await messages.openConversation(viewer.id, id(fd, "userId"));
  });
  if (r?.error) return r;
  redirect(`/messages/${convo}`);
}

export async function sendMessageAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const { body } = parse(messageSchema, { body: str(fd, "body") });
    await messages.sendDirectMessage(viewer.id, id(fd, "conversationId"), body);
  });
}

// ---------------------------------------------------------------- spaces

export async function createSpaceAction(fd: FormData): Promise<ActionState> {
  let slug = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    const input = parse(spaceSchema, Object.fromEntries(fd));
    await spaces.createSpace(viewer.id, input);
    slug = input.slug;
  });
  if (r?.error) return r;
  redirect(`/s/${slug}`);
}

export async function updateSpaceAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(spaceSchema.omit({ slug: true }), Object.fromEntries(fd));
    await spaces.updateSpace(viewer.id, id(fd, "spaceId"), input);
    return "Space updated";
  });
}

export async function deleteSpaceAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const viewer = await requireViewer();
    await spaces.deleteSpace(viewer.id, id(fd, "spaceId"));
  });
  if (r?.error) return r;
  redirect("/communities");
}

export async function joinSpaceAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await spaces.joinPublicSpace(viewer.id, id(fd, "spaceId"));
    return "Joined";
  });
}

export async function leaveSpaceAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const viewer = await requireViewer();
    await spaces.leaveSpace(viewer.id, id(fd, "spaceId"));
  });
  if (r?.error) return r;
  redirect("/communities");
}

export async function createChannelAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(channelSchema, { name: str(fd, "name"), topic: str(fd, "topic"), kind: str(fd, "kind") || "text" });
    await spaces.createChannel(viewer.id, id(fd, "spaceId"), input);
    return `#${input.name} created`;
  });
}

export async function deleteChannelAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await spaces.deleteChannel(viewer.id, id(fd, "channelId"));
  });
}

export async function postChannelMessageAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const { body } = parse(messageSchema, { body: str(fd, "body") });
    await spaces.postChannelMessage(viewer.id, id(fd, "channelId"), body);
  });
}

export async function deleteChannelMessageAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await spaces.deleteChannelMessage(viewer.id, id(fd, "messageId"));
  });
}

export async function pinMessageAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await spaces.togglePin(viewer.id, id(fd, "messageId"));
  });
}

export async function memberRoleAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const spaceId = id(fd, "spaceId");
    const userId = id(fd, "userId");
    const op = str(fd, "op");
    if (op === "remove") await spaces.removeMember(viewer.id, spaceId, userId, str(fd, "note"));
    else await spaces.setMemberRole(viewer.id, spaceId, userId, op === "promote" ? "moderator" : "member");
  });
}

export async function createInviteAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const code = await spaces.createInvite(viewer.id, id(fd, "spaceId"));
    return `Invite created: /invite/${code}`;
  });
}

export async function acceptInviteAction(fd: FormData): Promise<ActionState> {
  let slug = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    slug = await spaces.acceptInvite(viewer.id, str(fd, "code"));
  });
  if (r?.error) return r;
  redirect(`/s/${slug}`);
}

// ---------------------------------------------------------------- trust & safety

export async function reportAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(reportSchema, Object.fromEntries(fd));
    await moderation.fileReport(viewer.id, input);
    return "Thanks — our moderators will review this.";
  });
}

export async function resolveReportAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const decision = str(fd, "decision") === "action" ? "action" : "dismiss";
    await moderation.resolveReport(viewer, id(fd, "reportId"), decision, str(fd, "note").slice(0, 500));
  });
}

export async function appealAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const body = str(fd, "body").trim();
    if (!body || body.length > 1000) throw new UserError("Explain your appeal in up to 1000 characters");
    await moderation.fileAppeal(viewer.id, id(fd, "actionId"), body);
    return "Appeal submitted";
  });
}

export async function decideAppealAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await moderation.decideAppeal(viewer, id(fd, "appealId"), str(fd, "decision") === "overturn");
  });
}
