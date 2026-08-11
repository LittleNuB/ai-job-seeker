import { expect, test, type Page } from "@playwright/test";
import { apiPath, registerUser, type E2EUser } from "./support/auth";

const concreteJd = `AI 产品经理（智能应用方向）
岗位职责
1. 负责 AI 产品规划、需求分析和版本迭代，与算法及工程团队完成大模型工作流设计。
2. 建立质量评测和异常处理机制，结合用户反馈持续优化核心体验并推动稳定交付。
任职要求
1. 具备 AI 产品或大模型应用项目经验，熟悉 Prompt、RAG 或 Agent 常见方案。
2. 具备跨团队沟通、项目推进和结构化表达能力，能够说明个人判断、取舍和结果。`;

const resumeText = `工作经历
知音科技｜AI 产品实习生｜2025.01-2025.06
智能客服评测体系
- 负责整理 120 条高频失败案例，定义三类评测维度。
- 协同算法与运营完成两轮提示词迭代。

项目经历
AI Job Copilot
- 独立设计面向具体 JD 的求职准备工作流。`;

async function installSession(page: Page, user: E2EUser) {
  await page.goto("/");
  await page.evaluate(({ token, email }) => {
    window.localStorage.setItem("auth_token", token);
    window.localStorage.setItem("auth_email", email);
  }, user);
}

test("candidate creates, leaves, and reopens a Target Application", async ({ page, request }) => {
  const user = await registerUser(request, "application-studio");
  await installSession(page, user);

  await page.goto("/applications");
  await page.getByLabel("目标岗位").fill("AI 产品经理");
  await page.getByLabel("具体 JD").fill(concreteJd);
  await page.getByLabel("简历内容").fill(resumeText);
  await page.getByRole("button", { name: "建立投递工作台" }).click();

  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "AI 产品经理" })).toBeVisible();
  await expect(page.getByText("智能客服评测体系")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI Job Copilot", exact: true })).toBeVisible();
  await expect(page.getByText("匹配分", { exact: false })).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("link", { name: /投递工作台/ }).first().click();
  await expect(page).toHaveURL(/\/applications$/);
  await page.getByRole("link", { name: "继续准备" }).click();

  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);
  await expect(page.getByText("已保存，可随时回来继续")).toBeVisible();
  await expect(page.getByText("段可用经历")).toBeVisible();
});

test("unauthenticated candidate is sent to login before opening the workspace", async ({ page }) => {
  await page.goto("/applications");
  await expect(page).toHaveURL(/\/auth\?next=%2Fapplications$/);
});

test("candidate can inspect explicit and interpreted Role Signal provenance", async ({ page, request }) => {
  const user = await registerUser(request, "role-signals");
  const createResponse = await request.post(apiPath("/api/applications/commands"), {
    headers: { Authorization: `Bearer ${user.token}` },
    data: {
      type: "start_application",
      target_role: "AI 产品经理",
      jd_text: concreteJd,
      resume_text: resumeText,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();

  await installSession(page, user);
  await page.goto(`/applications/${created.application_id}`);
  await page.route(`**/api/applications/${created.application_id}/commands`, async (route) => {
    const command = route.request().postDataJSON();
    if (command?.type !== "analyze_target") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...created,
        workflow_phase: "role_signal_review",
        role_signals: [
          {
            id: "signal-explicit",
            signal: "大模型工作流与质量评测设计",
            source_type: "explicit",
            jd_excerpt: "设计大模型工作流、质量评测方案及异常处理机制",
            rationale: null,
          },
          {
            id: "signal-interpretation",
            signal: "从验证走向稳定交付的推进能力",
            source_type: "interpretation",
            jd_excerpt: null,
            rationale: "JD 同时强调持续优化核心体验和推动产品稳定交付。",
          },
        ],
        target_analysis: { status: "completed", last_error: null },
        prompt_runs: [
          {
            id: "prompt-run-1",
            prompt_family: "target_analysis",
            prompt_version: "target-analysis-v1",
            model_provider: "deterministic-fake",
            model_name: "target-analysis-fixture-v1",
            status: "completed",
            error_code: null,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await page.getByRole("button", { name: "提取岗位信号" }).click();

  await expect(page.getByRole("heading", { name: "大模型工作流与质量评测设计" })).toBeVisible();
  await expect(page.getByText("JD 原文", { exact: true })).toBeVisible();
  await expect(page.getByText("设计大模型工作流、质量评测方案及异常处理机制")).toBeVisible();
  await expect(page.getByRole("heading", { name: "从验证走向稳定交付的推进能力" })).toBeVisible();
  await expect(page.getByText("AI 解读", { exact: true })).toBeVisible();
  await expect(page.getByText("不代表招聘方确定结论", { exact: false })).toBeVisible();
  await expect(page.getByText("匹配分", { exact: false })).toHaveCount(0);
});
