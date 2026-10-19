import { expect, test } from "@playwright/test";
import { signIn, signOut, signUp, uniq } from "./helpers";

test("sign up, post, follow, like, comment, message and earn Sparks", async ({ page }) => {
  const alice = uniq("alice");
  const bob = uniq("bob");

  await signUp(page, { handle: bob, name: "Bob Builder" });
  await page.getByLabel("Post", { exact: true }).fill(`Shipping my first #printables pack today!`);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Shipping my first")).toBeVisible();
  await signOut(page);

  await signUp(page, { handle: alice, name: "Alice Maker" });
  await page.goto(`/u/${bob}`);
  await page.getByRole("button", { name: "Follow" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

  await page.goto("/home");
  const post = page.locator("article", { hasText: "Shipping my first" });
  await post.getByRole("button", { name: "Like" }).click();
  await expect(post.getByRole("button", { name: "Unlike" })).toBeVisible();

  await post.getByRole("link", { name: /comments/ }).click();
  await page.getByLabel("Add a comment").fill("Congrats Bob!");
  await page.getByRole("button", { name: "Reply" }).click();
  await expect(page.getByText("Congrats Bob!")).toBeVisible();

  await page.goto(`/u/${bob}`);
  await page.getByRole("button", { name: /Message/ }).click();
  await expect(page).toHaveURL(/\/messages\//);
  await page.getByLabel("Message", { exact: true }).fill("Want to collaborate on a template pack?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Want to collaborate")).toBeVisible();
  await signOut(page);

  await signIn(page, `${bob}@e2e.test`);
  await page.goto("/notifications");
  await expect(page.getByText("liked your post")).toBeVisible();
  await expect(page.getByText("commented on your post")).toBeVisible();

  await page.goto("/rewards");
  // First post (10) + post (2) + peer recognition (1)
  await expect(page.getByText("Your Sparks").locator("..").getByText("13", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Peer recognition" })).toBeVisible();
});

test("spaces: create, invite-only access, channel messages and moderation", async ({ page, browser }) => {
  const owner = uniq("owner");
  const slug = `space-${Math.random().toString(36).slice(2, 7)}`;
  await signUp(page, { handle: owner });
  await page.goto("/communities/new");
  await page.getByLabel("Name").fill("Etsy Builders");
  await page.getByLabel("Address").fill(slug);
  await page.getByLabel("Description").fill("Digital printables and templates");
  await page.getByLabel(/Private/).check();
  await page.getByRole("button", { name: "Create Space" }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${slug}/c/general`));

  await page.getByLabel("Message #general").fill("Welcome everyone!");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Welcome everyone!")).toBeVisible();

  await page.getByRole("link", { name: "Manage Space" }).click();
  await page.getByRole("button", { name: "Create invite link" }).click();
  const invite = await page.locator("code", { hasText: "/invite/" }).first().innerText();

  const other = await browser.newContext();
  const p2 = await other.newPage();
  const member = uniq("member");
  await signUp(p2, { handle: member });
  await p2.goto(`/s/${slug}`);
  await expect(p2.getByText("We couldn't find that")).toBeVisible();
  await p2.goto(invite);
  await p2.getByRole("button", { name: "Accept invite" }).click();
  await expect(p2).toHaveURL(new RegExp(`/s/${slug}/c/general`));
  await expect(p2.getByText("Welcome everyone!")).toBeVisible();
  await p2.goto(`/s/${slug}/c/announcements`);
  await expect(p2.getByText("Only owners and moderators can post")).toBeVisible();
  await p2.goto(`/s/${slug}/c/general`);
  await p2.getByLabel("Message #general").fill("buy followers cheap!!!");
  await p2.getByRole("button", { name: "Send" }).click();
  await expect(p2.getByText("buy followers cheap")).toBeVisible();
  await other.close();

  await page.goto(`/s/${slug}/c/general`);
  const spam = page.locator("li", { hasText: "buy followers cheap" });
  page.once("dialog", (d) => d.accept());
  await spam.getByRole("button", { name: "Delete message" }).click();
  await expect(page.getByText("buy followers cheap")).toHaveCount(0);
  await page.goto(`/s/${slug}/manage`);
  await expect(page.getByText("message removed")).toBeVisible();
});

test("reports reach the moderation queue and admins can act", async ({ page, browser }) => {
  const author = uniq("author");
  await signUp(page, { handle: author });
  await page.getByLabel("Post", { exact: true }).fill("Guaranteed passive income, DM me");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByText("Guaranteed passive income")).toBeVisible();

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await signUp(admin, { handle: uniq("admin"), email: "admin@e2e.test" });
  await admin.goto(`/u/${author}`);
  const post = admin.locator("article", { hasText: "Guaranteed passive income" });
  await post.locator("summary", { hasText: "Report" }).click();
  await post.getByLabel("Why are you reporting this?").selectOption("scam_or_fraud");
  await post.getByRole("button", { name: "Send report" }).click();
  await expect(post.getByText("our moderators will review")).toBeVisible();

  await admin.goto("/moderation");
  const report = admin.locator("li", { hasText: "Guaranteed passive income" });
  await report.getByLabel("Resolution note").fill("Income guarantees are not allowed");
  await report.getByRole("button", { name: "Remove post" }).click();
  await expect(admin.getByText("The queue is clear")).toBeVisible();
  await ctx.close();

  await page.goto("/settings");
  await expect(page.getByText("Income guarantees are not allowed")).toBeVisible();
  await page.goto(`/u/${author}`);
  await expect(page.getByText("Guaranteed passive income")).toHaveCount(0);
});

test("privacy: data export and account deletion", async ({ page }) => {
  const handle = uniq("leaver");
  await signUp(page, { handle });
  const res = await page.request.get("/api/account/export");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.profile.handle).toBe(handle);

  await page.goto("/settings");
  await page.getByLabel("Type your handle to confirm").fill(handle);
  await page.locator('section:has(#delete) input[type="password"]').fill("correct horse battery");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Your account and personal data have been deleted")).toBeVisible();
  await page.goto(`/u/${handle}`);
  await expect(page.getByText("We couldn't find that")).toBeVisible();
});
