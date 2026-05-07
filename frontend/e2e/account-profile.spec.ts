import { expect, test, type Page } from "@playwright/test";
import { registerUser, type E2EUser } from "./support/auth";

async function installSession(page: Page, user: E2EUser) {
  await page.goto("/");
  await page.evaluate(
    ({ token, email }) => {
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("auth_email", email);
    },
    { token: user.token, email: user.email },
  );
}

test("account page renders profile and data export for signed-in users", async ({ page, request }) => {
  const user = await registerUser(request, "account-page");

  await installSession(page, user);
  await page.goto("/account");

  await expect(page.getByRole("heading", { name: "账号中心" })).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByText("全部记录")).toBeVisible();
  await expect(page.getByRole("link", { name: /新增 JD 解析/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /新增简历匹配/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /查看历史记录/ })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出数据" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ai-job-copilot-data.json");
  await expect(page.getByText("数据导出已开始下载")).toBeVisible();

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const downloadBody = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  expect(downloadBody.account.email).toBe(user.email);
});

test("account deletion clears session and redirects to home", async ({ page, request }) => {
  const user = await registerUser(request, "delete-acct");

  await installSession(page, user);
  await page.goto("/account");

  await expect(page.getByRole("button", { name: "确认注销" })).toBeDisabled();
  await page.getByPlaceholder("输入 DELETE 确认").fill("DELETE");
  await page.getByRole("button", { name: "确认注销" }).click();
  await expect(page).toHaveURL(/\/$/);
  const token = await page.evaluate(() => window.localStorage.getItem("auth_token"));
  expect(token).toBeNull();

  // Deleted account token is invalidated
  const meResp = await request.get(`/api/auth/me`, {
    headers: { Authorization: `Bearer ${user.token}` },
  });
  expect(meResp.status()).toBe(401);
});

test("account page redirects anonymous users to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/auth\?next=%2Faccount$/);
});
