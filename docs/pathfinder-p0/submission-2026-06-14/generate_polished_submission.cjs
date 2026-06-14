const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const REPO_ROOT = path.resolve(ROOT, "..", "..", "..");
const FRONTEND_ROOT = path.join(REPO_ROOT, "frontend");
const { chromium } = require(path.join(
  FRONTEND_ROOT,
  "node_modules",
  "@playwright",
  "test",
));

const BASE_URL = process.env.PATHFINDER_BASE_URL || "http://127.0.0.1:3027";
const SCREENSHOT_DIR = path.join(ROOT, "screenshots");

const productName = "寻径星图：帮转型求职者找到 AI 岗位切入点";
const productIntro = [
  "很多学生和早期求职者想进入 AI 行业，但并不清楚自己的专业、项目和实习经历能对应哪些岗位，也不知道该做什么准备来应对求职。",
  "寻径星图从这个问题出发：用户可以上传简历，也可以和 AI 聊自己的真实经历。系统会把经历整理成可确认的背景线索，再生成一张个人 AI 求职星图。星图里有基于真实 JD 样本提炼出的 AI 岗位星点，覆盖产品、开发、数据评测和运营增长等方向。用户可以看到当前更值得探索的几个岗位，也可以点开其他星点了解岗位任务、常见工作内容和适合的准备方式。",
  "在确定方向后，产品会给出对应的适航任务。开发方向可以从开源项目拆解开始，产品方向可以用 Vibe Coding 做一个原型，运营方向可以设计一次 AI 工具体验营。最后生成一份试航成果包，帮助用户把这次探索沉淀成岗位理解、任务产出和后续打磨计划。",
];

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphList(items) {
  return items.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n");
}

function bulletList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

async function setupRoutes(page) {
  const resumeSignals = [
    {
      signalId: "resume-domain-material",
      category: "domain_material",
      label: "工程资料与项目协作背景",
      sourceMessageIds: [],
      evidenceText:
        "参与过资料整理、流程梳理和跨团队沟通，能把分散信息整理成结构化材料。",
      confidence: "medium",
      status: "candidate",
    },
    {
      signalId: "resume-ai-tool-usage",
      category: "ai_tool_usage",
      label: "AI 工具使用经验",
      sourceMessageIds: [],
      evidenceText:
        "使用过 ChatGPT、Kimi、Cursor 等工具辅助提纲、表格和初稿，并进行人工核对。",
      confidence: "medium",
      status: "candidate",
    },
    {
      signalId: "resume-career-goal",
      category: "goal",
      label: "希望探索 AI 产品和运营增长方向",
      sourceMessageIds: [],
      evidenceText:
        "关注行业 AI 应用、知识库产品和 AI 工具推广，希望找到可落地的作品集切入点。",
      confidence: "medium",
      status: "candidate",
    },
    {
      signalId: "resume-project-experience",
      category: "project_experience",
      label: "有可复盘的项目协作经历",
      sourceMessageIds: [],
      evidenceText:
        "有课程项目、实习协作和文档交付经历，可以转化为岗位理解和试航任务材料。",
      confidence: "medium",
      status: "candidate",
    },
  ];

  await page.route("**/api/pathfinder/resume/parse", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "resume_upload",
        fileName: "pathfinder-sample-resume.txt",
        fileType: "txt",
        textLength: 886,
        modelProvider: "deepseek",
        modelName: "deepseek-v4-flash",
        modelStatus: "ok",
        readiness: "ready",
        missingSignalTypes: [],
        userMessage:
          "已整理出可确认的经历线索。这些信号足够生成第一版星图，请先核对并确认。",
        signals: resumeSignals,
      }),
    });
  });

  await page.route("**/api/pathfinder/recommendations", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ detail: "fallback to local recommendation" }),
    });
  });
}

async function screenshot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, name),
    fullPage: false,
  });
}

async function clickIfVisible(page, pattern) {
  const locator = page.getByRole("button", { name: pattern }).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    return true;
  }
  return false;
}

async function captureProductScreenshots() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  await setupRoutes(page);

  await page.goto(`${BASE_URL}/pathfinder`, { waitUntil: "networkidle" });
  await screenshot(page, "01-entry.png");

  const resumeText = [
    "工程管理背景，参与过项目资料整理、流程梳理和跨团队沟通。",
    "使用过 ChatGPT、Kimi 和 Cursor 辅助整理提纲、表格和初稿，最终会人工核对。",
    "希望转向 AI 产品、AI 运营或行业 AI 应用方向。",
  ].join("\n");
  const sampleResumePath = path.join(ROOT, "sample-resume-for-screenshot.txt");
  writeUtf8(sampleResumePath, resumeText);
  await page.locator("#resume-upload").setInputFiles(sampleResumePath);
  await page.waitForURL("**/pathfinder/background", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await screenshot(page, "02-resume-signals.png");

  await page
    .getByRole("button", { name: /确认信号并查看星图|保存背景并生成星图/ })
    .first()
    .click();
  await page.waitForURL("**/pathfinder/recommendation", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await screenshot(page, "03-star-map.png");

  await clickIfVisible(page, /生成开发岗适航任务/);
  await page.waitForTimeout(1400);
  if (!page.url().includes("/pathfinder/trial")) {
    await page.goto(`${BASE_URL}/pathfinder/trial`, { waitUntil: "networkidle" });
  }
  const answers = [
    "我把这个公开项目理解为一个文档问答和知识库搜索参考，它能帮助用户把分散资料接入系统，再通过检索和问答找到可核验的信息来源。",
    "它能连接到 AI 产品助理、AI 解决方案助理和 RAG 应用相关岗位，尤其适合理解需求拆解、问答样例、引用展示和验收边界。",
    "如果放到工程企业场景，还需要补充资料分级、权限、脱敏、术语表、引用核验、人工复核和高风险内容提示。",
    "我会先选一类低风险资料做两周试点，整理 20 个典型问题，完成导入、问答测试、引用核验、失败案例记录和试点报告。",
    "作品集会包含背景问题、目标用户、MVP 范围、用户流程、指标表、风险清单、我的试航贡献和开源项目归属边界。",
    "我会说明 AI 只辅助整理公开信息和草稿结构，最终内容由我筛选、核验和改写，不声称自己开发或参与了原开源项目。",
  ];
  const textareas = page.locator("textarea");
  const count = await textareas.count();
  for (let index = 0; index < Math.min(count, answers.length); index += 1) {
    await textareas.nth(index).fill(answers[index]);
  }
  await page.waitForTimeout(700);
  await screenshot(page, "04-trial-task.png");

  await page.goto(`${BASE_URL}/pathfinder/result`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await screenshot(page, "05-outcome-package.png");

  await browser.close();
  fs.rmSync(sampleResumePath, { force: true });
}

const htmlShell = (title, body, extra = "") => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --ink: #101820;
      --muted: #5a6673;
      --paper: #f7f3ea;
      --paper-2: #fffdf8;
      --teal: #0f766e;
      --teal-2: #14b8a6;
      --gold: #d99a2b;
      --line: rgba(16, 24, 32, .13);
      --night: #07111f;
      --cyan: #7dd3fc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: "Microsoft YaHei", "Noto Sans CJK SC", "PingFang SC", sans-serif;
      line-height: 1.6;
    }
    p { margin: 0 0 12px; }
    ul { margin: 0; padding-left: 1.2em; }
    li { margin: 0 0 8px; }
    .eyebrow {
      color: var(--teal);
      font-weight: 700;
      letter-spacing: .08em;
      font-size: 12px;
      text-transform: uppercase;
    }
    .muted { color: var(--muted); }
    .chip {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 11px;
      color: var(--muted);
      background: rgba(255,255,255,.68);
      font-size: 12px;
      margin: 0 8px 8px 0;
    }
    .screenshot {
      display: block;
      width: 100%;
      border: 1px solid rgba(15, 118, 110, .18);
      border-radius: 18px;
      box-shadow: 0 18px 60px rgba(7, 17, 31, .16);
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 22px;
      background: rgba(255, 253, 248, .88);
      box-shadow: 0 16px 44px rgba(16, 24, 32, .08);
    }
    .dark-panel {
      color: white;
      background:
        radial-gradient(circle at 18% 20%, rgba(20,184,166,.25), transparent 26%),
        radial-gradient(circle at 78% 12%, rgba(125,211,252,.20), transparent 22%),
        linear-gradient(135deg, #07111f 0%, #0d1f2f 55%, #102b2c 100%);
      border: 1px solid rgba(125, 211, 252, .2);
      box-shadow: 0 24px 80px rgba(7, 17, 31, .24);
    }
    .dark-panel .muted { color: rgba(255,255,255,.72); }
    .starfield {
      position: relative;
      overflow: hidden;
    }
    .starfield::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        radial-gradient(circle, rgba(255,255,255,.65) 0 1px, transparent 1.6px),
        linear-gradient(rgba(125,211,252,.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(125,211,252,.08) 1px, transparent 1px);
      background-size: 34px 34px, 72px 72px, 72px 72px;
      opacity: .42;
      mask-image: linear-gradient(120deg, black, transparent 78%);
    }
    .starfield > * { position: relative; z-index: 1; }
    ${extra}
  </style>
</head>
<body>
${body}
</body>
</html>`;

function buildBriefHtml() {
  const body = `
  <main class="brief">
    <section class="brief-page cover starfield dark-panel">
      <div>
        <div class="eyebrow">AI + 求职 / 参赛作品</div>
        <h1>寻径星图</h1>
        <p class="lead">帮学生和早期求职者找到 AI 岗位切入点</p>
        <div class="cover-copy">${paragraphList(productIntro)}</div>
        <div class="chips">
          <span class="chip">简历上传</span>
          <span class="chip">AI 追问</span>
          <span class="chip">岗位星图</span>
          <span class="chip">适航任务</span>
          <span class="chip">成果包</span>
        </div>
      </div>
      <img class="cover-shot" src="screenshots/01-entry.png" alt="寻径星图首页截图" />
    </section>

    <section class="brief-page">
      <div class="page-grid">
        <div>
          <div class="eyebrow">01 / 用户问题</div>
          <h2>他们缺的不是一句建议，而是一条能走下去的路径</h2>
          <p>很多早期求职者有课程项目、实习、活动或工具使用经历，却很难判断这些经历能连接到哪些 AI 岗位。寻径星图把入口放在真实经历上，让用户先确认自己的背景线索，再进入岗位探索。</p>
          <div class="panel">
            ${bulletList([
              "上传简历，或通过 AI 访谈补充真实经历。",
              "系统整理候选背景线索，用户可以编辑和确认。",
              "确认后的线索用于生成个人 AI 求职星图。",
              "结果只用于求职准备，不做能力认证和录用预测。",
            ])}
          </div>
        </div>
        <img class="screenshot" src="screenshots/02-resume-signals.png" alt="背景线索确认页" />
      </div>
    </section>

    <section class="brief-page star-map-page">
      <div class="eyebrow">02 / 星图探索</div>
      <h2>把 AI 岗位变成可以点击、比较和试航的星点</h2>
      <p>星图里的岗位星点来自当前样例 JD 和样本趋势参考，覆盖产品、开发、数据评测和运营增长等方向。用户可以看到 Top 3 探索方向，也可以点开其他星点理解岗位任务和准备方式。</p>
      <img class="screenshot hero-shot" src="screenshots/03-star-map.png" alt="岗位星图页" />
    </section>

    <section class="brief-page">
      <div class="page-grid three">
        <div>
          <div class="eyebrow">03 / 适航任务</div>
          <h2>方向确定后，给用户一件能继续打磨的任务</h2>
          <p>适航任务不局限于开源项目。开发、产品、运营方向分别对应不同准备方式，让用户把岗位理解落到具体产出上。</p>
        </div>
        <div class="panel">
          <h3>开发方向</h3>
          <p>从已审计开源项目拆解和场景改造开始，形成项目理解、技术边界和面试追问准备。</p>
        </div>
        <div class="panel">
          <h3>产品方向</h3>
          <p>用 Vibe Coding 做一个可讲清楚的产品原型，沉淀用户流程、PRD 摘要和验收指标。</p>
        </div>
        <div class="panel">
          <h3>运营方向</h3>
          <p>设计一次 AI 工具体验营，覆盖目标人群、活动节奏、内容日历和复盘指标。</p>
        </div>
      </div>
      <img class="screenshot task-shot" src="screenshots/04-trial-task.png" alt="适航任务页" />
    </section>

    <section class="brief-page">
      <div class="page-grid">
        <div>
          <div class="eyebrow">04 / 适航成果包</div>
          <h2>把一次探索沉淀成岗位理解、任务产出和后续计划</h2>
          ${bulletList([
            "岗位星点结论：当前更值得探索的方向。",
            "证据链：来自用户确认线索、样例 JD 和任务材料。",
            "任务产出：围绕开发、产品或运营方向形成可继续打磨的材料。",
            "边界说明：不包装经历，不声称开源项目归属，不预测录用结果。",
          ])}
        </div>
        <div class="panel outcome-card">
          <h3>适航成果包包含什么</h3>
          ${bulletList([
            "岗位理解：用户为什么值得从这个方向开始探索。",
            "任务产出：本次试航可以沉淀哪些作品集材料。",
            "证据链：用户背景、样例 JD 和试航任务如何对应。",
            "边界说明：哪些内容不能写成个人原创、认证或录用承诺。",
            "打磨计划：未来 3 天和 7 天继续完善的动作。",
          ])}
        </div>
      </div>
    </section>
  </main>`;

  const css = `
    @page { size: A4; margin: 0; }
    .brief-page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm;
      page-break-after: always;
      background:
        linear-gradient(120deg, rgba(20,184,166,.07), transparent 42%),
        var(--paper);
    }
    .brief-page:last-child { page-break-after: auto; }
    .cover {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 22px;
      padding: 18mm;
    }
    h1 { font-size: 58px; line-height: 1; margin: 14px 0 12px; letter-spacing: 0; }
    h2 { font-size: 31px; line-height: 1.2; margin: 10px 0 14px; letter-spacing: 0; }
    h3 { font-size: 18px; margin: 0 0 8px; }
    .lead { font-size: 22px; color: rgba(255,255,255,.82); margin-bottom: 20px; }
    .cover-copy { max-width: 680px; color: rgba(255,255,255,.82); font-size: 13px; }
    .cover-shot { width: 100%; border-radius: 24px; border: 1px solid rgba(255,255,255,.2); box-shadow: 0 28px 80px rgba(0,0,0,.35); }
    .chips { margin-top: 20px; }
    .page-grid { display: grid; grid-template-columns: .82fr 1.18fr; gap: 24px; align-items: center; }
    .page-grid.three { grid-template-columns: 1.15fr 1fr 1fr; gap: 14px; align-items: stretch; }
    .page-grid.three > :first-child { grid-row: span 2; }
    .hero-shot { margin-top: 18px; }
    .task-shot { margin-top: 18px; max-height: 126mm; object-fit: cover; object-position: top; }
  `;
  return htmlShell("寻径星图作品说明", body, css);
}

function buildDeckHtml() {
  const slide = (inner, className = "") =>
    `<section class="slide ${className}">${inner}</section>`;
  const titleBlock = (kicker, title, subtitle = "") => `
    <div class="kicker">${escapeHtml(kicker)}</div>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="slide-sub">${escapeHtml(subtitle)}</p>` : ""}
  `;

  const body = `
  <main class="deck">
    ${slide(`
      <div class="title-copy">
        ${titleBlock("AI + 求职", "寻径星图", "帮学生和早期求职者找到 AI 岗位切入点")}
        <div class="title-tags">
          <span>简历上传</span><span>AI 追问</span><span>岗位星图</span><span>适航任务</span><span>成果包</span>
        </div>
      </div>
      <img src="screenshots/01-entry.png" alt="首页" />
    `, "title-slide starfield dark-panel")}

    ${slide(`
      ${titleBlock("01", "用户真正卡住的是方向判断")}
      <div class="columns">
        <div class="big-point">很多早期求职者有经历，但不知道这些经历能对应哪些 AI 岗位。</div>
        <div class="panel">${bulletList([
          "不了解岗位任务和常见交付物。",
          "不知道该补项目、补工具，还是先补岗位理解。",
          "容易直接改简历或海投岗位，缺少准备路径。",
        ])}</div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("02", "先整理真实经历，再生成星图")}
      <div class="shot-layout">
        <img src="screenshots/02-resume-signals.png" alt="背景线索" />
        <div class="panel">${bulletList([
          "用户可以上传简历，也可以和 AI 聊经历。",
          "系统整理的是候选背景线索。",
          "用户确认后，线索才进入后续推荐。",
        ])}</div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("03", "把 AI 岗位做成一张可以探索的星图")}
      <img class="wide-shot" src="screenshots/03-star-map.png" alt="岗位星图" />
    `, "image-slide")}

    ${slide(`
      ${titleBlock("04", "星图里有 12 个岗位星点")}
      <div class="grid-4">
        <div class="panel"><h3>产品 / 应用</h3><p>AI 产品助理、知识库产品、解决方案助理。</p></div>
        <div class="panel"><h3>开发 / 工程</h3><p>大模型应用、RAG 应用、实施交付。</p></div>
        <div class="panel"><h3>数据 / 评测</h3><p>数据评测、标注质检、反馈分析。</p></div>
        <div class="panel"><h3>运营 / 增长</h3><p>AI 工具运营、内容增长、体验营策划。</p></div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("05", "适航任务让准备动作落到产出")}
      <div class="grid-3">
        <div class="panel"><h3>开发方向</h3><p>从已审计开源项目拆解和场景改造开始。</p></div>
        <div class="panel"><h3>产品方向</h3><p>用 Vibe Coding 做一个可讲清楚的产品原型。</p></div>
        <div class="panel"><h3>运营方向</h3><p>设计一次 AI 工具体验营，沉淀活动策划和复盘材料。</p></div>
      </div>
      <img class="small-shot" src="screenshots/04-trial-task.png" alt="适航任务" />
    `)}

    ${slide(`
      ${titleBlock("06", "结果是一份适航成果包")}
      <div class="columns">
        <div class="big-point">成果包帮助用户把一次探索整理成可以继续打磨的求职准备材料。</div>
        <div class="panel">${bulletList([
          "岗位星点结论",
          "背景线索和证据链",
          "适航任务产出",
          "边界说明和后续打磨计划",
        ])}</div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("07", "边界清楚，表达克制")}
      <div class="columns">
        <div class="big-point">寻径星图帮助用户准备求职材料，不替用户包装经历。</div>
        <div class="panel">${bulletList([
          "不做能力认证。",
          "不预测录用概率。",
          "不做企业筛选。",
          "不把开源项目写成个人原创贡献。",
        ])}</div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("08", "当前完成度")}
      <div class="grid-3">
        <div class="panel"><h3>产品闭环</h3><p>入口、背景线索、星图、任务和成果包已贯通。</p></div>
        <div class="panel"><h3>真实能力</h3><p>已接入简历解析和 AI 访谈，支持用户确认线索。</p></div>
        <div class="panel"><h3>数据基础</h3><p>已有岗位数据、样例 JD、审计项目库和任务包 fixture。</p></div>
      </div>
    `)}

    ${slide(`
      ${titleBlock("09", "下一步产品化")}
      <div class="columns">
        <div class="big-point">从参赛演示走向真实可用产品，重点是提高推荐解释质量和任务产出质量。</div>
        <div class="panel">${bulletList([
          "继续提升简历解析和 AI 追问体验。",
          "扩展岗位星点与适航任务库。",
          "补齐历史记录、正式权限和用户反馈闭环。",
        ])}</div>
      </div>
    `)}

    ${slide(`
      <div class="final-line">寻径星图帮助早期求职者先找准 AI 岗位切入点，再用一次适航任务形成可解释、可追溯、可继续打磨的准备材料。</div>
    `, "final-slide starfield dark-panel")}
  </main>`;

  const css = `
    @page { size: 16in 9in; margin: 0; }
    body { background: #0a111d; }
    .slide {
      width: 16in;
      height: 9in;
      page-break-after: always;
      padding: 58px 68px;
      background:
        linear-gradient(120deg, rgba(20,184,166,.12), transparent 38%),
        #f7f3ea;
      overflow: hidden;
    }
    .slide:last-child { page-break-after: auto; }
    .title-slide {
      display: grid;
      grid-template-columns: .82fr 1.18fr;
      gap: 38px;
      align-items: center;
    }
    .title-slide img,
    .wide-shot,
    .shot-layout img,
    .small-shot {
      width: 100%;
      border-radius: 26px;
      border: 1px solid rgba(15, 118, 110, .2);
      box-shadow: 0 24px 80px rgba(7, 17, 31, .24);
    }
    .title-slide h1 { font-size: 86px; color: white; margin: 16px 0; line-height: .95; letter-spacing: 0; }
    .title-slide .slide-sub { font-size: 25px; color: rgba(255,255,255,.8); }
    .title-tags span {
      display: inline-flex;
      margin: 12px 8px 0 0;
      padding: 9px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.2);
      color: rgba(255,255,255,.82);
      background: rgba(255,255,255,.08);
      font-size: 14px;
    }
    .kicker { color: var(--teal); font-size: 15px; font-weight: 800; letter-spacing: .08em; }
    .dark-panel .kicker { color: var(--cyan); }
    .slide h1 { font-size: 52px; line-height: 1.08; margin: 12px 0 20px; letter-spacing: 0; }
    .slide-sub { font-size: 23px; color: var(--muted); max-width: 760px; }
    .columns { display: grid; grid-template-columns: 1.2fr .8fr; gap: 34px; align-items: center; margin-top: 40px; }
    .big-point { font-size: 42px; line-height: 1.22; font-weight: 800; color: #111827; }
    .grid-3, .grid-4 { display: grid; gap: 20px; margin-top: 34px; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-3 .panel, .grid-4 .panel { min-height: 230px; }
    .panel h3 { font-size: 26px; margin: 0 0 14px; }
    .panel p, .panel li { font-size: 20px; }
    .shot-layout { display: grid; grid-template-columns: 1.28fr .72fr; gap: 28px; align-items: center; margin-top: 22px; }
    .wide-shot { margin-top: 12px; height: 660px; object-fit: cover; object-position: top; }
    .small-shot { margin-top: 24px; height: 360px; object-fit: cover; object-position: top; }
    .final-slide { display: flex; align-items: center; justify-content: center; }
    .final-line { max-width: 1160px; color: white; font-size: 50px; line-height: 1.28; font-weight: 800; text-align: center; }
  `;
  return htmlShell("寻径星图演示文件", body, css);
}

async function renderPdfFromHtml(browser, htmlFile, pdfFile, pdfOptions) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlFile.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle",
  });
  await page.pdf({
    path: pdfFile,
    printBackground: true,
    preferCSSPageSize: true,
    ...pdfOptions,
  });
  await page.close();
}

async function renderMaterials() {
  const briefHtmlPath = path.join(ROOT, "01-pathfinder-product-brief.html");
  const deckHtmlPath = path.join(ROOT, "02-pathfinder-demo-deck.html");
  writeUtf8(briefHtmlPath, buildBriefHtml());
  writeUtf8(deckHtmlPath, buildDeckHtml());

  const browser = await chromium.launch({ headless: true });
  await renderPdfFromHtml(
    browser,
    briefHtmlPath,
    path.join(ROOT, "01-pathfinder-product-brief.pdf"),
    { format: "A4" },
  );
  await renderPdfFromHtml(
    browser,
    deckHtmlPath,
    path.join(ROOT, "02-pathfinder-demo-deck.pdf"),
    { width: "16in", height: "9in" },
  );
  await browser.close();
}

function rebuildAttachmentZip() {
  const zipPath = path.join(ROOT, "03-pathfinder-attachments.zip");
  fs.rmSync(zipPath, { force: true });
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `$items = @('${SCREENSHOT_DIR.replace(/'/g, "''")}', '${path
        .join(ROOT, "作品信息.md")
        .replace(/'/g, "''")}', '${path
        .join(ROOT, "作品说明文档.md")
        .replace(/'/g, "''")}', '${path
        .join(ROOT, "演示讲稿.md")
        .replace(/'/g, "''")}', '${path
        .join(ROOT, "提交材料清单.md")
        .replace(/'/g, "''")}'); Compress-Archive -LiteralPath $items -DestinationPath '${zipPath.replace(
        /'/g,
        "''",
      )}' -Force`,
    ],
    { stdio: "inherit" },
  );
}

(async () => {
  await captureProductScreenshots();
  await renderMaterials();
  rebuildAttachmentZip();
  const outputs = [
    "01-pathfinder-product-brief.html",
    "01-pathfinder-product-brief.pdf",
    "02-pathfinder-demo-deck.html",
    "02-pathfinder-demo-deck.pdf",
    "03-pathfinder-attachments.zip",
  ];
  for (const output of outputs) {
    const target = path.join(ROOT, output);
    console.log(`${target}\t${fs.statSync(target).size}`);
  }
})();
