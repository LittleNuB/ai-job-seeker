import { expect, test } from "@playwright/test";

test("home and auth pages render readable Chinese copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI Job Copilot" })).toBeVisible();
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "岗位探索" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "JD 解析" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "简历匹配" })).toBeVisible();
  await expect(page.getByRole("link", { name: "隐私政策" })).toBeVisible();
  await expect(page.getByRole("link", { name: "用户协议" })).toBeVisible();

  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  await expect(page.getByLabel("邮箱")).toBeVisible();
  await expect(page.getByLabel("密码")).toBeVisible();
});

test("legal pages disclose privacy, terms, and third-party AI processing", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "隐私政策" })).toBeVisible();
  await expect(page.getByText("第三方 AI 处理告知")).toBeVisible();
  await expect(page.getByText("你可以在账号中心导出当前账号下的个人数据")).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "用户协议" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 输出限制" })).toBeVisible();
  await expect(page.getByText("它不是招聘承诺、职业保证、法律意见或就业中介服务")).toBeVisible();
});

test("explore page loads position data", async ({ page }) => {
  await page.goto("/explore");

  await expect(page.getByRole("button", { name: /算法方向/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /AutoML工程师/ })).toBeVisible();
  await expect(page.getByText("暂无岗位数据")).toHaveCount(0);
});
