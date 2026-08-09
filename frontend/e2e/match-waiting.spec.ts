import { expect, test } from "@playwright/test";

test("match page shows progress while analysis is pending and supports cancel", async ({ page }) => {
  await page.route("**/api/positions", async (route) => {
    await route.fulfill({
      json: [{ id: "position-1", name: "大模型应用工程师" }],
    });
  });

  await page.route("**/api/match/analyze", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route
      .fulfill({
        json: {
          record_id: "record-1",
          match_score: 82,
          result: { score_breakdown: { hard_skills_match: 82 } },
        },
      })
      .catch(() => undefined);
  });

  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("auth_token", "e2e-token");
    window.localStorage.setItem("auth_email", "e2e@example.com");
  });

  await page.goto("/match");
  await page.getByPlaceholder("粘贴你的简历内容...").fill("Python 后端工程师，熟悉 RAG 和 Agent 应用开发。");
  const positionSelect = page.locator("select");
  await positionSelect.click();
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 1);
  await positionSelect.selectOption("position-1");

  await page.getByRole("button", { name: "开始匹配分析" }).click();
  await expect(page.getByText("正在进行深度匹配分析")).toBeVisible();
  await expect(page.getByText(/已用时 \d+ 秒/)).toBeVisible();
  await expect(page.getByText("整理输入")).toBeVisible();

  await page.getByRole("button", { name: "取消分析" }).click();
  await expect(page.getByText("已取消本次匹配分析")).toBeVisible();
  await expect(page.getByText("正在进行深度匹配分析")).toHaveCount(0);
});

test("match page shows timeout failure and retries successfully", async ({ page }) => {
  let attempts = 0;

  await page.route("**/api/positions", async (route) => {
    await route.fulfill({
      json: [{ id: "position-1", name: "大模型应用工程师" }],
    });
  });

  await page.route("**/api/match/analyze", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 504,
        json: { detail: "模型服务响应超时，请稍后重试" },
      });
      return;
    }

    await route.fulfill({
      json: {
        record_id: "record-2",
        match_score: 86,
        result: {
          score_breakdown: {
            hard_skills_match: 86,
            experience_match: 82,
          },
        },
      },
    });
  });

  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("auth_token", "e2e-token");
    window.localStorage.setItem("auth_email", "e2e@example.com");
  });

  await page.goto("/match");
  await page.getByPlaceholder("粘贴你的简历内容...").fill("Python 后端工程师，熟悉 RAG 和 Agent 应用开发。");
  const positionSelect = page.locator("select");
  await positionSelect.click();
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 1);
  await positionSelect.selectOption("position-1");

  await page.getByRole("button", { name: "开始匹配分析" }).click();
  await expect(page.getByText("匹配分析超时")).toBeVisible();
  await expect(page.getByText("模型服务响应超时，请稍后重试")).toBeVisible();

  await page.getByRole("button", { name: "重新分析" }).click();
  await expect(page.getByText("匹配分析超时")).toHaveCount(0);
  await expect(page.locator(".text-3xl").filter({ hasText: "86" })).toBeVisible();
});
