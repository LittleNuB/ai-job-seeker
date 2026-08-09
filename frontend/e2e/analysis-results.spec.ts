import { expect, test, type Page } from "@playwright/test";

async function installMockSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("auth_token", "e2e-token");
    window.localStorage.setItem("auth_email", "e2e@example.com");
  });
}

test("JD page renders analysis result and downloads report", async ({ page }) => {
  await installMockSession(page);

  await page.route("**/api/jd/analyze", async (route) => {
    await route.fulfill({
      json: {
        record_id: "jd-record-1",
        result: {
          position_overview: {
            inferred_role: "大模型应用工程师",
            seniority_level: "中级",
            company_type_hint: "AI 产品团队",
          },
          surface_requirements: {
            hard_skills: ["RAG", "Agent", "Python"],
            soft_skills: ["跨团队协作"],
            experience: ["LLM 应用落地经验"],
            education: ["本科及以上"],
          },
          hidden_needs: {
            team_context: "团队正在从原型验证转向稳定交付。",
            real_priorities: ["能把模型能力产品化", "能处理线上质量问题"],
            culture_signals: ["结果导向", "主动沟通"],
            why_this_role: "补齐 AI 应用工程化能力。",
          },
          interview_focus: {
            likely_topics: [
              {
                topic: "RAG 质量优化",
                depth: "深入",
                preparation: "准备召回、重排、评估案例。",
              },
            ],
            red_flags: ["缺少线上排障经验"],
            standout_angles: ["展示端到端 Agent 项目"],
          },
        },
      },
    });
  });

  await page.route("**/api/export/jd-record-1", async (route) => {
    await route.fulfill({
      headers: { "content-type": "text/markdown; charset=utf-8" },
      body: "# JD Report\n\n大模型应用工程师",
    });
  });

  await page.goto("/jd");
  await page.getByPlaceholder("将 JD 内容粘贴到这里...").fill("招聘大模型应用工程师，负责 RAG 和 Agent 开发。");
  await page.getByRole("button", { name: "开始深度解析" }).click();

  await expect(page.getByText("岗位概览")).toBeVisible();
  await expect(page.getByText("大模型应用工程师", { exact: true })).toBeVisible();
  await expect(page.getByText("RAG", { exact: true })).toBeVisible();
  await expect(page.getByText("团队正在从原型验证转向稳定交付。")).toBeVisible();
  await expect(page.getByText("RAG 质量优化")).toBeVisible();
  await expect(page.getByRole("button", { name: /用此 JD 匹配简历/ })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /导出报告/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("analysis-jd-record-1.md");
});

test("match page renders analysis result and downloads report", async ({ page }) => {
  await installMockSession(page);

  await page.route("**/api/positions", async (route) => {
    await route.fulfill({
      json: [{ id: "position-1", name: "大模型应用工程师" }],
    });
  });

  await page.route("**/api/match/analyze", async (route) => {
    await route.fulfill({
      json: {
        record_id: "match-record-1",
        match_score: 91,
        result: {
          score_breakdown: {
            hard_skills_match: 92,
            experience_match: 88,
            culture_fit: 90,
            growth_potential: 94,
          },
          core_advantages: [
            {
              advantage: "LLM 工程经验扎实",
              evidence: "有 RAG、Agent 和后端服务交付经历。",
            },
          ],
          capability_gaps: [
            {
              gap: "缺少大规模评估体系经验",
              severity: "中",
              mitigation: "补充离线评测和线上监控案例。",
            },
          ],
          improvement_plan: {
            immediate: ["整理一个 RAG 质量优化案例"],
            short_term: ["补齐模型评估指标体系"],
            medium_term: ["沉淀端到端 AI 应用架构经验"],
          },
        },
      },
    });
  });

  await page.route("**/api/export/match-record-1", async (route) => {
    await route.fulfill({
      headers: { "content-type": "text/markdown; charset=utf-8" },
      body: "# Match Report\n\n91",
    });
  });

  await page.goto("/match");
  await page.getByPlaceholder("粘贴你的简历内容...").fill("Python 后端工程师，熟悉 RAG、Agent 和 LLM 应用开发。");
  const positionSelect = page.locator("select");
  await positionSelect.click();
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 1);
  await positionSelect.selectOption("position-1");
  await page.getByRole("button", { name: "开始匹配分析" }).click();

  await expect(page.locator(".text-3xl").filter({ hasText: "91" })).toBeVisible();
  await expect(page.getByText("硬技能")).toBeVisible();
  await expect(page.getByText("核心优势")).toBeVisible();
  await expect(page.getByText("LLM 工程经验扎实")).toBeVisible();
  await expect(page.getByText("能力差距")).toBeVisible();
  await expect(page.getByText("缺少大规模评估体系经验")).toBeVisible();
  await expect(page.getByText("提升计划")).toBeVisible();
  await expect(page.getByText("整理一个 RAG 质量优化案例")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /导出匹配报告/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("analysis-match-record-1.md");
});
