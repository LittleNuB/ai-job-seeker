import { expect, test, type Page } from "@playwright/test";

const apiRecordId = "api-record-1";
const requiredApiQuestionIds = [
  "project_understanding",
  "role_connection",
  "scenario_gap",
  "application_solution",
  "portfolio_extension",
  "ai_usage_explanation",
];
const requiredMarkdownSections = [
  "candidate_background",
  "path_conclusion",
  "sample_jd_note",
  "opendocuments_source_license",
  "opendocuments_original_capabilities",
  "xiaoc_trial_contribution",
  "forbidden_claims",
  "six_question_answers",
  "disclaimer",
];

interface ApiRequestLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function mockPathfinderApi(
  page: Page,
  requests: ApiRequestLog[],
) {
  await page.route("**/api/pathfinder/records", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body,
    });

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1-a.v1",
        recordId: apiRecordId,
        trialPackageId: body.trialPackageId,
        trialPackageVersion: body.trialPackageVersion,
        status: "draft",
        userProfileSnapshot: body.userProfileSnapshot,
        selectedPathId: body.selectedPathId,
        trialAnswers: requiredApiQuestionIds.map((id) => ({
          id,
          answer: "",
          status: "empty",
        })),
        antiPackagingCheck: {
          rulesVersion: "p1-a.frontend-rules.v1",
          status: "not_run",
          exportAllowed: false,
          findings: [],
          requiredMarkdownSections: Object.fromEntries(
            requiredMarkdownSections.map((section) => [section, false]),
          ),
          blockingCount: 0,
          warningCount: 0,
        },
        createdAt: "2026-06-04T00:00:00Z",
        updatedAt: "2026-06-04T00:00:00Z",
      }),
    });
  });

  await page.route(
    `**/api/pathfinder/records/${apiRecordId}/trial-answers`,
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as {
        trialAnswers: Array<{ id: string; answer: string }>;
      };
      requests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body: body as unknown as Record<string, unknown>,
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          recordId: apiRecordId,
          status: body.trialAnswers.every((answer) => answer.answer.trim())
            ? "ready_to_export"
            : "answers_incomplete",
          trialAnswers: body.trialAnswers,
          updatedAt: "2026-06-04T00:00:01Z",
        }),
      });
    },
  );

  await page.route(
    `**/api/pathfinder/records/${apiRecordId}/result`,
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as Record<string, unknown>;
      requests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body,
      });

      const snapshot = body.markdownSnapshot as
        | { exportScope?: string }
        | undefined;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          recordId: apiRecordId,
          status: snapshot?.exportScope === "full" ? "exported" : body.status,
          markdownSnapshotSaved: Boolean(snapshot),
          updatedAt: "2026-06-04T00:00:02Z",
        }),
      });
    },
  );
}

async function mockPathfinderRecordGet(
  page: Page,
  requests: ApiRequestLog[],
) {
  await page.route(
    "**/api/pathfinder/records/remote-record-1",
    async (route) => {
      const request = route.request();
      requests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        body: {},
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "p1-a.v1",
          recordId: "remote-record-1",
          trialPackageId: "p0-xiaoc-opendocuments",
          trialPackageVersion: "1.0.0",
          status: "ready_to_export",
          userProfileSnapshot: {},
          selectedPathId: "industry-ai-product-assistant",
          trialAnswers: requiredApiQuestionIds.map((id) => ({
            id,
            answer:
              id === "ai_usage_explanation"
                ? "后端恢复的 AI 使用说明：AI 只辅助整理，最终由人工筛选和改写。"
                : `后端恢复的 ${id} 作答。`,
            status: "complete",
          })),
          antiPackagingCheck: {
            rulesVersion: "p1-a.frontend-rules.v1",
            status: "passed",
            exportAllowed: true,
            findings: [],
            requiredMarkdownSections: Object.fromEntries(
              requiredMarkdownSections.map((section) => [section, true]),
            ),
            blockingCount: 0,
            warningCount: 0,
          },
          createdAt: "2026-06-04T00:00:00Z",
          updatedAt: "2026-06-04T00:00:03Z",
        }),
      });
    },
  );
}

test("guards recommendation when trial materials are not loaded", async ({ page }) => {
  await page.goto("/pathfinder/recommendation");

  await expect(page.getByRole("heading", { name: "需要先加载小 C 背景和样例 JD" })).toBeVisible();
  await expect(page.getByText("载入背景、样例 JD 和开源来源后")).toBeVisible();
});

test("runs static P0 pathfinder loop and exports markdown", async ({ page }) => {
  await page.goto("/pathfinder");
  await expect(page.getByRole("heading", { name: "寻径星图：小 C 的工程企业知识库 AI 助手试航" })).toBeVisible();
  await expect(page.getByText("实岗试航 · 作品集起点")).toBeVisible();
  await expect(page.getByRole("link", { name: "寻径星图" })).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Job Copilot" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "岗位雷达" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "岗位探索" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "JD 解析" })).toHaveCount(0);
  await expect(page.getByText("AI Job Copilot 试用版")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "隐私政策" })).toHaveCount(0);
  await expect(page.getByText("这不是简历包装工具，也不做能力认证、企业推荐或录用预测")).toBeVisible();

  await page.getByRole("link", { name: "开始小 C 试航" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/background$/);
  await expect(page.getByRole("heading", { name: "小 C 背景与 3 条样例 JD" })).toBeVisible();
  await expect(page.getByText("基础 Python / 数据处理", { exact: true })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);

  await page.getByRole("link", { name: "查看星图推荐" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByRole("heading", { name: "小 C 的 AI 转岗试航星图" })).toBeVisible();
  await expect(page.getByText("小 C 优先试航“行业 AI 应用产品助理”。这一路径能同时连接样例 JD 任务、小 C 工程背景和 OpenDocuments 的企业知识库问答场景。").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "行业 AI 应用产品助理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "行业 AI 解决方案助理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "算法工程 / 大模型研发" })).toBeVisible();
  await expect(page.getByText("JD 证据")).toHaveCount(3);
  await expect(page.getByText("小 C 背景证据")).toHaveCount(3);
  await expect(page.getByText("OpenDocuments 证据")).toHaveCount(3);
  await expect(page.getByText("风险证据")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "下一步试航" })).toHaveCount(3);
  await expect(page.getByRole("link", { name: "开始 OpenDocuments 试航" })).toHaveCount(1);

  await page.getByRole("link", { name: "开始 OpenDocuments 试航" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/trial$/);
  await expect(page.getByRole("heading", { name: "OpenDocuments 6 问试航" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenDocuments 来源参照" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "小 C 试航工单" })).toBeVisible();
  await expect(page.getByText("试航包 v1")).toBeVisible();
  await expect(page.getByText(/生成档案模块：.*OpenDocuments 来源说明/)).toBeVisible();
  await expect(page.getByText("请先补充“AI 使用说明”。这是反包装检查的必要项").first()).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(6);

  await page.getByRole("button", { name: "填入小 C 示例作答，可继续编辑" }).click();
  await expect(page.locator("textarea").first()).toHaveValue(/OpenDocuments 主要解决企业资料分散/);
  await expect(page.getByText("完整可导出").first()).toBeVisible();
  await page.getByRole("link", { name: "进入结果页" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/result$/);
  await expect(page.locator("p").filter({ hasText: "样例 JD + 小 C 背景 + OpenDocuments 公开来源 -> 6 问试航 -> 航迹表 / 作品集草稿 / Markdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "反包装检查摘要" })).toBeVisible();
  await expect(page.getByText("完整档案已就绪")).toBeVisible();
  for (const heading of [
    "1. 航迹表摘要",
    "2. 作品集一页纸草稿",
    "3. 指标表",
    "4. 用户流程草图说明",
    "5. 风险清单",
    "6. 合规表达建议",
    "7. 面试追问准备",
    "8. Markdown 导出",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  const markdownPreview = page.locator("textarea").last();
  await expect(markdownPreview).toHaveValue(/## OpenDocuments 公开能力/);
  await expect(markdownPreview).toHaveValue(/## 6 问作答/);
  await expect(page.getByText("完整 Markdown 仅在 6 问全部完成后生成")).toBeVisible();
  await expect(page.getByText("不可声称：小 C 开发了 OpenDocuments").first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pathfinder-xiaoc-opendocuments.md");
  await expect(page.getByText("Markdown 已开始下载。")).toBeVisible();
});

test("does not generate full markdown when trial answers are incomplete", async ({ page }) => {
  await page.goto("/pathfinder/result");

  await expect(page.getByText("6 问尚未完成")).toBeVisible();
  await expect(page.getByText("还有试航问题未完成。缺项会使结果页缺少对应追溯链，暂不能导出完整 Markdown").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("blocks full markdown export when AI usage explanation is missing", async ({ page }) => {
  await page.goto("/pathfinder/trial");
  await page.getByRole("button", { name: "填入小 C 示例作答，可继续编辑" }).click();
  await page.locator("textarea").nth(5).fill("");

  await expect(page.getByText("6 问缺项").first()).toBeVisible();
  await expect(page.getByText("未完成：AI 使用说明。")).toBeVisible();
  await expect(page.getByRole("button", { name: "进入结果页" })).toBeDisabled();

  await page.goto("/pathfinder/result");

  await expect(page.getByText("6 问尚未完成")).toBeVisible();
  await expect(page.getByText("还有试航问题未完成。缺项会使结果页缺少对应追溯链，暂不能导出完整 Markdown").first()).toBeVisible();
  await expect(page.getByText("缺少：AI 使用说明。")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
  await expect(page.getByText("已保存快照")).toHaveCount(0);
  await expect(page.getByText("Markdown 已开始下载。")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("restores complete trial answers from session storage on direct result load", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "pathfinder-p1-a-state",
      JSON.stringify({
        demoLoaded: true,
        trailRecord: {
          schemaVersion: "p1-a.v1",
          trialPackageId: "p0-xiaoc-opendocuments",
          trialPackageVersion: "1.0.0",
          status: "ready_to_export",
          userProfileSnapshot: {},
          selectedPathId: "industry-ai-product-assistant",
          antiPackagingCheck: {
            rulesVersion: "p1-a.frontend-rules.v1",
            status: "passed",
            exportAllowed: true,
            findings: [],
            requiredMarkdownSections: {},
            blockingCount: 0,
            warningCount: 0,
          },
          trialAnswers: [
            { id: "project_understanding", answer: "OpenDocuments 主要解决企业资料分散和问答缺少来源依据的问题。", status: "complete" },
            { id: "role_connection", answer: "它能帮助理解 AI 知识库和 RAG 问答助手的产品任务。", status: "complete" },
            { id: "scenario_gap", answer: "工程企业还需要权限、脱敏、术语表和人工复核节点。", status: "complete" },
            { id: "application_solution", answer: "我会设计一个面向工程企业资料的 2 周试点 MVP。", status: "complete" },
            { id: "portfolio_extension", answer: "我会整理背景、目标用户、MVP 范围、指标表、风险清单和边界说明。", status: "complete" },
            { id: "ai_usage_explanation", answer: "AI 用于辅助整理和草拟，最终筛选和边界由我负责。", status: "complete" },
          ],
        },
      }),
    );
  });

  await page.goto("/pathfinder/result");

  await expect(page.getByText("6 问尚未完成")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeEnabled();
  await expect(page.locator("textarea").last()).toHaveValue(/## 6 问作答/);
});

test("restores legacy P0 trial answers from session storage", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "pathfinder-p0-state",
      JSON.stringify({
        demoLoaded: true,
        selectedPathId: "industry-ai-product-assistant",
        trialAnswers: {
          project_understanding: "OpenDocuments 主要解决企业资料分散和问答缺少来源依据的问题。",
          role_connection: "它能帮助理解 AI 知识库和 RAG 问答助手的产品任务。",
          scenario_gap: "工程企业还需要权限、脱敏、术语表和人工复核节点。",
          application_solution: "我会设计一个面向工程企业资料的 2 周试点 MVP。",
          portfolio_extension: "我会整理背景、目标用户、MVP 范围、指标表、风险清单和边界说明。",
          ai_usage_explanation: "AI 用于辅助整理和草拟，最终筛选和边界由我负责。",
        },
      }),
    );
  });

  await page.goto("/pathfinder/result");

  await expect(page.getByText("试航包 v1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeEnabled();
  await expect(page.locator("textarea").last()).toHaveValue(/## 6 问作答/);
});

test("shows backend sync local saving and failed states without blocking local draft", async ({ page }) => {
  const apiRequests: ApiRequestLog[] = [];
  await page.route("**/api/pathfinder/records", async (route) => {
    const request = route.request();
    apiRequests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postDataJSON() as Record<string, unknown>,
    });
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "sync failed" }),
    });
  });

  await page.goto("/pathfinder/trial");
  await expect(page.getByText("本地草稿").first()).toBeVisible();

  await page
    .getByRole("button", { name: "填入小 C 示例作答，可继续编辑" })
    .click();

  await expect(page.getByText("正在保存").first()).toBeVisible();
  await expect(
    page.getByText("保存失败，可继续本地试航").first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "进入结果页" })).toBeEnabled();
  expect(apiRequests.some((request) => request.method === "POST")).toBe(true);
});

test("syncs TrailRecord answers and markdown snapshot to P1-A records API", async ({ page }) => {
  const apiRequests: ApiRequestLog[] = [];
  await mockPathfinderApi(page, apiRequests);

  await page.goto("/pathfinder/trial");
  await page.getByRole("button", { name: "填入小 C 示例作答，可继续编辑" }).click();

  await expect
    .poll(() =>
      apiRequests.some(
        (request) =>
          request.method === "POST" &&
          request.url.endsWith("/api/pathfinder/records") &&
          request.body.schemaVersion === "p1-a.v1" &&
          request.body.trialPackageId === "p0-xiaoc-opendocuments",
      ),
    )
    .toBe(true);

  await expect
    .poll(() =>
      apiRequests.some((request) => {
        const answers = request.body.trialAnswers as
          | Array<{ id: string; answer: string }>
          | undefined;
        return (
          request.method === "PATCH" &&
          request.url.endsWith(`/${apiRecordId}/trial-answers`) &&
          answers?.length === 6 &&
          requiredApiQuestionIds.every((id) =>
            answers.some((answer) => answer.id === id),
          ) &&
          answers.every((answer) => answer.answer.trim())
        );
      }),
    )
    .toBe(true);

  await expect
    .poll(() =>
      apiRequests.some(
        (request) =>
          request.method === "PUT" &&
          request.url.endsWith(`/${apiRecordId}/result`) &&
          (request.body.antiPackagingCheck as { exportAllowed?: boolean })
            ?.exportAllowed === true,
      ),
    )
    .toBe(true);
  await expect(page.getByText("已保存").first()).toBeVisible();

  await page.getByRole("link", { name: "进入结果页" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  await downloadPromise;

  await expect
    .poll(() =>
      apiRequests.some((request) => {
        const snapshot = request.body.markdownSnapshot as
          | { templateSource?: string; exportScope?: string; content?: string }
          | undefined;
        return (
          request.method === "PUT" &&
          request.url.endsWith(`/${apiRecordId}/result`) &&
          snapshot?.templateSource === "frontend" &&
          snapshot.exportScope === "full" &&
          Boolean(snapshot.content?.includes("## 6 问作答"))
        );
      }),
    )
    .toBe(true);

  expect(
    apiRequests
      .filter((request) => request.url.includes("/api/pathfinder/records"))
      .every(
        (request) =>
          request.headers["x-user-id"] === "pathfinder-p1-a-demo-user",
      ),
  ).toBe(true);
});

test("restores TrailRecord from backend when session storage contains recordId", async ({ page }) => {
  const apiRequests: ApiRequestLog[] = [];
  await mockPathfinderRecordGet(page, apiRequests);
  await page.addInitScript((questionIds: string[]) => {
    window.sessionStorage.setItem(
      "pathfinder-p1-a-state",
      JSON.stringify({
        demoLoaded: true,
        trailRecord: {
          schemaVersion: "p1-a.v1",
          recordId: "remote-record-1",
          trialPackageId: "p0-xiaoc-opendocuments",
          trialPackageVersion: "1.0.0",
          status: "answers_incomplete",
          userProfileSnapshot: {},
          selectedPathId: "industry-ai-product-assistant",
          antiPackagingCheck: {
            rulesVersion: "p1-a.frontend-rules.v1",
            status: "not_run",
            exportAllowed: false,
            findings: [],
            requiredMarkdownSections: {},
            blockingCount: 0,
            warningCount: 0,
          },
          trialAnswers: questionIds.map((id) => ({
            id,
            answer: "",
            status: "empty",
          })),
        },
        backendSync: {
          status: "saved",
          lastSavedAt: "2026-06-04T00:00:00Z",
        },
      }),
    );
  }, requiredApiQuestionIds);

  await page.goto("/pathfinder/result");

  await expect
    .poll(() =>
      apiRequests.some(
        (request) =>
          request.method === "GET" &&
          request.url.endsWith("/api/pathfinder/records/remote-record-1"),
      ),
    )
    .toBe(true);
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeEnabled();
  await expect(page.getByText("已保存").first()).toBeVisible();
  await expect(page.locator("textarea").last()).toHaveValue(
    /后端恢复的 AI 使用说明/,
  );
});

test("blocks full markdown export when anti-packaging check finds risky answer", async ({ page }) => {
  await page.goto("/pathfinder/trial");
  await page.getByRole("button", { name: "填入小 C 示例作答，可继续编辑" }).click();
  await page.locator("textarea").nth(4).fill("我开发了 OpenDocuments，并完成了企业级 RAG 系统。");
  await expect(page.getByText("反包装检查命中阻断项")).toBeVisible();
  await page.getByRole("link", { name: "进入结果页" }).click();

  await expect(page.getByRole("heading", { name: "反包装检查摘要" })).toBeVisible();
  await expect(page.getByText("反包装检查命中阻断项，可保存草稿快照，但不能导出完整 Markdown。")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("keeps trial page within 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/pathfinder/trial");
  await page.getByRole("button", { name: "填入小 C 示例作答，可继续编辑" }).click();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
