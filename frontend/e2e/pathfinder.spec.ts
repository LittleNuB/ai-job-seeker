import { expect, test, type Page } from "@playwright/test";

const apiRecordId = "api-record-1";
const currentTrialPackageId = "p1a-opendocuments-engineering-kb";
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
  "user_trial_contribution",
  "forbidden_claims",
  "six_question_answers",
  "disclaimer",
];

const profile = {
  displayName: "tester",
  professionalBackground: "机械工程背景，做过设备资料整理和项目协作。",
  jobTarget: "希望试航行业 AI 应用产品助理方向。",
  timeline: "计划 3 个月内完成作品集并开始投递。",
  projectExperience: "做过工艺文档整理、跨团队需求沟通和报告撰写。",
  aiToolExperience: "使用 AI 辅助整理资料和草拟提纲，最终人工核验。",
  technicalBasics: "了解基础 Python、数据清洗、文档系统和 RAG 概念。",
  currentConfusion: "不确定如何把行业经验转成 AI 产品证据。",
  constraints: "不能使用真实企业内部资料，只能用脱敏或公开样例。",
};

const answers = [
  "OpenDocuments 主要解决企业资料分散、检索成本高、问答缺少来源依据的问题。",
  "它能帮助我理解 AI 知识库、文档问答和行业 AI 产品助理的需求拆解任务。",
  "放到工程企业场景中还需要权限、脱敏、术语表、引用核验和人工复核节点。",
  "我会设计一个 2 周试点，先限定资料范围，再整理问题、导入资料、测试问答并记录风险。",
  "作品集会包含背景、目标用户、MVP 范围、流程图、指标表、风险清单和边界说明。",
  "AI 用于辅助整理公开信息和草拟结构，最终内容由我筛选、核验和改写。",
];

interface ApiRequestLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function mockPathfinderApi(page: Page, requests: ApiRequestLog[]) {
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

async function fillProfile(page: Page) {
  await page.getByLabel("姓名或称呼（可选）").fill(profile.displayName);
  await page.getByLabel("专业 / 背景").fill(profile.professionalBackground);
  await page.getByLabel("求职目标").fill(profile.jobTarget);
  await page.getByLabel("求职时间线").fill(profile.timeline);
  await page.getByLabel("工程 / 行业经历").fill(profile.projectExperience);
  await page.getByLabel("AI 工具经历").fill(profile.aiToolExperience);
  await page.getByLabel("技术基础").fill(profile.technicalBasics);
  await page.getByLabel("当前困惑").fill(profile.currentConfusion);
  await page.getByLabel("限制条件").fill(profile.constraints);
}

async function fillAnswers(page: Page, values = answers) {
  const textareas = page.locator("textarea");
  for (let index = 0; index < values.length; index += 1) {
    await textareas.nth(index).fill(values[index]);
  }
}

test("guards recommendation when real background is missing", async ({ page }) => {
  await page.goto("/pathfinder/recommendation");

  await expect(page.getByRole("heading", { name: "需要先补充真实背景" })).toBeVisible();
  await expect(page.getByText("缺少背景时不会展示伪造的用户证据链")).toBeVisible();
});

test("runs P1-A real input pathfinder loop and exports markdown", async ({ page }) => {
  await page.goto("/pathfinder");
  await expect(page.getByRole("heading", { name: "寻径星图：OpenDocuments 固定试航" })).toBeVisible();
  await expect(page.getByText("实岗试航 · 作品集起点")).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Job Copilot" })).toHaveCount(0);
  await expect(page.getByText("这不是履历美化工具，也不做岗位背书、企业侧动作或求职结果判断")).toBeVisible();
  await expect(page.getByText("小 C")).toHaveCount(0);

  await page.getByRole("link", { name: "填写背景" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/background$/);
  await expect(page.getByRole("heading", { name: "真实用户背景输入" })).toBeVisible();
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByRole("heading", { name: "tester的 AI 转岗试航星图" })).toBeVisible();
  await expect(page.getByText("fallback_mock")).toBeVisible();
  await expect(page.getByText("UserProfileSignal")).toBeVisible();
  await expect(page.getByText(profile.professionalBackground).first()).toBeVisible();
  await expect(page.getByText("行业 AI 应用产品助理").first()).toBeVisible();
  await expect(page.getByText("行业 AI 解决方案助理").first()).toBeVisible();
  await expect(page.getByText("AI 数据评测助理").first()).toBeVisible();
  await expect(page.getByText("算法工程 / 大模型研发").first()).toBeVisible();
  await expect(page.getByText("OpenDocuments approved")).toBeVisible();

  await page.getByRole("button", { name: /生成 TrialPackageCandidate/ }).click();
  await expect(page).toHaveURL(/\/pathfinder\/trial$/);
  await expect(page.getByRole("heading", { name: "OpenDocuments 6 问试航" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenDocuments 来源参照" })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(6);
  await expect(page.locator("textarea").first()).toHaveValue("");
  await expect(page.getByRole("button", { name: "进入结果页" })).toBeDisabled();

  await fillAnswers(page);
  await expect(page.getByText("完整可导出").first()).toBeVisible();
  await page.getByRole("link", { name: "进入结果页" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/result$/);
  await expect(page.locator("p").filter({ hasText: "样例 JD + tester背景 + OpenDocuments 公开来源 -> 6 问试航 -> 航迹表 / 作品集草稿 / Markdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "反包装检查摘要" })).toBeVisible();
  await expect(page.getByText("完整档案已就绪")).toBeVisible();
  await expect(page.getByText("不可声称：用户开发了 OpenDocuments").first()).toBeVisible();

  const markdownPreview = page.locator("textarea").last();
  await expect(markdownPreview).toHaveValue(/## 用户试航产出/);
  await expect(markdownPreview).toHaveValue(/## 6 问作答/);
  await expect(markdownPreview).not.toHaveValue(/小 C/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pathfinder-tester-opendocuments.md");
  await expect(page.getByText("Markdown 已开始下载。")).toBeVisible();
});

test("does not generate full markdown when trial answers are incomplete", async ({ page }) => {
  await page.addInitScript((profilePayload) => {
    window.sessionStorage.setItem(
      "pathfinder-p1-a-state",
      JSON.stringify({
        profileSubmitted: true,
        trailRecord: {
          schemaVersion: "p1-a.v1",
          trialPackageId: currentTrialPackageId,
          trialPackageVersion: "1.0.0",
          status: "draft",
          userProfileSnapshot: profilePayload,
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
          trialAnswers: [],
        },
      }),
    );
  }, profile);

  await page.goto("/pathfinder/result");

  await expect(page.getByText("6 问尚未完成")).toBeVisible();
  await expect(
    page
      .getByText("还有试航问题未完成。缺项会使结果页缺少对应追溯链")
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("blocks full markdown export when AI usage explanation is missing", async ({ page }) => {
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();
  await page.goto("/pathfinder/trial");
  await fillAnswers(page, [...answers.slice(0, 5), ""]);

  await expect(page.getByText("6 问缺项").first()).toBeVisible();
  await expect(page.getByText("未完成：AI 使用说明。")).toBeVisible();
  await expect(page.getByRole("button", { name: "进入结果页" })).toBeDisabled();

  await page.goto("/pathfinder/result");
  await expect(page.getByText("6 问尚未完成")).toBeVisible();
  await expect(page.getByText("缺少：AI 使用说明。")).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("syncs TrailRecord answers and markdown snapshot to P1-A records API", async ({ page }) => {
  const apiRequests: ApiRequestLog[] = [];
  await mockPathfinderApi(page, apiRequests);

  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();

  await expect
    .poll(() =>
      apiRequests.some(
        (request) =>
          request.method === "POST" &&
          request.url.endsWith("/api/pathfinder/records") &&
          request.body.schemaVersion === "p1-a.v1" &&
          request.body.trialPackageId === currentTrialPackageId &&
          (request.body.userProfileSnapshot as typeof profile).displayName === "tester",
      ),
    )
    .toBe(true);

  await page.goto("/pathfinder/trial");
  await fillAnswers(page);

  await expect
    .poll(() =>
      apiRequests.some((request) => {
        const requestAnswers = request.body.trialAnswers as
          | Array<{ id: string; answer: string }>
          | undefined;
        return (
          request.method === "PATCH" &&
          request.url.endsWith(`/${apiRecordId}/trial-answers`) &&
          requestAnswers?.length === 6 &&
          requiredApiQuestionIds.every((id) =>
            requestAnswers.some((answer) => answer.id === id),
          ) &&
          requestAnswers.every((answer) => answer.answer.trim())
        );
      }),
    )
    .toBe(true);

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
});

test("blocks full markdown export when anti-packaging check finds risky answer", async ({ page }) => {
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();
  await page.goto("/pathfinder/trial");
  await fillAnswers(page);
  await page.locator("textarea").nth(4).fill("我开发了 OpenDocuments，并完成了企业级 RAG 系统。");
  await expect(page.getByText("反包装阻断").first()).toBeVisible();

  await page.goto("/pathfinder/result");
  await expect(page.getByRole("heading", { name: "反包装检查摘要" })).toBeVisible();
  await expect(page.getByText("反包装检查命中阻断项，可保存草稿快照，但不能导出完整 Markdown。")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("keeps trial page within 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();
  await page.goto("/pathfinder/trial");

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
