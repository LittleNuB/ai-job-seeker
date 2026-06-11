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
const genericApiQuestionIds = [
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

function projectRecord(projectId: string, name: string, license = "MIT") {
  return {
    projectId,
    name,
    sourceUrl: `https://github.com/example/${projectId}`,
    officialUrl: `https://example.com/${projectId}`,
    host: "github",
    repositoryVisibility: "public",
    description: `${name} audited public project reference.`,
    license,
    licenseSpdxId: "MIT",
    licenseVerificationStatus: "verified",
    licenseVerifiedAt: "2026-06-11",
    referenceRole: "reference_only",
    status: "approved_for_trial_package",
    rolePathIds: ["industry-ai-product-assistant"],
    projectTags: ["support_assistant"],
    capabilityTags: ["scenario_mapping"],
    riskTags: ["attribution_risk"],
    publicCapabilities: ["workflow mapping", "knowledge base reference"],
    notClaimed: [`不声明用户参与 ${name} 原项目。`],
    forbiddenClaims: [`不得声明用户开发 ${name}。`],
    allowedContexts: [`基于 ${name} 公开信息做试航拆解。`],
    sourceBoundary:
      projectId === "chatwoot"
        ? "已审计项目库 / 当前样本参考；Chatwoot enterprise 目录有单独 License 边界。"
        : "已审计项目库 / 当前样本参考。",
  };
}

async function mockRecommendationAndProjectApi(
  page: Page,
  requests: ApiRequestLog[],
) {
  const projects = [
    projectRecord("opendocuments", "OpenDocuments"),
    projectRecord(
      "chatwoot",
      "Chatwoot",
      "MIT Expat outside enterprise directory; enterprise directory has separate license",
    ),
  ];

  await page.route("**/api/pathfinder/projects?status=approved_for_trial_package", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1b.v1",
        projects,
        dataBoundary: "已审计项目库；仅作公开来源参考。",
      }),
    });
  });

  await page.route("**/api/pathfinder/recommendations", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1b.v1",
        recommendationRun: {
          recommendationRunId: "p1b-rec-e2e",
          schemaVersion: "p1b.v1",
          createdAt: "2026-06-11T00:00:00Z",
          ruleVersion: {
            version: "p1b.e2e",
            effectiveAt: "2026-06-11T00:00:00Z",
            rolePathTaxonomyVersion: "p1b",
            projectLibraryVersion: "p1c-audited-project-library.v1",
            antiPackagingRuleVersion: "p1-a.frontend-rules.v1",
            notes: [],
          },
          userProfileSnapshot: body.userProfile,
          profileSignals: [
            {
              signalId: "signal-e2e",
              category: "project_experience",
              label: "用户确认经历",
              sourceField: "interview",
              evidenceText: "有客服知识库整理和流程拆解经历。",
              confidence: "medium",
            },
          ],
          paths: [
            {
              pathId: "industry-ai-product-assistant",
              title: "行业 AI 应用产品助理",
              decision: "priority_trial",
              rationale: "可围绕用户确认信号做试航。",
              evidence: [],
              riskNotes: ["不得声明参与原项目。"],
              suggestedProjectTypes: ["knowledge_base"],
              nextTrialAction: "选择已审计项目生成试航包。",
            },
          ],
          projectMatches: [
            {
              projectId: "opendocuments",
              rolePathId: "industry-ai-product-assistant",
              decision: "matched_for_trial",
              matchedRules: ["audited_reference"],
              evidence: [],
              boundaryNotes: ["仅作公开参考。"],
            },
            {
              projectId: "chatwoot",
              rolePathId: "industry-ai-product-assistant",
              decision: "matched_for_trial",
              matchedRules: ["audited_reference"],
              evidence: [],
              boundaryNotes: [
                "MIT Expat outside enterprise directory; enterprise directory has separate license",
              ],
            },
          ],
        },
        profileSignals: [],
        paths: [
          {
            pathId: "industry-ai-product-assistant",
            title: "行业 AI 应用产品助理",
            decision: "priority_trial",
            rationale: "可围绕用户确认信号做试航。",
            evidence: [],
            riskNotes: ["不得声明参与原项目。"],
            suggestedProjectTypes: ["knowledge_base"],
            nextTrialAction: "选择已审计项目生成试航包。",
          },
        ],
        projectMatches: [
          {
            projectId: "opendocuments",
            rolePathId: "industry-ai-product-assistant",
            decision: "matched_for_trial",
            matchedRules: ["audited_reference"],
            evidence: [],
            boundaryNotes: ["仅作公开参考。"],
          },
          {
            projectId: "chatwoot",
            rolePathId: "industry-ai-product-assistant",
            decision: "matched_for_trial",
            matchedRules: ["audited_reference"],
            evidence: [],
            boundaryNotes: [
              "MIT Expat outside enterprise directory; enterprise directory has separate license",
            ],
          },
        ],
        scopeDisclaimer: "不做评分、排名或概率预测。",
      }),
    });
  });

  await page.route("**/api/pathfinder/trial-packages/generate", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, string>;
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body,
    });
    const sourceProject =
      projects.find((project) => project.projectId === body.selectedProjectId) ??
      projects[0];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1b.v1",
        trialPackageCandidate: {
          trialPackageId: `trial-${sourceProject.projectId}`,
          trialPackageVersion: "1.0.0",
          generatedFrom: {
            recommendationRunId: body.recommendationRunId,
            selectedPathId: body.selectedPathId,
            selectedProjectId: body.selectedProjectId,
            ruleVersion: "p1b.e2e",
          },
          title: `${sourceProject.name} 试航`,
          targetRolePath: {
            pathId: "industry-ai-product-assistant",
            title: "行业 AI 应用产品助理",
            decision: "priority_trial",
            rationale: "可围绕用户确认信号做试航。",
            evidence: [],
            riskNotes: [],
            suggestedProjectTypes: [],
            nextTrialAction: "",
          },
          sourceProject,
          trialQuestions: genericApiQuestionIds.map((questionId) => ({
            questionId,
            title:
              questionId === "application_solution"
                ? "MVP 计划"
                : questionId === "portfolio_extension"
                  ? "作品集边界"
                  : questionId,
            prompt: `${sourceProject.name} ${questionId} prompt`,
            required: true,
          })),
          requiredMarkdownSections,
          forbiddenClaims: sourceProject.forbiddenClaims,
          sampleJdDisclaimer: "样例 JD / 当前样本趋势参考。",
        },
        antiPackagingDefaults: {
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
      }),
    });
  });
}

async function mockInterviewApi(page: Page, requests: ApiRequestLog[]) {
  const createdAt = "2026-06-11T00:00:00Z";
  const session = {
    schemaVersion: "p1c.v1",
    sessionId: "interview-e2e",
    status: "active",
    messages: [
      {
        messageId: "assistant-1",
        role: "assistant",
        content: "先讲一段你最近整理过的业务资料或流程。",
        createdAt,
        modelStatus: "ok",
      },
    ],
    extractedSignals: [],
    confirmedSignals: [],
    llmStatus: "ok",
    createdAt,
    updatedAt: createdAt,
  };

  await page.route("**/api/pathfinder/interview/sessions", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body });
    const messages = body.initialUserInput
      ? [
          {
            messageId: "user-1",
            role: "user",
            content: body.initialUserInput,
            createdAt,
          },
          ...session.messages,
        ]
      : session.messages;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ...session, messages }),
    });
  });

  await page.route("**/api/pathfinder/interview/sessions/interview-e2e/turns", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body });
    const nextSession = {
      ...session,
      messages: [
        ...session.messages,
        {
          messageId: "user-1",
          role: "user",
          content: body.message,
          createdAt,
        },
        {
          messageId: "assistant-2",
          role: "assistant",
          content: "这些经历里，哪些内容是你亲自整理和确认的？",
          createdAt,
          modelStatus: "ok",
        },
      ],
      updatedAt: createdAt,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1c.v1",
        sessionId: "interview-e2e",
        assistantMessage: nextSession.messages[2],
        session: nextSession,
      }),
    });
  });

  await page.route("**/api/pathfinder/interview/sessions/interview-e2e/signals", async (route) => {
    requests.push({ method: route.request().method(), url: route.request().url(), headers: route.request().headers(), body: {} });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1c.v1",
        sessionId: "interview-e2e",
        modelStatus: "ok",
        signals: [
          {
            signalId: "sig-1",
            category: "project_experience",
            label: "客服知识库整理",
            evidenceText: "有客服知识库整理和流程拆解经历。",
            sourceMessageIds: ["user-1"],
            confidence: "needs_user_review",
            status: "candidate",
          },
        ],
        createdAt,
      }),
    });
  });

  await page.route("**/api/pathfinder/interview/sessions/interview-e2e/confirmed-signals", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { confirmedSignals: unknown[] };
    requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body: body as unknown as Record<string, unknown> });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...session,
        status: "signals_confirmed",
        confirmedSignals: body.confirmedSignals,
      }),
    });
  });
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

test("runs AI interview, lets user edit confirmed signals, and generates a matched audited project trial", async ({
  page,
}) => {
  const requests: ApiRequestLog[] = [];
  await mockInterviewApi(page, requests);
  await mockRecommendationAndProjectApi(page, requests);
  await mockPathfinderApi(page, requests);

  await page.goto("/pathfinder/background");
  await page
    .getByLabel("你的回答")
    .fill("我做过客服知识库整理，也拆过用户反馈流程。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await expect(page.getByText("下一问").last()).toBeVisible();

  await page.getByRole("button", { name: "整理信号草稿" }).click();
  await expect(page.getByText("客服知识库整理待确认")).toBeVisible();
  await page
    .locator("textarea")
    .nth(1)
    .fill("我确认做过客服知识库整理和流程拆解，但没有参与原项目开发。");
  await page.getByRole("button", { name: "确认信号并查看推荐" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByText("已确认背景信号")).toBeVisible();
  await expect(page.getByRole("button", { name: /Chatwoot/ })).toBeVisible();
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
  await expect(page.getByText("score")).toHaveCount(0);
  await expect(page.getByText("ranking")).toHaveCount(0);
  await expect(page.getByText("probability")).toHaveCount(0);
  await expect(page.getByText("排名")).toHaveCount(0);
  await expect(page.getByText("分数")).toHaveCount(0);
  await expect(page.getByText("概率")).toHaveCount(0);
  await expect(
    page.getByText(
      "MIT Expat outside enterprise directory; enterprise directory has separate license",
    ).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /Chatwoot/ }).click();
  await page.getByRole("button", { name: /生成试航包/ }).click();
  await expect(page).toHaveURL(/\/pathfinder\/trial$/);
  await expect(page.getByRole("heading", { name: "Chatwoot 试航问答" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chatwoot 来源参照" })).toBeVisible();
  await expect(page.getByText("MVP 计划", { exact: true })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(6);
  await expect(page.getByText("OpenDocuments 来源参照")).toHaveCount(0);

  await fillAnswers(page);
  await page.getByRole("link", { name: "进入结果页" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/result$/);
  const chatwootMarkdownPreview = page.locator("textarea").last();
  await expect(chatwootMarkdownPreview).toHaveValue(/## 项目来源与 License/);
  await expect(chatwootMarkdownPreview).toHaveValue(/## 公开项目能力/);
  await expect(chatwootMarkdownPreview).toHaveValue(/试航对象：Chatwoot/);
  await expect(chatwootMarkdownPreview).toHaveValue(
    /MIT Expat outside enterprise directory; enterprise directory has separate license/,
  );
  await expect(chatwootMarkdownPreview).not.toHaveValue(/试航对象：OpenDocuments/);

  const chatwootDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  const chatwootDownload = await chatwootDownloadPromise;
  expect(chatwootDownload.suggestedFilename()).toBe("pathfinder-candidate-chatwoot.md");

  const serializedRequests = JSON.stringify(requests);
  expect(serializedRequests).not.toContain("DEEPSEEK");
  expect(serializedRequests).not.toContain("api_key");
});

test("keeps recommendation guarded until AI signals are confirmed", async ({ page }) => {
  const requests: ApiRequestLog[] = [];
  await mockInterviewApi(page, requests);

  await page.goto("/pathfinder/background");
  await page
    .getByLabel("你的回答")
    .fill("我做过客服知识库整理，也拆过用户反馈流程。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await page.getByRole("button", { name: "整理信号草稿" }).click();
  await expect(page.getByText("客服知识库整理待确认")).toBeVisible();

  await page.goto("/pathfinder/recommendation");
  await expect(page.getByRole("heading", { name: "需要先补充真实背景" })).toBeVisible();
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
  await expect(page.getByText("最佳项目")).toHaveCount(0);
  await expect(page.getByText("排名")).toHaveCount(0);
  await expect(page.getByText("概率")).toHaveCount(0);
});

test("falls back to manual-safe local interview signals when AI interview API fails", async ({
  page,
}) => {
  await page.route("**/api/pathfinder/interview/sessions", async (route) => {
    await route.fulfill({ status: 500, body: "{}" });
  });

  await page.goto("/pathfinder/background");
  await page
    .getByLabel("你的回答")
    .fill("我做过客服知识库整理，也拆过用户反馈流程。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await page.getByRole("button", { name: "整理信号草稿" }).click();

  await expect(page.getByText("本地兜底整理")).toBeVisible();
  await expect(page.getByText("AI 只整理你已经回答的内容")).toHaveCount(0);
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
});

test("runs P1-A real input pathfinder loop and exports markdown", async ({ page }) => {
  await page.goto("/pathfinder");
  await expect(page.getByRole("heading", { name: "寻径星图：航前试航" })).toBeVisible();
  await expect(page.getByText("实岗试航 · 作品集起点")).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Job Copilot" })).toHaveCount(0);
  await expect(page.getByText("这不是履历美化工具，也不做岗位背书、企业侧动作或求职结果判断")).toBeVisible();
  await expect(page.getByText("小 C")).toHaveCount(0);

  await page.getByRole("link", { name: "填写背景" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/background$/);
  await expect(page.getByRole("heading", { name: "航前访谈：先聊一轮背景" })).toBeVisible();
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并查看星图" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByRole("heading", { name: "tester的 AI 转岗试航星图" })).toBeVisible();
  await expect(page.getByText("推荐依据")).toBeVisible();
  await expect(page.getByText("已确认背景信号")).toBeVisible();
  await expect(page.getByText(profile.professionalBackground).first()).toBeVisible();
  await expect(page.getByText("行业 AI 应用产品助理").first()).toBeVisible();
  await expect(page.getByText("行业 AI 解决方案助理").first()).toBeVisible();
  await expect(page.getByText("AI 数据评测助理").first()).toBeVisible();
  await expect(page.getByText("算法工程 / 大模型研发").first()).toBeVisible();
  await expect(page.getByText("已审计项目库", { exact: true })).toBeVisible();
  await expect(page.getByText("当前可试航项目")).toBeVisible();

  await page.getByRole("button", { name: /生成试航包/ }).click();
  await expect(page).toHaveURL(/\/pathfinder\/trial$/);
  await expect(page.getByRole("heading", { name: "OpenDocuments 试航问答" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OpenDocuments 来源参照" })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(6);
  await expect(page.locator("textarea").first()).toHaveValue("");
  await expect(page.getByRole("button", { name: "进入结果页" })).toBeDisabled();

  await fillAnswers(page);
  await expect(page.getByText("完整可导出").first()).toBeVisible();
  await page.getByRole("link", { name: "进入结果页" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/result$/);
  await expect(page.locator("p").filter({ hasText: "样例 JD + tester背景 + OpenDocuments 公开来源 -> 试航问答 -> 航迹表 / 作品集草稿 / Markdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "反包装检查摘要" })).toBeVisible();
  await expect(page.getByText("完整档案已就绪")).toBeVisible();
  await expect(page.getByText("不可声称：用户开发、维护、贡献或完整复现所选开源项目").first()).toBeVisible();

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
  await page.addInitScript(({ profilePayload, packageId }) => {
    window.sessionStorage.setItem(
      "pathfinder-p1-a-state",
      JSON.stringify({
        profileSubmitted: true,
        trailRecord: {
          schemaVersion: "p1-a.v1",
          trialPackageId: packageId,
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
  }, { profilePayload: profile, packageId: currentTrialPackageId });

  await page.goto("/pathfinder/result");

  await expect(page.getByText("试航问答尚未完成")).toBeVisible();
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

  await expect(page.getByText("问答缺项").first()).toBeVisible();
  await expect(page.getByText("未完成：AI 使用说明。")).toBeVisible();
  await expect(page.getByRole("button", { name: "进入结果页" })).toBeDisabled();

  await page.goto("/pathfinder/result");
  await expect(page.getByText("试航问答尚未完成")).toBeVisible();
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
    .poll(
      () =>
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
      { timeout: 20_000 },
    )
    .toBe(true);

  await page.getByRole("link", { name: "进入结果页" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  await downloadPromise;

  await expect
    .poll(
      () =>
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
      { timeout: 20_000 },
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
