import type {
  CandidateProfile,
  ComplianceAdvice,
  DemoVersion,
  InterviewPrepItem,
  MarkdownInput,
  MetricRow,
  OpenSourceProject,
  PathId,
  PortfolioOnePagerDraft,
  RecommendationPath,
  RiskRow,
  SampleJd,
  SampleJdNotice,
  TrialQuestion,
  TrialQuestionId,
} from "./types";

export const demoVersion = "p0-xiaoc-opendocuments" satisfies DemoVersion;

export const priorityPathId =
  "industry-ai-product-assistant" satisfies PathId;

export const sampleJdNotice =
  "样例 JD，用于当前试航和样本趋势参考，不代表具体公司岗位要求或录用判断。" satisfies SampleJdNotice;

export const candidateProfile: CandidateProfile = {
  id: "xiaoc",
  name: "小 C",
  identity: "研二 / 转产品方向探索",
  background: [
    "传统工科硕士，研究方向偏工程系统建模与设备数据分析。",
    "过去项目以实验设计、数据整理、工程报告、跨团队沟通为主。",
    "有文档整理、用户调研、AI 工具使用经验，能读懂工艺、设备、运维类文档。",
  ],
  technicalBasics: [
    "基础 Python / 数据处理",
    "常用 AI 工具使用",
    "对 RAG、知识库问答有初步理解",
  ],
  weaknesses: [
    "缺少企业级系统经验",
    "缺少完整工程项目交付记录",
    "缺少算法研发和线上项目经验证据",
  ],
  goals: ["找到能连接 AI 产品、企业知识库、工程协作的作品集切入点"],
};

export const candidatePolish = {
  advantage:
    "传统工科硕士，能理解工程资料、设备文档和运维语境；有报告整理、基础 Python / 数据处理和 AI 工具使用经验。",
  weakness:
    "缺少完整 AI 项目经历、算法研发经历和企业级系统交付证据。",
  goal:
    "在 3 个月求职窗口内，找到一个能连接工程背景、AI 产品和作品集表达的试航切入点。",
};

export const sampleJds: SampleJd[] = [
  {
    id: "jd-a",
    title: "行业 AI 应用产品助理",
    targetPathId: "industry-ai-product-assistant",
    notice: sampleJdNotice,
    statusLabel: "优先试航",
    scenario:
      "面向制造、工程、能源或设备企业，参与 AI 知识库、文档问答、智能客服或内部助手类产品。",
    responsibilities: [
      "梳理业务资料和用户问题",
      "整理 PRD、用户故事、问答样例和验收口径",
      "确认知识库范围、检索逻辑、引用展示、失败兜底和反馈流程",
      "参与 Demo 测试和用户反馈整理",
    ],
    requirementSignals: [
      "工科或行业背景",
      "能理解技术文档",
      "了解大模型应用、RAG、知识库、Prompt、产品文档",
      "表达清楚，能把模糊需求变成可测试任务",
    ],
    candidateConnection: [
      "有工程资料理解能力和报告能力",
      "适合从行业问题定义与 AI 应用落地切入",
    ],
    gapOrAdvice: ["补一份 AI 知识库场景作品、评估指标和面试解释链路"],
  },
  {
    id: "jd-b",
    title: "行业 AI 解决方案助理",
    targetPathId: "industry-ai-solution-assistant",
    notice: sampleJdNotice,
    statusLabel: "适合探索",
    scenario: "面向企业客户做 AI 应用售前、PoC、方案材料和场景调研。",
    responsibilities: [
      "参与客户访谈纪要",
      "整理行业痛点和业务流程",
      "辅助制作方案 PPT、Demo 脚本、测试用例和交付清单",
      "协调产品、研发和客户侧反馈",
    ],
    requirementSignals: [
      "能理解行业流程",
      "能写清楚方案材料",
      "熟悉常见 AI 应用形态",
      "对数据安全、部署方式、效果评估有基本判断",
    ],
    candidateConnection: [
      "工科背景有利于理解工程企业场景",
      "适合做需求翻译和方案辅助",
    ],
    gapOrAdvice: [
      "需要强化客户沟通话术、方案结构和边界表达",
      "避免把技术方案说得过满",
    ],
  },
  {
    id: "jd-c",
    title: "算法工程 / 大模型研发",
    targetPathId: "algorithm-llm-engineer",
    notice: sampleJdNotice,
    statusLabel: "短期不建议",
    scenario:
      "参与模型训练、检索优化、向量数据库、Embedding、Rerank、微调或评测平台开发。",
    responsibilities: [
      "实现算法模块",
      "处理训练和评估数据",
      "调试模型效果",
      "维护工程代码",
      "阅读论文或复现方法",
    ],
    requirementSignals: [
      "扎实编程能力",
      "机器学习 / 深度学习基础",
      "熟悉 Python、PyTorch、向量检索、模型评估",
      "有可运行项目或实验记录",
    ],
    candidateConnection: [
      "小 C 有基础数据处理能力",
      "当前缺少完整 AI 研发项目和算法工程证据",
    ],
    gapOrAdvice: ["作为长期学习参照，不作为 3 个月内主投方向"],
  },
];

export const openSourceProject: OpenSourceProject = {
  name: "OpenDocuments",
  sourceUrl: "https://github.com/joungminsung/OpenDocuments",
  license: "MIT",
  positioning: "Self-hosted RAG / 企业知识库问答 / AI 文档搜索",
  originalCapabilities: [
    "多来源文档接入",
    "AI 文档搜索",
    "RAG 问答",
    "引用来源展示",
    "Web UI / CLI / MCP 等公开能力",
  ],
  whyForCandidate: [
    "对应企业资料分散、工程文档难找、问答需要引用来源的真实场景",
    "适合围绕它做场景拆解、用户问题设计、指标设计和 Demo 说明",
  ],
  boundaryNotice:
    "本试航基于公开项目信息做产品拆解与场景设计，不表述为本人参与该仓库开发。",
};

export const recommendationPaths: RecommendationPath[] = [
  {
    id: "industry-ai-product-assistant",
    title: "行业 AI 应用产品助理",
    verdict: "priority_trial",
    statusLabel: "优先试航",
    summary:
      "小 C 优先试航“行业 AI 应用产品助理”。这一路径能同时连接样例 JD 任务、小 C 工程背景和 OpenDocuments 的企业知识库问答场景。",
    evidence: [
      {
        title: "JD 证据",
        points: [
          "样例 JD 常见任务包括用户问题梳理、AI 知识库需求拆解、PRD 草稿、问答样例、验收指标和 Demo 测试。",
        ],
      },
      {
        title: "小 C 背景证据",
        points: [
          "小 C 有传统工科背景，能理解工程资料、设备说明、规范文档和跨团队沟通语境，适合从业务问题定义切入。",
        ],
      },
      {
        title: "OpenDocuments 证据",
        points: [
          "OpenDocuments 是 self-hosted RAG / 企业知识库问答 / AI 文档搜索项目，适合拆解文档接入、检索、问答、引用来源、反馈的产品流程。",
        ],
      },
      {
        title: "风险证据",
        points: [
          "小 C 暂无完整 AI 项目经历，不宜把自己写成 AI 工程负责人；应强调产品试航、场景拆解、指标设计。",
        ],
      },
      {
        title: "下一步试航",
        points: [
          "完成工程企业知识库 AI 助手 2 周 MVP 方案，输出问题清单、流程图、指标表、风险清单和作品集一页纸。",
        ],
      },
    ],
  },
  {
    id: "industry-ai-solution-assistant",
    title: "行业 AI 解决方案助理",
    verdict: "explore",
    statusLabel: "适合探索",
    summary:
      "该路径可作为第二选择，用同一个 OpenDocuments 参照补方案结构、PoC 范围和交付边界。",
    evidence: [
      {
        title: "JD 证据",
        points: [
          "样例 JD 常见任务包括客户需求记录、行业场景调研、PoC 材料、方案 PPT、Demo 脚本和交付边界说明。",
        ],
      },
      {
        title: "小 C 背景证据",
        points: [
          "小 C 的工科训练有助于理解工程企业语境，但客户沟通、方案报价、交付管理经验仍需补足。",
        ],
      },
      {
        title: "OpenDocuments 证据",
        points: [
          "OpenDocuments 可作为企业知识库 AI 助手的技术参照，帮助理解解决方案中常见的数据源、部署方式、权限和引用要求。",
        ],
      },
      {
        title: "风险证据",
        points: [
          "解决方案岗位容易把 Demo 说成完整交付能力，需要避免承诺效果、周期、成本和上线结果。",
        ],
      },
      {
        title: "下一步试航",
        points: [
          "基于同一项目写一版工程企业 2 周 PoC 方案，包含范围、角色分工、数据准备、验收指标和不做事项。",
        ],
      },
    ],
  },
  {
    id: "algorithm-llm-engineer",
    title: "算法工程 / 大模型研发",
    verdict: "not_recommended_short_term",
    statusLabel: "短期不建议",
    summary:
      "该路径保留为长期学习参照，P0 不把它作为 3 个月求职主路径。",
    evidence: [
      {
        title: "JD 证据",
        points: [
          "样例 JD 通常要求模型训练、检索优化、Embedding、Rerank、评测实验、工程代码和算法复现经验。",
        ],
      },
      {
        title: "小 C 背景证据",
        points: [
          "小 C 有基础数据处理能力，但缺少完整 AI 研发项目、模型实验记录和工程代码证据。",
        ],
      },
      {
        title: "OpenDocuments 证据",
        points: [
          "OpenDocuments 可以帮助理解 RAG 系统组成，但拆解公开项目不等同于具备算法研发经验。",
        ],
      },
      {
        title: "风险证据",
        points: [
          "短期主投该方向容易出现履历证据不足、面试深挖答不上、项目归属表达不清的问题。",
        ],
      },
      {
        title: "下一步试航",
        points: [
          "作为长期学习路线保留，短期只补 RAG 基础概念和检索评估指标。",
        ],
      },
    ],
  },
];

export const trialQuestions: TrialQuestion[] = [
  {
    id: "project_understanding",
    title: "项目理解",
    prompt: "这个开源项目主要解决什么问题？输入和输出是什么？",
  },
  {
    id: "role_connection",
    title: "岗位连接",
    prompt: "它能帮助你理解哪些 AI 产品或行业解决方案岗位工作？",
  },
  {
    id: "scenario_gap",
    title: "场景缺口",
    prompt:
      "如果放到工程企业资料、规范、合同或施工方案管理场景中，还缺什么？",
  },
  {
    id: "application_solution",
    title: "应用方案",
    prompt: "你会如何设计一个面向工程企业的 2 周试点 MVP？",
  },
  {
    id: "portfolio_extension",
    title: "作品延展",
    prompt: "如果把这次试航做成作品集草稿，你会包含哪些部分？",
  },
  {
    id: "ai_usage_explanation",
    title: "AI 使用说明",
    prompt: "你是否使用 AI 辅助？AI 帮你做了什么？你如何筛选和修改？",
  },
];

export const trialQuestionImpacts: Record<TrialQuestionId, string> = {
  project_understanding:
    "影响 OpenDocuments 来源说明、公开能力理解、项目归属边界。",
  role_connection: "影响路径结论、JD 证据、小 C 背景证据。",
  scenario_gap: "影响风险清单、工程企业场景边界、不可声称内容。",
  application_solution: "影响 2 周 MVP、用户流程草图、指标表。",
  portfolio_extension: "影响作品集一页纸草稿、面试解释材料。",
  ai_usage_explanation:
    "影响免责声明、反包装检查、Markdown 是否可完整导出。",
};

export const demoTrialAnswers: Record<TrialQuestionId, string> = {
  project_understanding:
    "OpenDocuments 主要解决企业资料分散、查找成本高、问答缺少来源依据的问题。输入可以是 GitHub、Notion、Google Drive、本地文件、网页等资料源；输出是基于文档检索生成的问答结果，并尽量展示引用来源，方便人工核验。",
  role_connection:
    "它能帮助我理解 AI 知识库、企业文档搜索、RAG 问答助手这类产品的工作内容，比如需求拆解、资料范围定义、问答样例设计、引用展示、失败兜底和验收指标。它也能帮助我理解解决方案岗位如何把一个开源技术参照转成企业 PoC 方案。",
  scenario_gap:
    "还需要补工程企业自己的资料分级、权限规则、脱敏流程、文档更新机制、术语表、引用原文核验、合同类高风险提示，以及哪些问题不能由 AI 直接回答。尤其是合同、规范和施工方案，不能只追求回答速度，还要明确依据和人工复核节点。",
  application_solution:
    "第 1 到 2 天确定试点范围，只选一类低风险资料，比如设备维护手册或内部操作规范。第 3 到 5 天整理脱敏文档、定义 20 个典型问题。第 6 到 9 天完成知识库导入、问答测试和引用核验。第 10 到 12 天记录失败案例、优化问题表达和兜底提示。第 13 到 14 天输出试点报告，包括命中情况、人工抽检、风险和下一步建议。",
  portfolio_extension:
    "我会包含背景问题、目标用户、MVP 范围、用户流程、样例问题、指标表、风险清单、Demo 截图或流程图、我的试航贡献，以及明确的边界说明：这是基于公开项目的产品拆解与试点设计，不是我参与原项目开发。",
  ai_usage_explanation:
    "我使用 AI 辅助整理公开项目信息、归纳岗位任务、生成初版问题清单和文案草稿。我会人工核对 GitHub 仓库、License 和 README 信息，删除过度承诺、能力背书、求职结果预测、项目包装类表达，并把最终内容改成我能解释清楚的版本。",
};

export const portfolioDraft: PortfolioOnePagerDraft = {
  title: "工程企业知识库 AI 助手试航",
  author: "小 C",
  targetRole: "行业 AI 应用产品助理",
  problemBackground:
    "工程企业资料常分散在手册、SOP、项目文档和会议纪要中，新人或跨项目成员查找成本高，且难以判断答案来源。",
  solutionOverview:
    "参考 OpenDocuments 的自托管 RAG 和文档搜索思路，设计一个面向工程资料的知识库问答助手，支持文档导入、自然语言提问、引用来源展示和反馈记录。",
  mvpScope: "文档上传 / 索引、问答、引用展示、人工反馈、无依据问题兜底。",
  evaluationMetrics: [
    "引用覆盖率",
    "人工抽检通过率",
    "无依据问题识别",
    "典型问题完成时间",
    "用户反馈记录率",
  ],
  outputs: [
    "用户问题清单",
    "PRD 草稿",
    "Demo 脚本",
    "验收指标",
    "风险清单",
    "面试说明材料",
  ],
  boundaryNotice:
    "本作品是基于公开项目信息的场景拆解与产品试航，不表述为本人参与原仓库开发。",
};

export const portfolioPolishBoundary =
  "这是一页作品集表达草稿，用于整理问题、方案、指标和边界。它不是正式简历，不代表岗位能力认证，也不声明小 C 参与 OpenDocuments 官方贡献。";

export const metricRows: MetricRow[] = [
  {
    dimension: "路径连接",
    metric: "岗位任务重合度",
    trialCriterion: "是否覆盖需求拆解、问答设计、指标设计、风险说明",
  },
  {
    dimension: "行业理解",
    metric: "场景准确性",
    trialCriterion: "问题是否来自工程文档真实使用场景",
  },
  {
    dimension: "产品表达",
    metric: "PRD 完整度",
    trialCriterion: "是否包含用户、流程、范围、验收、边界",
  },
  {
    dimension: "RAG 理解",
    metric: "引用意识",
    trialCriterion: "是否要求答案展示来源并支持人工核验",
  },
  {
    dimension: "质量评估",
    metric: "人工抽检通过率",
    trialCriterion: "样例问题由人工核对是否被文档支持",
  },
  {
    dimension: "风险控制",
    metric: "敏感信息处理",
    trialCriterion: "是否使用脱敏资料并说明权限边界",
  },
  {
    dimension: "面试准备",
    metric: "追问可解释性",
    trialCriterion: "是否能解释为何这样定范围和指标",
  },
];

export const flowSketchSteps = [
  "限定低风险工程资料范围，例如设备维护手册或内部操作规范。",
  "整理脱敏文档与术语表，形成试点资料包。",
  "设计 20 个典型问题，覆盖查找、解释、引用核验和无依据问题。",
  "导入资料并完成问答测试，记录引用是否可核验。",
  "整理失败案例、人工反馈、风险边界和下一步建议。",
];

export const riskRows: RiskRow[] = [
  {
    risk: "项目归属误解",
    signal: "把公开仓库说成个人开发成果",
    suggestion: "明确写场景拆解与试航产出",
  },
  {
    risk: "过度承诺",
    signal: "说系统能稳定解决所有问答",
    suggestion: "改为用于特定资料范围内辅助检索",
  },
  {
    risk: "数据安全",
    signal: "使用真实企业资料演示",
    suggestion: "使用脱敏或自建样例资料",
  },
  {
    risk: "幻觉答案",
    signal: "模型生成无依据内容",
    suggestion: "强制引用来源，无依据时提示无法确认",
  },
  {
    risk: "岗位错配",
    signal: "短期主投算法研发",
    suggestion: "先以应用产品和方案助理为主",
  },
  {
    risk: "技术深度不足",
    signal: "被追问检索、切分、评估细节",
    suggestion: "准备基础解释和可验证指标",
  },
];

export const complianceAdvice: ComplianceAdvice = {
  allowed: [
    "基于公开项目做场景拆解。",
    "用于展示我对工程企业知识库问答场景的理解。",
    "该试航帮助我梳理岗位任务、准备作品集和面试说明。",
    "结果仅作为求职准备参考。",
  ],
  avoid: [
    "不要说已经具备该岗位全部要求。",
    "不要说这个项目能直接证明自己胜任。",
    "不要做录用结果预测。",
    "不要把 OpenDocuments 说成自己的项目。",
  ],
};

export const markdownExportItems = [
  "候选人背景",
  "路径结论",
  "样例 JD 说明",
  "OpenDocuments 来源与 License",
  "OpenDocuments 公开能力",
  "小 C 试航产出",
  "不可声称内容",
  "6 问作答",
  "免责声明",
];

export const forbiddenClaimsNotice =
  "不可声称：小 C 开发了 OpenDocuments、完成了企业级 RAG 系统、具备算法研发能力、获得岗位认证、提升录用概率，或 AI 可替代合同 / 规范 / 施工方案的人工复核。";

export const traceChain =
  "样例 JD + 小 C 背景 + OpenDocuments 公开来源 -> 6 问试航 -> 航迹表 / 作品集草稿 / Markdown";

export const interviewPrep: InterviewPrepItem[] = [
  {
    question: "你为什么不主投算法岗？",
    answer:
      "我当前更强的是工程场景理解和产品化表达，算法研发还需要更长时间补代码、模型和实验积累，所以先从行业 AI 应用产品切入。",
  },
  {
    question: "RAG 项目里你最关注什么？",
    answer:
      "我关注资料范围、引用来源、失败兜底和人工评估，因为企业知识库问答不能只看回答是否流畅。",
  },
  {
    question: "你具体做了什么？",
    answer:
      "我做的是场景拆解、用户问题、MVP 范围、指标、风险和演示材料，不把公开仓库开发归到自己名下。",
  },
  {
    question: "如果答案错了怎么办？",
    answer:
      "需要展示引用、允许反馈、记录问题类型，并对无依据问题给出无法确认提示，而不是继续生成看似确定的回答。",
  },
];

export const pageCopy = {
  fixedDemoNotice:
    "先查看小 C 的背景和 3 条样例 JD。当前版本聚焦固定样例，确保路径判断和结果材料可追溯。",
  entrySubtitle:
    "基于小 C 背景、样例 JD 和 OpenDocuments 公开参考项目，完成一次可追溯的 AI 求职路径试航。",
  entryScope:
    "当前试航聚焦 1 位候选人、3 条路径、1 个开源项目、1 个试航任务和 1 种导出格式。",
  entryBoundaryNotice:
    "这不是简历包装工具，也不做能力认证、企业推荐或录用预测。它只帮助小 C 把路径判断、试航作答和边界说明整理成可追溯材料。",
  entryBoundary: [
    "用户：小 C",
    "项目：OpenDocuments",
    "任务：工程企业知识库 AI 助手试航",
    "导出：Markdown",
  ],
  recommendationConclusion:
    "小 C 优先试航“行业 AI 应用产品助理”。这一路径能同时连接样例 JD 任务、小 C 工程背景和 OpenDocuments 的企业知识库问答场景。",
  trialBoundary:
    "OpenDocuments 提供公开来源参照；小 C 需要完成的是把它放进工程企业知识库场景，形成试点方案、指标、风险和作品集表达。结果页会区分开源项目能力与个人试航产出，避免把公开项目写成个人开发成果。",
  missingQuestions:
    "还有试航问题未完成。缺项会使结果页缺少对应追溯链，暂不能导出完整 Markdown。",
  aiUsageBlocker:
    "请先补充“AI 使用说明”。这是反包装检查的必要项，未说明 AI 如何辅助和如何人工筛选时，不能导出完整 Markdown。",
  resultBoundary:
    "本结果是一次求职路径试航记录和作品集起点，不构成能力认证、录用判断、职业承诺或开源项目贡献声明。",
  markdownExportDescription:
    "完整 Markdown 仅在 6 问全部完成后生成。导出内容包含候选人背景、路径结论、样例 JD 说明、OpenDocuments 来源与 License、OpenDocuments 公开能力、小 C 试航产出、不可声称内容、6 问作答和免责声明。",
};

export function getRecommendationPath(pathId: PathId): RecommendationPath {
  return (
    recommendationPaths.find((path) => path.id === pathId) ??
    recommendationPaths[0]
  );
}

export function createMarkdownInput(
  selectedPathId: PathId,
  trialAnswers: MarkdownInput["trialAnswers"],
): MarkdownInput {
  return {
    demoVersion,
    profile: candidateProfile,
    sampleJdNotice,
    sampleJds,
    openSourceProject,
    selectedPath: getRecommendationPath(selectedPathId),
    trialQuestions,
    trialAnswers,
    portfolioDraft,
    metrics: metricRows,
    risks: riskRows,
    complianceAdvice,
    interviewPrep,
  };
}
