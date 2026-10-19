import { expect, test } from "@playwright/test";
import { signUp, uniq } from "./helpers";

test("mobile layout uses bottom navigation and has no horizontal overflow", async ({ page }) => {
  await signUp(page, { handle: uniq("mobile") });
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await nav.getByRole("link", { name: "More" }).click();
  await expect(page).toHaveURL(/\/menu/);
  await expect(page.getByRole("link", { name: "Rewards" })).toBeVisible();
  for (const path of ["/home", "/discover", "/communities", "/rewards", "/settings", "/agents"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});
