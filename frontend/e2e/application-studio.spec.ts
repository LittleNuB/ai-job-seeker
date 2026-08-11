import { expect, test, type Page, type Route } from "@playwright/test";

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

const snapshot = {
  snapshot_version: 1,
  application_id: "application-1",
  workflow_phase: "source_review",
  target_application: { target_role: "AI 产品经理", jd_text: concreteJd },
  resume_source: { text: resumeText, scope: "application_local" },
  experience_entries: [
    {
      id: "entry-1",
      organization: "知音科技",
      role: "AI 产品实习生",
      date_range: "2025.01-2025.06",
      experience_items: [
        {
          id: "item-1",
          title: "智能客服评测体系",
          entry_id: "entry-1",
          source_scope: "application_local",
          base_facts: [
            {
              id: "fact-1",
              text: "负责整理 120 条高频失败案例，定义三类评测维度。",
              source_location: "resume:line:4",
            },
          ],
        },
      ],
    },
  ],
  standalone_experience_items: [
    {
      id: "item-2",
      title: "AI Job Copilot",
      entry_id: null,
      source_scope: "application_local",
      base_facts: [
        {
          id: "fact-2",
          text: "独立设计面向具体 JD 的求职准备工作流。",
          source_location: "resume:line:9",
        },
      ],
    },
  ],
  role_signals: [],
  achievement_leads: [],
  source_snapshots: [],
  competitive_claims: [],
  source_change_notices: [],
  targeted_resume_version: { resume_claims: [] },
  interview_rehearsal: null,
  created_at: "2026-08-11T12:00:00Z",
  updated_at: "2026-08-11T12:00:00Z",
};

async function installSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("auth_token", "e2e-token");
    window.localStorage.setItem("auth_email", "candidate@example.com");
  });
}

async function applicationApi(route: Route) {
  const url = new URL(route.request().url());
  const method = route.request().method();

  if (url.pathname === "/api/applications/commands" && method === "POST") {
    await route.fulfill({ json: snapshot });
    return;
  }
  if (url.pathname === "/api/applications/application-1" && method === "GET") {
    await route.fulfill({ json: snapshot });
    return;
  }
  if (url.pathname === "/api/applications" && method === "GET") {
    await route.fulfill({
      json: {
        items: [
          {
            application_id: "application-1",
            target_role: "AI 产品经理",
            workflow_phase: "source_review",
            experience_item_count: 2,
            updated_at: "2026-08-11T12:00:00Z",
          },
        ],
      },
    });
    return;
  }
  await route.fallback();
}

test("candidate creates, leaves, and reopens a Target Application", async ({ page }) => {
  await installSession(page);
  await page.route("**/api/applications**", applicationApi);

  await page.goto("/applications");
  await page.getByLabel("目标岗位").fill("AI 产品经理");
  await page.getByLabel("具体 JD").fill(concreteJd);
  await page.getByLabel("简历内容").fill(resumeText);
  await page.getByRole("button", { name: "建立投递工作台" }).click();

  await expect(page).toHaveURL(/\/applications\/application-1$/);
  await expect(page.getByRole("heading", { name: "AI 产品经理" })).toBeVisible();
  await expect(page.getByText("智能客服评测体系")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI Job Copilot", exact: true })).toBeVisible();
  await expect(page.getByText("匹配分", { exact: false })).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("link", { name: /投递工作台/ }).first().click();
  await expect(page).toHaveURL(/\/applications$/);
  await page.getByRole("link", { name: "继续准备" }).click();

  await expect(page).toHaveURL(/\/applications\/application-1$/);
  await expect(page.getByText("已保存，可随时回来继续")).toBeVisible();
  await expect(page.getByText("段可用经历")).toBeVisible();
});
