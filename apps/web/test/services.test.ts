import { afterAll, describe, expect, it } from "vitest";
import { registerUser, authenticate, createSession, viewerForToken, updateProfile, exportAccount, deleteAccount, getProfileByHandle } from "@/server/accounts";
import { block, createPost, discoverFeed, follow, getPost, homeFeed, profilePosts, respondToFollowRequest, toggleLike, addComment, repost, searchPeople, deleteOwnPost } from "@/server/social";
import { createSpace, getSpace, listChannels, postChannelMessage, channelMessages, createInvite, acceptInvite, setMemberRole, removeMember, deleteChannelMessage, spaceModLog, joinPublicSpace } from "@/server/spaces";
import { openConversation, sendDirectMessage, conversationMessages, listConversations } from "@/server/messages";
import { fileReport, reportQueue, resolveReport, actionsAgainst, fileAppeal, openAppeals, decideAppeal } from "@/server/moderation";
import { sparksSummary, sparksLedger } from "@/server/sparks";
import { listNotifications } from "@/server/notifications";
import { resetDbForTests } from "@/server/db";

let n = 0;
async function user(opts: { admin?: boolean } = {}) {
  n += 1;
  const handle = `user_${n}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${handle}@example.test`;
  if (opts.admin) process.env.HUSTERA_ADMIN_EMAILS = email;
  const id = await registerUser({ email, password: "correct horse battery", handle, displayName: `User ${n}` });
  process.env.HUSTERA_ADMIN_EMAILS = "";
  return { id, email, handle };
}

afterAll(async () => {
  await resetDbForTests();
});

describe("accounts", () => {
  it("registers, authenticates and resolves sessions", async () => {
    const u = await user();
    expect(await authenticate(u.email, "wrong password!")).toBeNull();
    expect(await authenticate(u.email, "correct horse battery")).toBe(u.id);
    const { token } = await createSession(u.id);
    const viewer = await viewerForToken(token);
    expect(viewer?.handle).toBe(u.handle);
    expect(await viewerForToken("nope")).toBeNull();
  });

  it("rejects duplicate emails and handles", async () => {
    const u = await user();
    await expect(registerUser({ email: u.email, password: "correct horse battery", handle: "fresh_handle_x", displayName: "X" })).rejects.toThrow(/email/);
    await expect(registerUser({ email: "other@example.test", password: "correct horse battery", handle: u.handle, displayName: "X" })).rejects.toThrow(/handle/);
  });

  it("exports and deletes an account", async () => {
    const u = await user();
    await createPost(u.id, "hello export", "public");
    const data = await exportAccount(u.id);
    expect(data.posts).toHaveLength(1);
    await expect(deleteAccount(u.id, "bad")).rejects.toThrow();
    await deleteAccount(u.id, "correct horse battery");
    expect(await getProfileByHandle(u.handle)).toBeNull();
  });
});

describe("social graph and visibility", () => {
  it("shows followed posts in home feed and hides private posts from non-followers", async () => {
    const a = await user();
    const b = await user();
    const postId = await createPost(b.id, "Launching my #printables shop, thanks @" + a.handle, "public");
    expect((await homeFeed(a.id)).some((p) => p.id === postId)).toBe(false);
    expect(await follow(a.id, b.id)).toBe("active");
    expect((await homeFeed(a.id)).some((p) => p.id === postId)).toBe(true);
    expect((await discoverFeed(null, { tag: "printables" })).some((p) => p.id === postId)).toBe(true);

    const notifs = await listNotifications(a.id);
    expect(notifs.some((x) => x.kind === "mention")).toBe(true);

    const c = await user();
    await updateProfile(c.id, { displayName: "Private C", bio: "", location: "", website: null, kind: "creator", isPrivate: true });
    const secret = await createPost(c.id, "followers only", "public");
    expect(await getPost(a.id, secret)).toBeNull();
    expect(await follow(a.id, c.id)).toBe("pending");
    expect(await getPost(a.id, secret)).toBeNull();
    await respondToFollowRequest(c.id, a.id, true);
    expect(await getPost(a.id, secret)).not.toBeNull();
    expect(await getPost(null, secret)).toBeNull();
  });

  it("blocking hides content both ways and removes follows", async () => {
    const a = await user();
    const b = await user();
    await follow(a.id, b.id);
    const p = await createPost(b.id, "visible until blocked", "public");
    await block(b.id, a.id);
    expect(await getPost(a.id, p)).toBeNull();
    expect((await profilePosts(a.id, b.id)).length).toBe(0);
    await expect(follow(a.id, b.id)).rejects.toThrow();
    expect((await searchPeople(a.id, b.handle)).length).toBe(0);
    await expect(openConversation(a.id, b.id)).rejects.toThrow();
  });

  it("likes, comments and reposts", async () => {
    const a = await user();
    const b = await user();
    const p = await createPost(b.id, "like me", "public");
    expect(await toggleLike(a.id, p)).toBe(true);
    await addComment(a.id, p, "Great work!");
    await repost(a.id, p);
    const post = await getPost(a.id, p);
    expect(post).toMatchObject({ like_count: 1, comment_count: 1, repost_count: 1, liked: true, reposted: true });
    const feed = await profilePosts(a.id, a.id);
    expect(feed[0]?.original?.id).toBe(p);
    expect(await toggleLike(a.id, p)).toBe(false);
  });
});

describe("sparks", () => {
  it("awards per published rules, caps daily posts and reverses removed content", async () => {
    const a = await user();
    const b = await user();
    const first = await createPost(a.id, "post 0", "public");
    let s = await sparksSummary(a.id);
    expect(s.balance).toBe(10 + 2);
    for (let i = 1; i < 5; i++) await createPost(a.id, `post ${i}`, "public");
    s = await sparksSummary(a.id);
    expect(s.balance).toBe(10 + 2 * 5);

    await toggleLike(b.id, first);
    expect((await sparksSummary(a.id)).balance).toBe(21);
    await toggleLike(b.id, first); // unlike reverses
    expect((await sparksSummary(a.id)).balance).toBe(20);
    await toggleLike(b.id, first); // re-like can't be farmed
    expect((await sparksSummary(a.id)).balance).toBe(20);

    await deleteOwnPost(a.id, first);
    expect((await sparksSummary(a.id)).balance).toBe(18);
    const ledger = await sparksLedger(a.id);
    expect(ledger.some((e) => e.amount < 0 && e.reverses_id)).toBe(true);
  });
});

describe("spaces", () => {
  it("enforces roles, invites and moderation logs", async () => {
    const owner = await user();
    const member = await user();
    const outsider = await user();
    const slug = `space-${Math.random().toString(36).slice(2, 8)}`;
    const id = await createSpace(owner.id, { name: "Etsy Builders", slug, description: "", visibility: "private" });
    expect(await getSpace(outsider.id, slug)).toBeNull();
    await expect(joinPublicSpace(outsider.id, id)).rejects.toThrow(/invite/);

    const code = await createInvite(owner.id, id);
    await acceptInvite(member.id, code);
    const space = await getSpace(member.id, slug);
    expect(space?.role).toBe("member");

    const channels = await listChannels(id);
    const general = channels.find((c) => c.name === "general")!;
    const announcements = channels.find((c) => c.name === "announcements")!;
    await postChannelMessage(member.id, general.id, "hi all");
    await expect(postChannelMessage(member.id, announcements.id, "news")).rejects.toThrow(/permission/);
    await expect(postChannelMessage(outsider.id, general.id, "let me in")).rejects.toThrow(/permission/);

    const [msg] = await channelMessages(owner.id, general.id);
    await expect(createInvite(member.id, id)).rejects.toThrow();
    await setMemberRole(owner.id, id, member.id, "moderator");
    await deleteChannelMessage(owner.id, msg!.id);
    expect(await channelMessages(owner.id, general.id)).toHaveLength(0);
    await expect(removeMember(member.id, id, owner.id, "")).rejects.toThrow();
    const log = await spaceModLog(owner.id, id);
    expect(log.map((l) => l.action)).toContain("message.removed");
  });
});

describe("messages", () => {
  it("sends direct messages and tracks unread", async () => {
    const a = await user();
    const b = await user();
    const convo = await openConversation(a.id, b.id);
    expect(await openConversation(b.id, a.id)).toBe(convo);
    await sendDirectMessage(a.id, convo, "Hej! Want to collaborate?");
    expect((await listConversations(b.id))[0]?.unread).toBe(1);
    const thread = await conversationMessages(b.id, convo);
    expect(thread?.messages).toHaveLength(1);
    expect((await listConversations(b.id))[0]?.unread).toBe(0);
    const c = await user();
    expect(await conversationMessages(c.id, convo)).toBeNull();
  });
});

describe("moderation", () => {
  it("reports, removes content, and supports appeals", async () => {
    const admin = await user({ admin: true });
    const author = await user();
    const reporter = await user();
    const p = await createPost(author.id, "spammy spam", "public");
    await fileReport(reporter.id, { targetType: "post", targetId: p, reason: "spam", details: "" });
    await expect(reportQueue("user")).rejects.toThrow();
    const queue = await reportQueue("admin");
    const report = queue.find((r) => r.target_id === p)!;
    expect(report.owner_handle).toBe(author.handle);
    await resolveReport({ id: admin.id, role: "admin" }, report.id, "action", "Spam");
    expect(await getPost(reporter.id, p)).toBeNull();

    const [action] = await actionsAgainst(author.id);
    await fileAppeal(author.id, action!.id, "This was a genuine announcement.");
    const [appeal] = await openAppeals("admin");
    await decideAppeal({ id: admin.id, role: "admin" }, appeal!.id, true);
    expect(await getPost(reporter.id, p)).not.toBeNull();
  });
});
