import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
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

test("candidate recovers from an unavailable provider and inspects Role Signal provenance", async ({ page, request }) => {
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
  let analysisAttempt = 0;
  await page.route(`**/api/applications/${created.application_id}/commands`, async (route) => {
    const command = route.request().postDataJSON();
    if (command?.type !== "analyze_target") {
      await route.continue();
      return;
    }
    analysisAttempt += 1;
    if (analysisAttempt === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...created,
          target_analysis: {
            status: "failed",
            last_error: {
              code: "provider_unavailable",
              message: "模型服务暂时不可用，现有投递内容已保留，请稍后重试。",
              retryable: true,
            },
          },
          prompt_runs: [
            {
              id: "prompt-run-failed",
              prompt_family: "target_analysis",
              prompt_version: "target-analysis-v1",
              model_provider: "deterministic-fake",
              model_name: "target-analysis-fixture-v1",
              status: "failed",
              error_code: "provider_unavailable",
              created_at: new Date().toISOString(),
            },
          ],
        }),
      });
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
            id: "prompt-run-failed",
            prompt_family: "target_analysis",
            prompt_version: "target-analysis-v1",
            model_provider: "deterministic-fake",
            model_name: "target-analysis-fixture-v1",
            status: "failed",
            error_code: "provider_unavailable",
            created_at: new Date().toISOString(),
          },
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
  await expect(page.getByText("模型服务暂时不可用", { exact: false })).toBeVisible();
  await expect(page.getByText("现有材料未被改动")).toBeVisible();
  await expect(page.getByText("智能客服评测体系")).toBeVisible();

  await page.getByRole("button", { name: "重新尝试" }).click();

  await expect(page.getByRole("heading", { name: "大模型工作流与质量评测设计" })).toBeVisible();
  await expect(page.getByText("JD 原文", { exact: true })).toBeVisible();
  await expect(page.getByText("设计大模型工作流、质量评测方案及异常处理机制")).toBeVisible();
  await expect(page.getByRole("heading", { name: "从验证走向稳定交付的推进能力" })).toBeVisible();
  await expect(page.getByText("AI 解读", { exact: true })).toBeVisible();
  await expect(page.getByText("不代表招聘方确定结论", { exact: false })).toBeVisible();
  await expect(page.getByText("匹配分", { exact: false })).toHaveCount(0);
});

test("candidate sees traceable claims and a separate non-copyable Stretch Direction", async ({ page, request }) => {
  const user = await registerUser(request, "claim-studio");
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
  const employmentItem = created.experience_entries[0].experience_items[0];
  const projectItem = created.standalone_experience_items[0];
  const roleSignal = {
    id: "signal-quality",
    signal: "大模型工作流与质量评测设计",
    source_type: "explicit",
    jd_excerpt: "建立质量评测和异常处理机制",
    rationale: null,
  };
  const sources = [
    {
      id: "source-employment",
      prompt_run_id: "claim-run-1",
      experience_item_id: employmentItem.id,
      source_scope: "application_local",
      item_title: employmentItem.title,
      entry_context: {
        organization: "知音科技",
        role: "AI 产品实习生",
        date_range: "2025.01-2025.06",
      },
      base_facts: employmentItem.base_facts,
      captured_at: new Date().toISOString(),
    },
    {
      id: "source-project",
      prompt_run_id: "claim-run-1",
      experience_item_id: projectItem.id,
      source_scope: "application_local",
      item_title: projectItem.title,
      entry_context: null,
      base_facts: projectItem.base_facts,
      captured_at: new Date().toISOString(),
    },
  ];

  await page.route(`**/api/applications/${created.application_id}/commands`, async (route) => {
    const command = route.request().postDataJSON();
    if (command?.type === "analyze_target") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...created,
          workflow_phase: "role_signal_review",
          role_signals: [roleSignal],
          target_analysis: { status: "completed", last_error: null },
        }),
      });
      return;
    }
    if (command?.type === "generate_claims") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...created,
          workflow_phase: "claim_review",
          role_signals: [roleSignal],
          target_analysis: { status: "completed", last_error: null },
          claim_studio: { status: "completed", last_error: null },
          source_snapshots: sources,
          competitive_claims: [
            {
              id: "claim-1",
              source_snapshot_id: sources[0].id,
              experience_item_id: employmentItem.id,
              source_focus: "评测样本与维度设计",
              opportunity_value: "体现质量评测驱动模型迭代的完整闭环。",
              supported_base_fact_ids: employmentItem.base_facts.map((fact: { id: string }) => fact.id),
              primary_role_signal_id: roleSignal.id,
              primary_role_signal: roleSignal,
              competitive_claim: "围绕 120 条高频失败案例定义三类评测维度，并协同算法与运营完成两轮提示词迭代。",
              stretch_direction: {
                expression_gap: "尚未说明评测结论如何改变迭代优先级。",
                why_it_matters: "能更直接体现质量判断如何转化为产品决策。",
                expansion_direction: "回想一次由评测结论改变提示词或异常处理方案的具体取舍。",
              },
            },
            {
              id: "claim-2",
              source_snapshot_id: sources[1].id,
              experience_item_id: projectItem.id,
              source_focus: "具体 JD 工作流",
              opportunity_value: "体现岗位理解、工作流设计与产品结构化能力。",
              supported_base_fact_ids: projectItem.base_facts.map((fact: { id: string }) => fact.id),
              primary_role_signal_id: roleSignal.id,
              primary_role_signal: roleSignal,
              competitive_claim: "独立设计面向具体 JD 的求职准备工作流，将岗位信号、经历材料和主张生成串成可复用流程。",
              stretch_direction: {
                expression_gap: "当前表述没有呈现工作流如何验证输出质量。",
                why_it_matters: "岗位明确重视大模型工作流与质量评测。",
                expansion_direction: "梳理一个评测结果驱动流程节点调整的实例。",
              },
            },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });

  await installSession(page, user);
  await page.goto(`/applications/${created.application_id}`);
  await page.getByRole("button", { name: "提取岗位信号" }).click();
  await page.getByRole("button", { name: "生成竞争主张" }).click();

  await expect(page.getByText("2 条高价值主张", { exact: false })).toBeVisible();
  await expect(page.getByText("智能客服评测体系", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("大模型工作流与质量评测设计", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("围绕 120 条高频失败案例定义三类评测维度", { exact: false })).toBeVisible();
  await expect(page.getByText("尚未说明评测结论如何改变迭代优先级", { exact: false })).toBeVisible();
  await expect(page.getByText("第 3 条", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /复制.*冲刺方向/ })).toHaveCount(0);
  await expect(page.getByText("匹配分", { exact: false })).toHaveCount(0);
  await expect(page.getByText("录用概率", { exact: false })).toHaveCount(0);
});

test("candidate edits, saves, reopens, copies, and exports a Targeted Resume Version", async ({ page, request, context }) => {
  const user = await registerUser(request, "targeted-resume");
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
  const item = created.experience_entries[0].experience_items[0];
  const roleSignal = {
    id: "signal-targeted-resume",
    signal: "大模型工作流与质量评测设计",
    source_type: "explicit",
    jd_excerpt: "建立质量评测和异常处理机制",
    rationale: null,
  };
  const source = {
    id: "source-targeted-resume",
    prompt_run_id: "claim-run-targeted-resume",
    experience_item_id: item.id,
    source_scope: "application_local",
    item_title: item.title,
    entry_context: {
      organization: "知音科技",
      role: "AI 产品实习生",
      date_range: "2025.01-2025.06",
    },
    base_facts: item.base_facts,
    captured_at: new Date().toISOString(),
  };
  const generatedText = "围绕 120 条高频失败案例定义三类评测维度。";
  const editedText = "从 120 条高频失败案例中定义三类评测维度，并据此推进两轮提示词迭代。";
  const stretchText = "回想一次评测结论改变方案优先级的具体取舍。";
  const claim = {
    id: "claim-targeted-resume",
    source_snapshot_id: source.id,
    experience_item_id: item.id,
    source_focus: "评测样本与维度设计",
    opportunity_value: "体现质量评测驱动迭代的完整闭环。",
    supported_base_fact_ids: item.base_facts.map((fact: { id: string }) => fact.id),
    primary_role_signal_id: roleSignal.id,
    primary_role_signal: roleSignal,
    competitive_claim: generatedText,
    selected_resume_claim: generatedText,
    selected_resume_claim_is_edited: false,
    selected_resume_claim_updated_at: null,
    stretch_direction: {
      expression_gap: "尚未说明评测如何改变迭代优先级。",
      why_it_matters: "能体现质量判断如何转化为产品决策。",
      expansion_direction: stretchText,
    },
  };
  let currentSnapshot = created;
  const observedCommands: string[] = [];

  await page.route(`**/api/applications/${created.application_id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentSnapshot),
    });
  });
  await page.route(`**/api/applications/${created.application_id}/commands`, async (route) => {
    const command = route.request().postDataJSON();
    observedCommands.push(command.type);
    if (command.type === "analyze_target") {
      currentSnapshot = {
        ...currentSnapshot,
        workflow_phase: "role_signal_review",
        role_signals: [roleSignal],
        target_analysis: { status: "completed", last_error: null },
      };
    } else if (command.type === "generate_claims") {
      currentSnapshot = {
        ...currentSnapshot,
        workflow_phase: "claim_review",
        claim_studio: { status: "completed", last_error: null },
        source_snapshots: [source],
        competitive_claims: [claim],
      };
    } else if (command.type === "edit_resume_claim") {
      currentSnapshot = {
        ...currentSnapshot,
        competitive_claims: [{
          ...currentSnapshot.competitive_claims[0],
          selected_resume_claim: command.resume_claim,
          selected_resume_claim_is_edited: command.resume_claim !== generatedText,
          selected_resume_claim_updated_at: new Date().toISOString(),
        }],
      };
    } else if (command.type === "save_targeted_resume_claims") {
      currentSnapshot = {
        ...currentSnapshot,
        targeted_resume_version: {
          resume_claims: [{
            id: "saved-claim-targeted-resume",
            source_claim_id: claim.id,
            resume_claim: currentSnapshot.competitive_claims[0].selected_resume_claim,
            experience_item_id: claim.experience_item_id,
            source_snapshot_id: source.id,
            primary_role_signal: roleSignal,
            prompt_run_id: source.prompt_run_id,
            selected_resume_claim_is_edited: true,
            saved_at: new Date().toISOString(),
          }],
          updated_at: new Date().toISOString(),
        },
        behavior_events: [{
          id: "event-claim-saved",
          event_type: "claim_saved",
          claim_ids: [claim.id],
          created_at: new Date().toISOString(),
        }],
      };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentSnapshot),
    });
  });
  await page.route(`**/api/applications/${created.application_id}/targeted-resume.txt`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: `AI 产品经理 · 目标简历\n\n• ${editedText}\n`,
    });
  });
  await page.route(`**/api/applications/${created.application_id}/targeted-resume.md`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/markdown; charset=utf-8",
      headers: { "Content-Disposition": "attachment; filename=targeted-resume.md" },
      body: `# AI 产品经理 · 目标简历\n\n- ${editedText}\n`,
    });
  });

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await installSession(page, user);
  await page.goto(`/applications/${created.application_id}`);
  await page.getByRole("button", { name: "提取岗位信号" }).click();
  await page.getByRole("button", { name: "生成竞争主张" }).click();

  const claimEditor = page.getByLabel("竞争主张 1");
  await expect(claimEditor).toHaveValue(generatedText);
  await claimEditor.fill(editedText);
  await page.getByRole("heading", { name: "这份简历，只收录你明确保存的主张" }).click();
  await expect.poll(() => observedCommands).toEqual([
    "analyze_target",
    "generate_claims",
    "edit_resume_claim",
  ]);

  await page.reload();
  await expect(page.getByLabel("竞争主张 1")).toHaveValue(editedText);
  await expect(page.getByText("还没有保存任何主张", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存到目标简历" }).click();

  await expect(page.getByText("已保存到目标简历", { exact: true })).toBeVisible();
  expect(observedCommands).toEqual([
    "analyze_target",
    "generate_claims",
    "edit_resume_claim",
    "save_targeted_resume_claims",
  ]);

  await page.reload();
  await expect(page.getByLabel("竞争主张 1")).toHaveValue(editedText);
  await expect(page.getByText(editedText, { exact: true }).last()).toBeVisible();

  await page.getByRole("button", { name: "复制目标简历" }).click();
  await expect(page.getByText("已复制", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(editedText);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Markdown" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const markdown = await readFile(downloadPath!, "utf8");
  expect(markdown).toContain(editedText);
  expect(markdown).not.toContain(stretchText);
});
