import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

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
const requiredRoleStarTitles = [
  "AI 产品经理（AI应用方向）",
  "数据产品经理（AI数据方向）",
  "AI解决方案架构师",
  "AI应用实施顾问",
  "AI应用开发工程师",
  "RAG工程师",
  "Agent应用开发工程师",
  "MLOps/AI平台工程师",
  "LLM评测工程师",
  "AI数据标注与质检专家",
  "AI数据分析师",
  "AI运营/增长专家",
];
const retiredRoleStarTitles = [
  "大模型应用工程师",
  "数据标注质检专家",
  "模型反馈分析师",
  "AI 项目经理（交付方向）",
];

const forbiddenVisibleCopyPattern =
  /API|后端|前端|简历包装|企业筛选|评分|百分比|排名|\boffer\b|录用概率|认证|占位|fallback|mock|schema|fixture|P1-D|P1-C|migration|不新增|低摩擦入口心智|实现范围|运行逻辑/i;

const profile = {
  displayName: "tester",
  professionalBackground: "机械工程背景，做过设备资料整理和项目协作。",
  jobTarget: "希望试航行业 AI 应用产品助理方向。",
  timeline: "计划 3 个月内完成作品集并开始投递。",
  projectExperience: "做过工艺文档整理、跨团队需求沟通和报告撰写。",
  aiToolExperience: "使用 AI 辅助整理资料和草拟提纲，最终人工核验。",
  technicalBasics: "了解基础 Python、数据清洗、文档系统和 RAG 概念。",
  currentConfusion: "不确定如何把行业经验转成 AI 产品证据。",
  constraints: "不使用真实企业内部资料，只用脱敏或公开样例；偏好文档和流程型工作。",
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
    notClaimed: [`不声称用户参与 ${name} 原项目。`],
    forbiddenClaims: [`不得声称用户开发 ${name}。`],
    allowedContexts: [`基于 ${name} 公开信息做试航拆解。`],
    sourceBoundary:
      projectId === "chatwoot"
        ? "已审计项目库 / 当前样本参考；Chatwoot enterprise 目录有单独 License 边界。"
        : "已审计项目库 / 当前样本参考。",
  };
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
        trialPackageCandidate: body.trialPackageCandidate,
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
        createdAt: "2026-06-14T00:00:00Z",
        updatedAt: "2026-06-14T00:00:00Z",
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
          updatedAt: "2026-06-14T00:00:01Z",
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          recordId: apiRecordId,
          status: body.markdownSnapshot ? "exported" : body.status,
          markdownSnapshotSaved: Boolean(body.markdownSnapshot),
          updatedAt: "2026-06-14T00:00:02Z",
        }),
      });
    },
  );
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

  await page.route(
    "**/api/pathfinder/projects?status=approved_for_trial_package",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "p1b.v1",
          projects,
          dataBoundary: "已审计项目库；仅作公开来源参考。",
        }),
      });
    },
  );

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
          createdAt: "2026-06-14T00:00:00Z",
          ruleVersion: {
            version: "p1d.e2e",
            effectiveAt: "2026-06-14T00:00:00Z",
            rolePathTaxonomyVersion: "p1d-role-stars.v1",
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
              rationale: "可围绕用户确认信号做产品类试航。",
              evidence: [],
              riskNotes: ["不得声称参与原项目。"],
              suggestedProjectTypes: ["knowledge_base"],
              nextTrialAction: "选择已审计项目生成适航任务。",
            },
            {
              pathId: "industry-ai-solution-assistant",
              title: "AI 解决方案助理",
              decision: "explore",
              rationale: "可补方案和 PoC 边界。",
              evidence: [],
              riskNotes: [],
              suggestedProjectTypes: ["poc"],
              nextTrialAction: "",
            },
            {
              pathId: "ai-data-evaluation-assistant",
              title: "AI 数据评测助理",
              decision: "explore",
              rationale: "可补样例和质检流程。",
              evidence: [],
              riskNotes: [],
              suggestedProjectTypes: ["evaluation"],
              nextTrialAction: "",
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
            rationale: "可围绕用户确认信号做产品类试航。",
            evidence: [],
            riskNotes: ["不得声称参与原项目。"],
            suggestedProjectTypes: ["knowledge_base"],
            nextTrialAction: "选择已审计项目生成适航任务。",
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
        scopeDisclaimer: "只做证据链试航，不代表任何招聘结果。",
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
            ruleVersion: "p1d.e2e",
          },
          title: `${sourceProject.name} 适航任务`,
          targetRolePath: {
            pathId: "industry-ai-product-assistant",
            title: "行业 AI 应用产品助理",
            decision: "priority_trial",
            rationale: "可围绕用户确认信号做产品类试航。",
            evidence: [],
            riskNotes: [],
            suggestedProjectTypes: [],
            nextTrialAction: "",
          },
          sourceProject,
          trialQuestions: requiredApiQuestionIds.map((questionId) => ({
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

async function mockResumeParseApi(page: Page, requests: ApiRequestLog[]) {
  await page.route("**/api/pathfinder/resume/parse", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: {
        multipartLength: request.postDataBuffer()?.length ?? 0,
      },
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "resume_parser",
        fileName: "resume.txt",
        fileType: "text/plain",
        textLength: 128,
        modelStatus: "ok",
        readiness: "ready",
        missingSignalTypes: ["technical_foundation"],
        userMessage: "已从简历中整理出 2 条经历线索，请确认后生成星图。",
        signals: [
          {
            signalId: "resume-sig-1",
            category: "project_experience",
            label: "简历项目经历",
            evidenceText:
              "参与客服知识库资料整理，把常见问题、处理流程和用户反馈归类。",
            sourceMessageIds: [],
            confidence: "needs_user_review",
            status: "candidate",
          },
          {
            signalId: "resume-sig-2",
            category: "ai_tool_usage",
            label: "简历 AI 工具经历",
            evidenceText:
              "使用 AI 工具辅助整理初稿，并由本人进行人工确认和改写。",
            sourceMessageIds: [],
            confidence: "needs_user_review",
            status: "candidate",
          },
        ],
      }),
    });
  });
}

async function mockInterviewApi(page: Page, requests: ApiRequestLog[]) {
  const createdAt = "2026-06-14T00:00:00Z";
  const assistantMessage = {
    messageId: "assistant-1",
    role: "assistant",
    content: "先讲一段你最近整理过的业务资料或流程。",
    createdAt,
    modelStatus: "ok",
  };

  await page.route("**/api/pathfinder/interview/sessions", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: "p1c.v1",
        sessionId: "interview-e2e",
        status: "active",
        messages: body.initialUserInput
          ? [
              {
                messageId: "user-1",
                role: "user",
                content: body.initialUserInput,
                createdAt,
              },
              assistantMessage,
            ]
          : [assistantMessage],
        extractedSignals: [],
        confirmedSignals: [],
        llmStatus: "ok",
        createdAt,
        updatedAt: createdAt,
      }),
    });
  });

  await page.route(
    "**/api/pathfinder/interview/sessions/interview-e2e/signals",
    async (route) => {
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
            {
              signalId: "sig-2",
              category: "ai_tool_usage",
              label: "AI 工具辅助",
              evidenceText: "使用 AI 整理初稿并人工确认。",
              sourceMessageIds: ["user-1"],
              confidence: "needs_user_review",
              status: "candidate",
            },
          ],
          createdAt,
        }),
      });
    },
  );

  await page.route(
    "**/api/pathfinder/interview/sessions/interview-e2e/confirmed-signals",
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as { confirmedSignals: unknown[] };
      requests.push({ method: request.method(), url: request.url(), headers: request.headers(), body: body as unknown as Record<string, unknown> });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "p1c.v1",
          sessionId: "interview-e2e",
          status: "signals_confirmed",
          messages: [assistantMessage],
          extractedSignals: [],
          confirmedSignals: body.confirmedSignals,
          llmStatus: "ok",
          createdAt,
          updatedAt: createdAt,
        }),
      });
    },
  );
}

async function fillProfile(page: Page) {
  await page.getByText("编辑已提取信息 / 手动补充").click();
  await page.getByLabel("称呼").fill(profile.displayName);
  await page.getByLabel("专业 / 行业背景").fill(profile.professionalBackground);
  await page.getByLabel("想探索的 AI 岗位方向").fill(profile.jobTarget);
  await page.getByLabel("时间线").fill(profile.timeline);
  await page
    .getByLabel("真实项目 / 流程 / 协作经历")
    .fill(profile.projectExperience);
  await page.getByLabel("AI 工具使用经历").fill(profile.aiToolExperience);
  await page
    .getByLabel("技术 / 数据 / 工具基础")
    .fill(profile.technicalBasics);
  await page.getByLabel("当前困惑").fill(profile.currentConfusion);
  await page
    .getByLabel("偏好、工作方式、排斥项、学习意愿")
    .fill(profile.constraints);
}

async function fillAnswers(page: Page, values = answers) {
  const textareas = page.locator("textarea");
  for (let index = 0; index < values.length; index += 1) {
    await textareas.nth(index).fill(values[index]);
  }
}

async function expectNoUserVisibleEngineeringCopy(page: Page) {
  await expect(page.locator("body")).not.toContainText(
    forbiddenVisibleCopyPattern,
  );
}

test("guards recommendation when real background is missing", async ({ page }) => {
  await page.goto("/pathfinder/recommendation");

  await expect(page.getByRole("heading", { name: "需要先补充真实背景" })).toBeVisible();
  await expect(page.getByText("背景证据不足")).toBeVisible();
});

test("runs P1-D Lite manual fallback loop and exports Chatwoot markdown", async ({
  page,
}) => {
  const requests: ApiRequestLog[] = [];
  await mockRecommendationAndProjectApi(page, requests);
  await mockPathfinderApi(page, requests);

  await page.goto("/pathfinder");
  await expect(page.getByRole("heading", { name: "个人 AI 求职星图" })).toBeVisible();
  await expect(page.getByText("上传简历生成星图")).toBeVisible();
  await expect(page.getByText("AI 聊聊我的经历")).toBeVisible();
  await expect(page.getByRole("link", { name: "AI Job Copilot" })).toHaveCount(0);
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
  await expectNoUserVisibleEngineeringCopy(page);

  await page.getByRole("link", { name: "开始航前访谈" }).click();
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并生成星图" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByRole("heading", { name: "tester的 AI 求职星图" })).toBeVisible();
  await expect(page.getByText("岗位星图导航盘")).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI 产品经理（AI应用方向）" })).toBeVisible();
  for (const title of requiredRoleStarTitles) {
    await expect(
      page.getByRole("button", { name: `查看${title}` }),
    ).toBeVisible();
  }
  for (const title of retiredRoleStarTitles) {
    await expect(
      page.getByRole("button", { name: `查看${title}` }),
    ).toHaveCount(0);
  }
  await expect(page.getByText("岗位适配判断")).toBeVisible();
  await expect(page.getByText("AI运营/增长专家")).toBeVisible();
  await expect(page.getByText("适航任务入口")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vibe Coding 原型试航" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 工具体验营运营方案试航" }),
  ).toBeVisible();
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
  await expect(page.getByText("score")).toHaveCount(0);
  await expect(page.getByText("probability")).toHaveCount(0);
  await expect(page.getByText("Top 1")).toHaveCount(0);
  await expectNoUserVisibleEngineeringCopy(page);
  await expect(
    page
      .getByText(
        "MIT Expat outside enterprise directory; enterprise directory has separate license",
      )
      .first(),
  ).toBeVisible();

  await page.getByRole("button", { name: /Chatwoot/ }).click();
  await page.getByRole("button", { name: /生成开发岗适航任务/ }).click();

  await expect(page).toHaveURL(/\/pathfinder\/trial$/);
  await expect(page.getByRole("heading", { name: "Chatwoot 适航任务" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chatwoot 来源参照" })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(6);

  await fillAnswers(page);
  await page.getByRole("link", { name: "进入适航成果包" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/result$/);
  await expect(
    page.getByRole("heading", { name: "适航成果包", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1. 岗位星点结论" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "3. 证据链与边界" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "4. 下一步 3/7 天打磨计划" }),
  ).toBeVisible();
  await expectNoUserVisibleEngineeringCopy(page);

  const markdownPreview = page.locator("textarea").last();
  await expect(markdownPreview).toHaveValue(/Chatwoot/);
  await expect(markdownPreview).toHaveValue(
    /MIT Expat outside enterprise directory; enterprise directory has separate license/,
  );
  await expect(markdownPreview).not.toHaveValue(/试航对象：OpenDocuments/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("pathfinder-tester-chatwoot.md");

  const serializedRequests = JSON.stringify(requests);
  expect(serializedRequests).not.toContain("DEEPSEEK");
  expect(serializedRequests).not.toContain("api_key");
});

test("uploads resume, confirms extracted signals, and reaches star map", async ({
  page,
}) => {
  const requests: ApiRequestLog[] = [];
  await mockResumeParseApi(page, requests);
  await mockRecommendationAndProjectApi(page, requests);
  await mockPathfinderApi(page, requests);

  await page.goto("/pathfinder");
  await page.locator("#resume-upload").setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "参与客服知识库资料整理，把常见问题、处理流程和用户反馈归类，并用 AI 工具辅助整理初稿。",
      "utf8",
    ),
  });

  await expect(page).toHaveURL(/\/pathfinder\/background$/);
  await expect(page.getByText("来自简历的经历线索")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /简历项目经历/ }),
  ).toBeVisible();
  await expect(page.getByText("来自简历").first()).toBeVisible();
  await expectNoUserVisibleEngineeringCopy(page);

  await page
    .getByRole("textbox", { name: /简历项目经历/ })
    .fill("我确认参与过客服知识库资料整理、流程归类和用户反馈整理。");
  await page.getByRole("button", { name: "确认信号并查看星图" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByText("重点试航星点")).toBeVisible();
  await expect(page.getByText("岗位星图导航盘")).toBeVisible();
  await expectNoUserVisibleEngineeringCopy(page);

  await expect
    .poll(() =>
      requests.some((request) =>
        request.url.endsWith("/api/pathfinder/resume/parse"),
      ),
    )
    .toBe(true);
});

test("runs AI interview, lets user stop, confirm signals, and reach star map", async ({
  page,
}) => {
  const requests: ApiRequestLog[] = [];
  await mockInterviewApi(page, requests);
  await mockRecommendationAndProjectApi(page, requests);

  await page.goto("/pathfinder/background");
  await page
    .getByLabel("你的回答")
    .fill("我做过客服知识库整理，也拆过用户反馈流程，并用 AI 工具整理过初稿。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await expect(page.getByText("下一问")).toBeVisible();

  await page.getByRole("button", { name: "整理信号草稿" }).click();
  await expect(
    page.getByRole("textbox", { name: /客服知识库整理/ }),
  ).toBeVisible();
  await page
    .locator("textarea")
    .nth(1)
    .fill("我确认做过客服知识库整理和流程拆解，但没有参与原项目开发。");
  await page.getByRole("button", { name: "暂时够了，生成星图" }).click();

  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);
  await expect(page.getByText("重点试航星点")).toBeVisible();
  await expect(page.getByText("岗位星图导航盘")).toBeVisible();
  await expect(page.getByText("GitHub Search")).toHaveCount(0);
});

test("falls back safely when AI interview API fails", async ({ page }) => {
  await page.route("**/api/pathfinder/interview/sessions", async (route) => {
    await route.fulfill({ status: 500, body: "{}" });
  });

  await page.goto("/pathfinder/background");
  await page
    .getByLabel("你的回答")
    .fill("我做过知识库整理，也用 AI 辅助整理初稿。");
  await page.getByRole("button", { name: "发送回答" }).click();
  await page.getByRole("button", { name: "整理信号草稿" }).click();

  await expect(page.getByText("可确认背景信号")).toBeVisible();
  await expect(page.getByRole("button", { name: "确认信号并查看星图" })).toBeVisible();
  await expect(page.getByText("DeepSeek")).toHaveCount(0);
  await expect(page.getByText("DEEPSEEK_API_KEY")).toHaveCount(0);
});

test("does not export full markdown when trial answers are incomplete", async ({
  page,
}) => {
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并生成星图" }).click();
  await page.goto("/pathfinder/result");

  await expect(page.getByText("适航问答尚未完成")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("blocks full markdown export when anti-packaging check finds risky answer", async ({
  page,
}) => {
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并生成星图" }).click();
  await page.goto("/pathfinder/trial");
  await fillAnswers(page);
  await page
    .locator("textarea")
    .nth(4)
    .fill("我开发了 OpenDocuments，并完成了企业级 RAG 系统。");

  await expect(page.getByRole("button", { name: "进入适航成果包" })).toBeDisabled();
  await page.goto("/pathfinder/result");
  await expect(page.getByText("反包装检查命中阻断项")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 Markdown" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
});

test("syncs TrailRecord answers and markdown snapshot to records API", async ({
  page,
}) => {
  const apiRequests: ApiRequestLog[] = [];
  await mockPathfinderApi(page, apiRequests);

  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并生成星图" }).click();

  await expect
    .poll(() =>
      apiRequests.some(
        (request) =>
          request.method === "POST" &&
          request.url.endsWith("/api/pathfinder/records") &&
          request.body.schemaVersion === "p1-a.v1" &&
          request.body.trialPackageId === currentTrialPackageId &&
          (request.body.userProfileSnapshot as typeof profile).displayName ===
            "tester",
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

  await page.getByRole("link", { name: "进入适航成果包" }).click();
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
            Boolean(snapshot.content?.includes("OpenDocuments"))
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
});

test("keeps star map within 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/pathfinder/background");
  await fillProfile(page);
  await page.getByRole("button", { name: "保存背景并生成星图" }).click();
  await expect(page).toHaveURL(/\/pathfinder\/recommendation$/);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
