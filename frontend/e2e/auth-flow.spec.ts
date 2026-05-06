import { expect, test } from "@playwright/test";

test("login link preserves the current page as next", async ({ page }) => {
  await page.goto("/jd");
  await page.getByRole("link", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/auth\?next=%2Fjd$/);
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
});

test("registration returns to requested page and updates navbar", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  await page.goto("/auth?next=%2Fjd");
  await page.getByRole("button", { name: "还没有账号？创建一个" }).click();
  await page.getByLabel(/昵称/).fill("E2E User");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("E2ePass123!");
  await expect(page.getByRole("button", { name: "注册并登录" })).toBeDisabled();
  await page.getByLabel(/我已阅读并同意/).check();
  await page.getByRole("button", { name: "注册并登录" }).click();

  await expect(page).toHaveURL(/\/jd$/);
  await expect(page.getByTitle(`当前账号：${email}`)).toBeVisible();

  await page.getByRole("button", { name: /退出/ }).click();
  await expect(page).toHaveURL(/\/auth/);
});
