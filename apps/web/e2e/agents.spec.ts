import { expect, test } from "@playwright/test";
import { signUp, uniq } from "./helpers";

test("mission drafts a listing, waits for a store, then publishes a draft product", async ({ page }) => {
  const handle = uniq("founder");
  await signUp(page, { handle });
  await page.goto("/projects/new");
  await page.getByLabel(/Sell my existing product/).check();
  await page.getByLabel("Mission name").fill("Study planners");
  await page.getByLabel("Brief").fill("Printable weekly planners for university students");
  await page.getByLabel(/Autonomous drafts/).check();
  await page.getByLabel(/I own it or am authorised/).check();
  await page.getByRole("button", { name: "Create mission" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
  const missionUrl = page.url();

  await page.getByRole("button", { name: "Run agents" }).click();
  await expect(page.getByText("Research plan — Study planners")).toBeVisible();
  const tasks = page.getByRole("region", { name: "Tasks" });
  const listing = tasks.locator("li", { hasText: "Write the product listing" });
  await listing.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Listing draft — Study planners")).toBeVisible();

  const publish = tasks.locator("li", { hasText: "Publish to your Hustera store" });
  await publish.getByRole("button", { name: "Approve" }).click();
  await expect(publish.getByText(/don't have a Hustera store/)).toBeVisible();

  await page.goto("/store");
  await page.getByLabel("Store name").fill("Planner Shop");
  await page.getByLabel("Address (/store/…)").fill(`shop-${handle.slice(-5)}`);
  await page.getByRole("button", { name: "Create store" }).click();
  await expect(page.getByRole("heading", { name: "Add a product" })).toBeVisible();

  await page.goto(missionUrl);
  await tasks.locator("li", { hasText: "Publish to your Hustera store" }).getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Draft product created").first()).toBeVisible();
  await page.goto("/store");
  await expect(page.getByText("by agent")).toBeVisible();
});

test("EcomPro takes a product live, announces it, and a sale shows in the mission results", async ({ page, browser }) => {
  const handle = uniq("ecom");
  await signUp(page, { handle });
  await page.goto("/store");
  await page.getByLabel("Store name").fill("Meal Plans");
  await page.getByLabel("Address (/store/…)").fill(`meals-${handle.slice(-5)}`);
  await page.getByRole("button", { name: "Create store" }).click();
  await expect(page.getByRole("heading", { name: "Add a product" })).toBeVisible();

  await page.goto("/home");
  await page.getByRole("listitem").filter({ hasText: "EcomPro" }).getByRole("link", { name: "Use Agent" }).click();
  await page.getByLabel("Product name").fill("Budget meal planner");
  await page.getByLabel("Describe the product for buyers").fill("A printable 4-week budget meal planner with shopping lists.");
  await page.getByLabel("Price incl. VAT (€)").fill("7.90");
  await page.getByLabel("Delivery for digital products").fill("https://files.example.test/meal-planner.pdf");
  await page.getByLabel(/I own this product/).check();
  await page.getByRole("button", { name: "Start EcomPro" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
  const missionUrl = page.url();

  await page.getByRole("button", { name: "Run agents" }).click();
  const tasks = page.getByRole("region", { name: "Tasks" });
  for (const name of ["Write the product listing", "Publish to your Hustera store", "Announce it to your followers"]) {
    const row = tasks.locator("li", { hasText: name });
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(row.getByText("Done")).toBeVisible();
  }
  await expect(page.getByText("completed", { exact: true })).toBeVisible();

  const buyerCtx = await browser.newContext();
  const b = await buyerCtx.newPage();
  await b.goto(`/u/${handle}`);
  await b.getByRole("link", { name: "View product →" }).first().click();
  await b.getByLabel(/Email for your receipt/).fill("buyer@example.test");
  await b.getByLabel(/right of withdrawal ends/).check();
  await b.getByRole("button", { name: /Continue to payment/ }).click();
  await b.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(b.getByText("meal-planner.pdf")).toBeVisible();
  await buyerCtx.close();

  await page.goto(missionUrl);
  const results = page.getByRole("region", { name: "Results" });
  await expect(results.getByText("€7.90")).toBeVisible();
});
