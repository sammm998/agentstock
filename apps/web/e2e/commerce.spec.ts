import { expect, test } from "@playwright/test";
import { signUp, uniq } from "./helpers";

test("seller publishes a digital product, a guest buys it via test checkout, seller refunds", async ({ page, browser }) => {
  const handle = uniq("seller");
  const slug = `store-${handle.slice(-5)}`;
  await signUp(page, { handle });
  await page.goto("/store");
  await page.getByLabel("Store name").fill("Template Studio");
  await page.getByLabel("Address (/store/…)").fill(slug);
  await page.getByRole("button", { name: "Create store" }).click();

  await page.getByLabel("Product title").fill("Notion study template");
  await page.getByLabel("Product description").fill("A ready-made study planner template");
  await page.getByLabel("Price incl. VAT (€)").fill("7.50");
  await page.getByLabel("Delivery content").fill("Download: https://files.example.test/template.zip");
  await page.getByLabel(/I own this product/).check();
  await page.getByRole("button", { name: "Save as draft" }).click();
  const row = page.locator("li", { hasText: "Notion study template" });
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByText("active")).toBeVisible();

  const guest = await browser.newContext();
  const g = await guest.newPage();
  await g.goto(`/store/${slug}`);
  await g.getByRole("link", { name: /Notion study template/ }).click();
  await expect(g.getByText(/Questions & returns/)).toBeVisible();
  await g.getByLabel(/Email for your receipt/).fill("guest@example.test");
  await g.getByLabel(/right of withdrawal ends/).check();
  await g.getByRole("button", { name: /Continue to payment/ }).click();
  await expect(g.getByRole("heading", { name: "Test checkout" })).toBeVisible();
  await g.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(g.getByRole("heading", { name: "Thank you for your order" })).toBeVisible();
  await expect(g.getByText("files.example.test/template.zip")).toBeVisible();
  await guest.close();

  await page.goto("/wallet");
  await expect(page.getByRole("region", { name: "Test-mode results" }).getByText("€7.50").first()).toBeVisible();
  await page.goto("/store");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Refund" }).click();
  await expect(page.getByRole("cell", { name: "refunded" })).toBeVisible();
});

test("marketplace contract from request to review", async ({ page, browser }) => {
  const sellerHandle = uniq("designer");
  await signUp(page, { handle: sellerHandle });
  await page.goto("/marketplace/new");
  await page.getByLabel("Title").fill("Three original logo concepts");
  await page.getByLabel("What's included").fill("Three original logo concepts with source files and a style guide.");
  await page.getByLabel("Category").selectOption("Graphic design");
  await page.getByLabel("Price (€)").fill("60");
  await page.getByRole("button", { name: "Publish service" }).click();
  await expect(page).toHaveURL(/\/marketplace\/[0-9a-f-]+$/);
  const serviceUrl = page.url();

  const ctx = await browser.newContext();
  const b = await ctx.newPage();
  const buyerHandle = uniq("buyer");
  await signUp(b, { handle: buyerHandle });
  await b.goto(serviceUrl);
  await b.getByLabel("What do you need?").fill("A minimal logo for my printables shop");
  await b.getByRole("button", { name: "Send request" }).click();
  await expect(b).toHaveURL(/\/contracts\//);
  const contractUrl = b.url();

  await page.goto(contractUrl);
  await page.getByRole("button", { name: "Accept request" }).click();
  await expect(page.getByText(/Waiting for the buyer/)).toBeVisible();

  await b.goto(contractUrl);
  await b.getByRole("button", { name: /Pay €60.00/ }).click();
  await b.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(b.getByText(/contract is now in progress/)).toBeVisible();

  await page.goto(contractUrl);
  await page.getByLabel("Delivery message and links").fill("Here you go: https://files.example.test/logos.zip");
  await page.getByRole("button", { name: "Deliver work" }).click();
  await expect(page.getByText(/Waiting for the buyer to review/)).toBeVisible();

  await b.goto(contractUrl);
  await b.getByRole("button", { name: "Accept & complete" }).click();
  await b.getByRole("button", { name: "Leave review" }).click();
  await expect(b.getByText("Thanks for your review")).toBeVisible();
  await ctx.close();

  await page.goto(serviceUrl);
  await expect(page.getByText("Reviews from completed contracts (1)")).toBeVisible();
});
