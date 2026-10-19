import { expect, type Page } from "@playwright/test";

export function uniq(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function signUp(page: Page, opts: { handle: string; name?: string; email?: string }) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill(opts.name ?? opts.handle);
  await page.getByLabel("Handle").fill(opts.handle);
  await page.getByLabel("Email").fill(opts.email ?? `${opts.handle}@e2e.test`);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/home/);
}

export async function signOut(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct horse battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/home/);
}
