"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  channelSchema,
  costSchema,
  emailSchema,
  productSchema,
  storeSchema,
  commentSchema,
  firstError,
  messageSchema,
  missionSchema,
  passwordSchema,
  postSchema,
  profileUpdateSchema,
  reportSchema,
  signInSchema,
  signUpSchema,
  spaceSchema,
} from "@hustera/domain";
import { UserError, isUuid } from "@/server/core";
import { authenticate, changePassword, deleteAccount, registerUser, requestPasswordReset, resetPassword, updateProfile } from "@/server/accounts";
import { endSession, getViewer, requireViewer, startSession } from "@/server/session";
import * as social from "@/server/social";
import * as spaces from "@/server/spaces";
import * as messages from "@/server/messages";
import * as moderation from "@/server/moderation";
import * as agents from "@/server/agents";
import * as commerce from "@/server/commerce";
import * as marketplace from "@/server/marketplace";
import * as composio from "@/server/composio";
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

// ---------------------------------------------------------------- agents

export async function createMissionAction(fd: FormData): Promise<ActionState> {
  let missionId = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    const euros = (k: string) => Math.round(Number(str(fd, k) || "0") * 100);
    const input = parse(missionSchema, {
      kind: str(fd, "kind"),
      title: str(fd, "title"),
      brief: str(fd, "brief"),
      region: str(fd, "region"),
      mode: str(fd, "mode"),
      totalCents: euros("total"),
      perDayCents: euros("perDay"),
      perTaskCents: euros("perTask"),
      ownershipConfirmed: fd.get("ownershipConfirmed") === "on",
      priceCents: euros("price") || 900,
      externalChannel: fd.get("externalChannel") === "on",
    });
    missionId = await agents.createMission(viewer.id, input);
  });
  if (r?.error) return r;
  redirect(`/projects/${missionId}`);
}

export async function runMissionAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const result = await agents.runMission(viewer.id, id(fd, "missionId"));
    return result === "done" ? "Mission finished its current plan" : "Waiting for you";
  });
}

export async function approvalAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const missionId = id(fd, "missionId");
    await agents.decideApproval(viewer.id, id(fd, "taskId"), str(fd, "decision") === "approve");
    await agents.runMission(viewer.id, missionId);
  });
}

export async function missionStateAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const op = str(fd, "op");
    if (op !== "pause" && op !== "resume" && op !== "stop") throw new UserError("Invalid request");
    await agents.setMissionState(viewer.id, id(fd, "missionId"), op);
  });
}

export async function retryTaskAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await agents.retryTask(viewer.id, id(fd, "taskId"));
    await agents.runMission(viewer.id, id(fd, "missionId"));
  });
}

export async function haltAgentsAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await agents.setAgentsHalted(viewer, str(fd, "op") === "halt");
  });
}

// ---------------------------------------------------------------- commerce

async function baseUrl(): Promise<string> {
  if (process.env.HUSTERA_BASE_URL) return process.env.HUSTERA_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function euroCents(fd: FormData, key: string): number {
  const v = Number(str(fd, key).replace(",", "."));
  return Number.isFinite(v) ? Math.round(v * 100) : NaN;
}

export async function saveStoreAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await commerce.saveStore(viewer.id, parse(storeSchema, Object.fromEntries(fd)));
    return "Store saved";
  });
}

export async function createProductAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(productSchema, {
      title: str(fd, "title"),
      description: str(fd, "description"),
      kind: str(fd, "kind"),
      priceCents: euroCents(fd, "price"),
      deliveryContent: str(fd, "deliveryContent"),
      ownershipConfirmed: fd.get("ownershipConfirmed") === "on",
    });
    const sourceUrl = str(fd, "sourceUrl") || null;
    await commerce.createProduct(viewer.id, { ...input, source: sourceUrl ? "url_import" : "manual", sourceUrl });
    return "Product saved as draft";
  });
}

export async function importProductAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    await requireViewer();
    const data = await commerce.importFromUrl(str(fd, "url"));
    return JSON.stringify(data);
  });
  return r;
}

export async function productStatusAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const status = str(fd, "status");
    if (status !== "draft" && status !== "active" && status !== "archived") throw new UserError("Invalid request");
    await commerce.setProductStatus(viewer.id, id(fd, "productId"), status);
  });
}

export async function buyProductAction(fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await run(async () => {
    const viewer = await getViewer();
    const email = viewer?.email ?? parse(emailSchema, str(fd, "email"));
    const res = await commerce.buyProduct(id(fd, "productId"), { id: viewer?.id ?? null, email }, fd.get("waiver") === "on", await baseUrl());
    target = res.redirectUrl;
  });
  if (r?.error) return r;
  redirect(target);
}

export async function completeTestCheckoutAction(fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const r = await run(async () => {
    await commerce.completeTestCheckout(token);
  });
  if (r?.error) return r;
  redirect(`/orders/${token}?paid=1`);
}

export async function refundOrderAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await commerce.refundOrder(viewer.id, id(fd, "orderId"));
    return "Refunded";
  });
}

export async function recordCostAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    const input = parse(costSchema, { category: str(fd, "category"), amountCents: euroCents(fd, "amount"), memo: str(fd, "memo") });
    await commerce.recordCost(viewer.id, input);
    return "Cost recorded";
  });
}

// ---------------------------------------------------------------- marketplace

export async function createServiceAction(fd: FormData): Promise<ActionState> {
  let serviceId = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    const title = str(fd, "title").trim();
    const description = str(fd, "description").trim();
    if (title.length < 5 || title.length > 100) throw new UserError("Title must be 5–100 characters");
    if (description.length < 20 || description.length > 5000) throw new UserError("Describe the service in 20–5000 characters");
    const priceCents = euroCents(fd, "price");
    if (!(priceCents >= 500 && priceCents <= 1_000_000)) throw new UserError("Price must be between €5 and €10,000");
    const deliveryDays = Number(str(fd, "deliveryDays"));
    const revisions = Number(str(fd, "revisions"));
    if (!Number.isInteger(deliveryDays) || deliveryDays < 1 || deliveryDays > 90) throw new UserError("Delivery time must be 1–90 days");
    if (!Number.isInteger(revisions) || revisions < 0 || revisions > 10) throw new UserError("Revisions must be 0–10");
    serviceId = await marketplace.createService(viewer.id, { title, description, category: str(fd, "category"), priceCents, deliveryDays, revisions, aiAssisted: fd.get("aiAssisted") === "on" });
  });
  if (r?.error) return r;
  redirect(`/marketplace/${serviceId}`);
}

export async function serviceStatusAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await marketplace.setServiceStatus(viewer.id, id(fd, "serviceId"), str(fd, "status") === "paused" ? "paused" : "active");
  });
}

export async function requestContractAction(fd: FormData): Promise<ActionState> {
  let contractId = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    contractId = await marketplace.requestContract(viewer.id, id(fd, "serviceId"), str(fd, "requirements"));
  });
  if (r?.error) return r;
  redirect(`/contracts/${contractId}`);
}

export async function contractAction(fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    const contractId = id(fd, "contractId");
    switch (str(fd, "op")) {
      case "accept":
        return marketplace.respondToRequest(viewer.id, contractId, true);
      case "decline":
        return marketplace.respondToRequest(viewer.id, contractId, false);
      case "pay":
        target = (await marketplace.payContract(viewer.id, contractId, viewer.email, await baseUrl())).redirectUrl;
        return;
      case "deliver":
        return marketplace.deliver(viewer.id, contractId, str(fd, "delivery"));
      case "complete":
        return marketplace.reviewDelivery(viewer.id, contractId, "accept");
      case "revise":
        return marketplace.reviewDelivery(viewer.id, contractId, "revise", str(fd, "note"));
      case "cancel":
        return marketplace.cancelContract(viewer.id, contractId);
      case "dispute":
        return marketplace.openDispute(viewer.id, contractId, str(fd, "reason"));
      case "review":
        await marketplace.leaveReview(viewer.id, contractId, Number(str(fd, "rating")), str(fd, "body"));
        return "Thanks for your review";
      default:
        throw new UserError("Invalid request");
    }
  });
  if (r?.error || !target) return r;
  redirect(target);
}

export async function resolveDisputeAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await marketplace.resolveDispute(viewer, id(fd, "contractId"), str(fd, "outcome") === "refund" ? "refund" : "complete", str(fd, "note"));
  });
}

// ---------------------------------------------------------------- connections

export async function connectToolkitAction(fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await run(async () => {
    const viewer = await requireViewer();
    const toolkit = str(fd, "toolkit");
    if (!/^[a-z0-9_-]{2,40}$/.test(toolkit)) throw new UserError("Invalid toolkit");
    target = await composio.startConnection(viewer.id, toolkit, `${await baseUrl()}/api/composio/callback`);
  });
  if (r?.error) return r;
  redirect(target);
}

export async function revokeConnectionAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const viewer = await requireViewer();
    await composio.revokeConnection(viewer.id, id(fd, "connectionId"));
  });
}

// ---------------------------------------------------------------- password reset

export async function requestResetAction(fd: FormData): Promise<ActionState> {
  return run(async () => {
    const email = parse(emailSchema, str(fd, "email"));
    await requestPasswordReset(email, await baseUrl());
    return "If an account exists for that email, we've sent a reset link. It's valid for one hour.";
  });
}

export async function resetPasswordAction(fd: FormData): Promise<ActionState> {
  const r = await run(async () => {
    const password = parse(passwordSchema, str(fd, "password"));
    await resetPassword(str(fd, "token"), password);
  });
  if (r?.error) return r;
  redirect("/signin?changed=1");
}
