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
  const listing = tasks.locator("li", { hasText: "Draft a product listing" });
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
