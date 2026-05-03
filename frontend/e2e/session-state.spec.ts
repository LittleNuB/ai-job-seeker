import { expect, test } from "@playwright/test";
import { registerThroughUi } from "./support/auth";

test("login session persists across reload and navigation", async ({ page }) => {
  const user = await registerThroughUi(page, "/explore");

  await expect(page.getByTitle(`当前账号：${user.email}`)).toBeVisible();

  await page.reload();
  await expect(page.getByTitle(`当前账号：${user.email}`)).toBeVisible();

  await page.goto("/jd");
  await expect(page.getByTitle(`当前账号：${user.email}`)).toBeVisible();

  const session = await page.evaluate(() => ({
    token: window.localStorage.getItem("auth_token"),
    email: window.localStorage.getItem("auth_email"),
  }));
  expect(session.email).toBe(user.email);
  expect(session.token).toBeTruthy();
});

test("logout clears session storage and returns protected actions to login", async ({ page }) => {
  await registerThroughUi(page, "/jd");

  await page.getByRole("button", { name: /退出/ }).click();
  await expect(page).toHaveURL(/\/auth/);

  const session = await page.evaluate(() => ({
    token: window.localStorage.getItem("auth_token"),
    email: window.localStorage.getItem("auth_email"),
  }));
  expect(session.token).toBeNull();
  expect(session.email).toBeNull();

  await page.goto("/jd");
  await page.getByPlaceholder("将 JD 内容粘贴到这里...").fill("负责大模型应用开发。");
  await page.getByRole("button", { name: "开始深度解析" }).click();
  await expect(page).toHaveURL(/\/auth\?next=%2Fjd$/);
});
