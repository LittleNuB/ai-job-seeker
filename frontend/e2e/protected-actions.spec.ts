import { expect, test } from "@playwright/test";

test("unauthenticated JD analysis redirects through login", async ({ page }) => {
  await page.goto("/jd");
  await page.getByPlaceholder("将 JD 内容粘贴到这里...").fill("招聘大模型应用工程师，负责 RAG 和 Agent 开发。");
  await page.getByRole("button", { name: "开始深度解析" }).click();

  await expect(page).toHaveURL(/\/auth\?next=%2Fjd$/);
});

test("unauthenticated resume matching redirects through login", async ({ page }) => {
  await page.goto("/match");
  await page.getByPlaceholder("粘贴你的简历内容...").fill("Python 后端工程师，熟悉 LLM 应用开发。");
  const positionSelect = page.locator("select");
  await positionSelect.click();
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 1);
  await positionSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: "开始匹配分析" }).click();

  await expect(page).toHaveURL(/\/auth\?next=%2Fmatch$/);
});

test("unauthenticated AI follow-up redirects through login", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "AI 追问" }).click();

  await expect(page).toHaveURL(/\/auth\?next=%2Fexplore$/);
});
