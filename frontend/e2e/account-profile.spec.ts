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

test("account page renders profile and data summary for signed-in users", async ({ page, request }) => {
  const user = await registerUser(request, "account-page");

  await installSession(page, user);
  await page.route("**/api/auth/profile", async (route) => {
    await route.fulfill({
      json: {
        user_id: user.userId,
        email: user.email,
        name: "E2E User",
        created_at: new Date().toISOString(),
        stats: {
          total_records: 3,
          jd_records: 1,
          match_records: 1,
          chat_conversations: 1,
        },
      },
    });
  });
  await page.route("**/api/auth/export-data", async (route) => {
    await route.fulfill({
      headers: {
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="ai-job-copilot-data-test.json"',
      },
      body: JSON.stringify({
        account: { user_id: user.userId, email: user.email, name: "E2E User" },
        analysis_records: [],
        chat_conversations: [],
      }),
    });
  });
  await page.route("**/api/auth/account", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/account");

  await expect(page.getByRole("heading", { name: "账号中心" })).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByText("全部记录")).toBeVisible();
  await expect(page.locator(".text-2xl").filter({ hasText: "3" })).toBeVisible();
  await expect(page.getByRole("link", { name: /新增 JD 解析/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /新增简历匹配/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /查看历史记录/ })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出数据" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ai-job-copilot-data.json");
  await expect(page.getByText("数据导出已开始下载")).toBeVisible();

  await expect(page.getByRole("button", { name: "确认注销" })).toBeDisabled();
  await page.getByPlaceholder("输入 DELETE 确认").fill("DELETE");
  await page.getByRole("button", { name: "确认注销" }).click();
  await expect(page).toHaveURL(/\/$/);
  const token = await page.evaluate(() => window.localStorage.getItem("auth_token"));
  expect(token).toBeNull();
});

test("account page redirects anonymous users to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/auth\?next=%2Faccount$/);
});
