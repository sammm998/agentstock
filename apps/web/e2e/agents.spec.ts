import { expect, test } from "@playwright/test";
import { signUp, uniq } from "./helpers";

test("create a mission, run agents, approve a listing and hit the connection wall", async ({ page }) => {
  await signUp(page, { handle: uniq("founder") });
  await page.goto("/projects/new");
  await page.getByLabel("Mission name").fill("Study planners");
  await page.getByLabel("Brief").fill("Printable weekly planners for university students");
  await page.getByLabel(/Autonomous drafts/).check();
  await page.getByRole("button", { name: "Create mission" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Run agents" }).click();
  await expect(page.getByText("Research plan — Study planners")).toBeVisible();
  const tasks = page.getByRole("region", { name: "Tasks" });
  const listing = tasks.locator("li", { hasText: "Draft a product listing" });
  await expect(listing.getByText("Needs your approval")).toBeVisible();
  await listing.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Listing draft — Study planners")).toBeVisible();

  const publish = tasks.locator("li", { hasText: "Publish listing to a sales channel" });
  await publish.getByRole("button", { name: "Approve" }).click();
  await expect(publish.getByText(/CONNECT_REQUIRED/)).toBeVisible();
  await expect(page.getByText("blocked", { exact: true }).first()).toBeVisible();

  await page.goto("/projects");
  await expect(page.getByText("4 of 5 tasks done")).toBeVisible();
});
