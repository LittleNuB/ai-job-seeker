import {
  currentTrialPackageId,
  type ComplianceAdvice,
  type DemoVersion,
  type InterviewPrepItem,
  type MarkdownInput,
  type MetricRow,
  type OpenSourceProject,
  type PathId,
  type PortfolioOnePagerDraft,
  type RecommendationPath,
  type RiskRow,
  type SampleJd,
  type SampleJdNotice,
  type TrialQuestion,
  type TrialQuestionId,
  type UserProfileInput,
} from "./types";

export const demoVersion = currentTrialPackageId satisfies DemoVersion;

export const priorityPathId =
  "industry-ai-product-assistant" satisfies PathId;

export const sampleJdNotice =
  "样例 JD，用于当前试航和样本趋势参考，不代表具体公司岗位要求或录用判断。" satisfies SampleJdNotice;

export const emptyUserProfile: UserProfileInput = {
  displayName: "",
  professionalBackground: "",
  jobTarget: "",
  timeline: "",
  projectExperience: "",
  aiToolExperience: "",
  technicalBasics: "",
  currentConfusion: "",
  constraints: "",
};

export const userProfileFields: Array<{
  key: keyof UserProfileInput;
  label: string;
  required?: boolean;
  rows?: number;
  placeholder: string;
}> = [
  {
    key: "displayName",
    label: "姓名或称呼（可选）",
    placeholder: "可留空；导出时会使用“候选人”。",
  },
  {
    key: "professionalBackground",
    label: "专业 / 背景",
    required: true,
    rows: 4,
    placeholder: "写你的专业、学历、行业背景或过去主要工作类型。",
  },
  {
    key: "jobTarget",
    label: "求职目标",
    required: true,
    rows: 3,
    placeholder: "写你想试航的 AI 产品、解决方案、行业应用或相关方向。",
  },
  {
    key: "timeline",
    label: "求职时间线",
    required: true,
    rows: 3,
    placeholder: "例如 1 个月内整理作品集、3 个月内投递、先探索方向等。",
  },
  {
    key: "projectExperience",
    label: "工程 / 行业经历",
    required: true,
    rows: 4,
    placeholder: "写你做过的项目、流程、文档、调研、协作或交付经历。",
  },
  {
    key: "aiToolExperience",
    label: "AI 工具经历",
    required: true,
    rows: 3,
    placeholder: "写你用过哪些 AI 工具，用来做什么，哪些内容会人工确认。",
  },
  {
    key: "technicalBasics",
    label: "技术基础",
    required: true,
    rows: 3,
    placeholder: "写编程、数据处理、文档系统、产品工具、提示词或基础概念。",
  },
  {
    key: "currentConfusion",
    label: "当前困惑",
    required: true,
    rows: 3,
    placeholder: "写你不确定的方向、证据缺口、表达边界或面试担心点。",
  },
  {
    key: "constraints",
    label: "限制条件",
    required: true,
    rows: 3,
    placeholder: "写时间、地点、行业偏好、技术短板、不能公开的材料等限制。",
  },
];

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
      "梳理业务资料和用户问题。",
      "整理 PRD、用户故事、问答样例和验收口径。",
      "确认知识库范围、检索逻辑、引用展示、失败兜底和反馈流程。",
      "参与 Demo 测试和用户反馈整理。",
    ],
    requirementSignals: [
      "行业或工程背景。",
      "能理解技术文档和业务流程。",
      "了解大模型应用、RAG、知识库、Prompt 或产品文档。",
      "能把模糊需求变成可测试任务。",
    ],
    userConnectionPrompts: [
      "如果你的背景包含行业文档、流程拆解、用户调研或跨团队沟通，这条路径更容易形成可解释材料。",
      "当前试航不会重新推荐岗位，只把你的输入作为证据链补充。",
    ],
    gapOrAdvice: ["补一份 AI 知识库场景作品、评估指标和面试解释链路。"],
  },
  {
    id: "jd-b",
    title: "行业 AI 解决方案助理",
    targetPathId: "industry-ai-solution-assistant",
    notice: sampleJdNotice,
    statusLabel: "适合探索",
    scenario:
      "面向企业客户做 AI 应用售前、PoC、方案材料和场景调研。",
    responsibilities: [
      "参与客户访谈纪要。",
      "整理行业痛点和业务流程。",
      "辅助制作方案 PPT、Demo 脚本、测试用例和交付清单。",
      "协调产品、研发和客户侧反馈。",
    ],
    requirementSignals: [
      "能理解行业流程。",
      "能写清晰方案材料。",
      "熟悉常见 AI 应用形态。",
      "对数据安全、部署方式、效果评估有基本判断。",
    ],
    userConnectionPrompts: [
      "如果你有客户沟通、方案整理、行业调研或项目协调经历，可以把它们放入试航证据。",
      "这条路径需要更强的交付边界表达，避免把试点说成完整上线承诺。",
    ],
    gapOrAdvice: [
      "强化客户沟通话术、方案结构和边界表达。",
      "避免把技术方案说得过满。",
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
      "实现算法模块。",
      "处理训练和评估数据。",
      "调试模型效果。",
      "维护工程代码。",
      "阅读论文或复现方法。",
    ],
    requirementSignals: [
      "扎实编程能力。",
      "机器学习 / 深度学习基础。",
      "熟悉 Python、PyTorch、向量检索和模型评估。",
      "有可运行项目或实验记录。",
    ],
    userConnectionPrompts: [
      "如果你的输入缺少模型实验、工程代码或算法复现证据，短期不宜把这条路径作为主试航方向。",
      "可以把它保留为长期学习参照。",
    ],
    gapOrAdvice: ["短期只补 RAG 基础概念和检索评估指标，不包装成算法研发经历。"],
  },
];

export const openSourceProject: OpenSourceProject = {
  name: "OpenDocuments",
  sourceUrl: "https://github.com/joungminsung/OpenDocuments",
  license: "MIT",
  positioning: "Self-hosted RAG / 企业知识库问答 / AI 文档搜索",
  originalCapabilities: [
    "多来源文档接入。",
    "AI 文档搜索。",
    "RAG 问答。",
    "引用来源展示。",
    "Web UI / CLI / MCP 等公开能力。",
  ],
  whyForUser: [
    "对应企业资料分散、工程文档难找、问答需要引用来源的常见场景。",
    "适合围绕它做场景拆解、用户问题设计、指标设计和 Demo 说明。",
  ],
  boundaryNotice:
    "本试航基于公开项目信息做产品拆解与场景设计，不表述为用户参与该仓库开发。",
};

const pathBase: Array<Omit<RecommendationPath, "summary" | "evidence"> & {
  summaryTemplate: (profile: UserProfileInput) => string;
  evidenceTemplate: (profile: UserProfileInput) => RecommendationPath["evidence"];
}> = [
  {
    id: "industry-ai-product-assistant",
    title: "行业 AI 应用产品助理",
    verdict: "priority_trial",
    statusLabel: "优先试航",
    summaryTemplate: (profile) =>
      `${displayNameForProfile(profile)}当前优先试航“行业 AI 应用产品助理”。这一路径固定来自 P1-A 试航包，可连接样例 JD 任务、用户填写的背景证据和 OpenDocuments 的企业知识库问答场景。`,
    evidenceTemplate: (profile) => [
      {
        title: "JD 样本证据",
        points: [
          "样例 JD 常见任务包括用户问题梳理、AI 知识库需求拆解、PRD 草稿、问答样例、验收指标和 Demo 测试。",
        ],
      },
      {
        title: "用户背景证据",
        points: summarizeUserProfileEvidence(profile),
      },
      {
        title: "OpenDocuments 证据",
        points: [
          "OpenDocuments 是 self-hosted RAG / 企业知识库问答 / AI 文档搜索项目，适合拆解文档接入、检索、问答、引用来源和反馈流程。",
        ],
      },
      {
        title: "风险证据",
        points: [
          "如果缺少完整 AI 项目经历，不应把自己写成 AI 工程负责人；应强调场景理解、试点方案、指标设计和边界说明。",
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
    summaryTemplate: () =>
      "这条路径作为第二选择，用同一个 OpenDocuments 固定参考补方案结构、PoC 范围和交付边界。",
    evidenceTemplate: (profile) => [
      {
        title: "JD 样本证据",
        points: [
          "样例 JD 常见任务包括客户需求记录、行业场景调研、PoC 材料、方案 PPT、Demo 脚本和交付边界说明。",
        ],
      },
      {
        title: "用户背景证据",
        points: summarizeUserProfileEvidence(profile),
      },
      {
        title: "OpenDocuments 证据",
        points: [
          "OpenDocuments 可作为企业知识库 AI 助手的技术参照，帮助理解方案中的数据源、部署方式、权限和引用要求。",
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
    summaryTemplate: () =>
      "这条路径保留为长期学习参照，P1-A 不把它作为短期主试航方向。",
    evidenceTemplate: (profile) => [
      {
        title: "JD 样本证据",
        points: [
          "样例 JD 通常要求模型训练、检索优化、Embedding、Rerank、评测实验、工程代码和算法复现经验。",
        ],
      },
      {
        title: "用户背景证据",
        points: summarizeUserProfileEvidence(profile),
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
          "短期主投该方向容易出现经历证据不足、面试深挖答不上、项目归属表达不清的问题。",
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

export function buildRecommendationPaths(
  profile: UserProfileInput,
): RecommendationPath[] {
  return pathBase.map((path) => ({
    id: path.id,
    title: path.title,
    verdict: path.verdict,
    statusLabel: path.statusLabel,
    summary: path.summaryTemplate(profile),
    evidence: path.evidenceTemplate(profile),
  }));
}

export function getRecommendationPath(
  pathId: PathId,
  profile: UserProfileInput = emptyUserProfile,
): RecommendationPath {
  const paths = buildRecommendationPaths(profile);
  return paths.find((path) => path.id === pathId) ?? paths[0];
}

export function displayNameForProfile(profile: UserProfileInput): string {
  return profile.displayName.trim() || "候选人";
}

export function isUserProfileReady(profile: UserProfileInput): boolean {
  return userProfileFields
    .filter((field) => field.required)
    .every((field) => profile[field.key].trim().length > 0);
}

export function summarizeUserProfileEvidence(
  profile: UserProfileInput,
): string[] {
  const entries = [
    ["专业 / 背景", profile.professionalBackground],
    ["求职目标", profile.jobTarget],
    ["时间线", profile.timeline],
    ["工程 / 行业经历", profile.projectExperience],
    ["AI 工具经历", profile.aiToolExperience],
    ["技术基础", profile.technicalBasics],
    ["当前困惑", profile.currentConfusion],
    ["限制条件", profile.constraints],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}：${value.trim()}`);

  return entries.length > 0
    ? entries
    : ["尚未填写背景证据。请先在背景页补充真实输入，再查看完整证据链。"];
}

export const trialQuestions: TrialQuestion[] = [
  {
    id: "project_understanding",
    title: "项目理解",
    prompt: "这个开源项目主要解决什么问题？输入和输出是什么？",
    helper:
      "说明你如何理解公开项目，不需要复述仓库全部功能，也不要把项目写成个人成果。",
  },
  {
    id: "role_connection",
    title: "岗位连接",
    prompt: "它能帮助你理解哪些 AI 产品或行业解决方案岗位工作？",
    helper:
      "把项目能力连接到岗位任务，例如需求拆解、问答样例、指标、边界或用户反馈。",
  },
  {
    id: "scenario_gap",
    title: "场景缺口",
    prompt:
      "如果放到工程企业资料、规范、合同或施工方案管理场景中，还缺什么？",
    helper:
      "写数据权限、脱敏、术语、引用核验、人工复核、失败兜底等缺口。",
  },
  {
    id: "application_solution",
    title: "应用方案",
    prompt: "你会如何设计一个面向工程企业的 2 周试点 MVP？",
    helper:
      "写范围、步骤、样例资料、验收口径和不做事项，保持 2 周内可试航。",
  },
  {
    id: "portfolio_extension",
    title: "作品延展",
    prompt: "如果把这次试航做成作品集草稿，你会包含哪些部分？",
    helper:
      "写一页纸、流程图、指标表、风险清单、截图或说明材料等结构。",
  },
  {
    id: "ai_usage_explanation",
    title: "AI 使用说明",
    prompt: "你是否使用 AI 辅助？AI 帮你做了什么？你如何筛选和修改？",
    helper:
      "这是完整导出的必填边界说明。写清 AI 只辅助整理，最终内容由你筛选、核验和改写。",
  },
];

export const trialQuestionImpacts: Record<TrialQuestionId, string> = {
  project_understanding:
    "影响 OpenDocuments 来源说明、公开能力理解和项目归属边界。",
  role_connection: "影响路径结论、样例 JD 证据和用户背景证据。",
  scenario_gap: "影响风险清单、工程企业场景边界和不可声称内容。",
  application_solution: "影响 2 周 MVP、用户流程草图和指标表。",
  portfolio_extension: "影响作品集一页纸草稿和面试解释材料。",
  ai_usage_explanation:
    "影响免责声明、反包装检查和 Markdown 是否可完整导出。",
};

export const portfolioDraft: PortfolioOnePagerDraft = {
  title: "工程企业知识库 AI 助手试航",
  targetRole: "行业 AI 应用产品助理",
  problemBackground:
    "工程企业资料常分散在手册、SOP、项目文档和会议纪要中，新人或跨项目成员查找成本高，且难以判断答案来源。",
  solutionOverview:
    "参考 OpenDocuments 的自托管 RAG 和文档搜索思路，设计一个面向工程资料的知识库问答助手，支持文档导入、自然语言提问、引用来源展示和反馈记录。",
  mvpScope:
    "文档上传 / 索引、问答、引用展示、人工反馈、无依据问题兜底。",
  evaluationMetrics: [
    "引用覆盖率。",
    "人工抽检通过率。",
    "无依据问题识别。",
    "典型问题完成时间。",
    "用户反馈记录率。",
  ],
  outputs: [
    "用户问题清单。",
    "PRD 草稿。",
    "Demo 脚本。",
    "验收指标。",
    "风险清单。",
    "面试说明材料。",
  ],
  boundaryNotice:
    "本作品集草稿是基于公开项目信息的场景拆解与产品试航，不表述为用户参与原仓库开发。",
};

export const portfolioPolishBoundary =
  "这是一页作品集表达草稿，用于整理问题、方案、指标和边界。它不是正式简历，不代表岗位能力认证，也不声明用户参与 OpenDocuments 官方贡献。";

export const metricRows: MetricRow[] = [
  {
    dimension: "路径连接",
    metric: "岗位任务重合度",
    trialCriterion: "是否覆盖需求拆解、问答设计、指标设计、风险说明。",
  },
  {
    dimension: "行业理解",
    metric: "场景准确性",
    trialCriterion: "问题是否来自工程文档真实使用场景。",
  },
  {
    dimension: "产品表达",
    metric: "PRD 完整度",
    trialCriterion: "是否包含用户、流程、范围、验收和边界。",
  },
  {
    dimension: "RAG 理解",
    metric: "引用意识",
    trialCriterion: "是否要求答案展示来源并支持人工核验。",
  },
  {
    dimension: "质量评估",
    metric: "人工抽检通过率",
    trialCriterion: "样例问题是否由人工核对文档支持。",
  },
  {
    dimension: "风险控制",
    metric: "敏感信息处理",
    trialCriterion: "是否使用脱敏资料并说明权限边界。",
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
    signal: "把公开仓库说成个人开发成果。",
    suggestion: "明确写场景拆解与试航产出。",
  },
  {
    risk: "过度承诺",
    signal: "说系统能稳定解决所有问答。",
    suggestion: "改为用于特定资料范围内辅助检索。",
  },
  {
    risk: "数据安全",
    signal: "使用真实企业资料演示。",
    suggestion: "使用脱敏或自建样例资料。",
  },
  {
    risk: "幻觉答案",
    signal: "模型生成无依据内容。",
    suggestion: "强制引用来源，无依据时提示无法确认。",
  },
  {
    risk: "岗位错配",
    signal: "短期主投算法研发。",
    suggestion: "先以应用产品和方案助理为主。",
  },
  {
    risk: "技术深度不足",
    signal: "被追问检索、切分、评估细节。",
    suggestion: "准备基础解释和可验证指标。",
  },
];

export const complianceAdvice: ComplianceAdvice = {
  allowed: [
    "基于公开项目做场景拆解。",
    "用于展示我对工程企业知识库问答场景的理解。",
    "本次试航帮助我梳理岗位任务、准备作品集和面试说明。",
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
  "用户试航产出",
  "不可声称内容",
  "6 问作答",
  "免责声明",
];

export const forbiddenClaimsNotice =
  "不可声称：用户开发了 OpenDocuments、完成了企业级 RAG 系统、具备算法研发能力、获得岗位认证、提升录用概率，或 AI 可替代合同 / 规范 / 施工方案的人工复核。";

export function traceChainForProfile(profile: UserProfileInput): string {
  return `样例 JD + ${displayNameForProfile(profile)}背景 + OpenDocuments 公开来源 -> 6 问试航 -> 航迹表 / 作品集草稿 / Markdown`;
}

export const interviewPrep: InterviewPrepItem[] = [
  {
    question: "为什么不直接主投算法岗位？",
    answer:
      "当前试航更强调场景理解和产品化表达；算法研发还需要更长期的代码、模型和实验积累，所以先从行业 AI 应用产品切入。",
  },
  {
    question: "RAG 项目里你最关注什么？",
    answer:
      "关注资料范围、引用来源、失败兜底和人工评估，因为企业知识库问答不能只看回答是否流畅。",
  },
  {
    question: "你具体完成了什么？",
    answer:
      "完成场景拆解、用户问题、MVP 范围、指标、风险和演示材料，不把公开仓库开发归到自己名下。",
  },
  {
    question: "如果答案错了怎么办？",
    answer:
      "需要展示引用、允许反馈、记录问题类型，并对无依据问题给出无法确认提示。",
  },
];

export const pageCopy = {
  entrySubtitle:
    "用你的真实背景完成一次固定 OpenDocuments 试航：填背景、看三条路径、完成 6 问、通过反包装检查后导出 Markdown。",
  entryScope:
    "当前版本固定 1 个试航包、3 条路径、1 个公开参考项目、6 个试航问题和 1 种导出格式；不接 LLM，不做自由推荐。",
  entryBoundaryNotice:
    "这不是简历包装工具，也不做能力认证、企业推荐或录用预测。它只帮助你把路径判断、试航作答和边界说明整理成可追溯材料。",
  entryBoundary: [
    "用户：真实输入",
    "项目：OpenDocuments",
    "任务：工程企业知识库 AI 助手试航",
    "导出：Markdown",
  ],
  backgroundNotice:
    "请填写你自己的背景。页面不会提供默认身份、一键填充或默认作答；没有背景时，星图页会提示先补充。",
  recommendationConclusion:
    "三条路径仍是固定试航包内容，不根据输入重新推荐；这里仅把你的背景作为证据链补充，帮助判断试航材料如何表达。",
  trialBoundary:
    "OpenDocuments 提供公开来源参照；你需要完成的是把它放进工程企业知识库场景，形成试点方案、指标、风险和作品集表达。结果页会区分开源项目能力与个人试航产出。",
  missingQuestions:
    "还有试航问题未完成。缺项会使结果页缺少对应追溯链，暂不能导出完整 Markdown。",
  aiUsageBlocker:
    "请先补充“AI 使用说明”。这是反包装检查的必要项，未说明 AI 如何辅助和如何人工筛选时，不能导出完整 Markdown。",
  resultBoundary:
    "本结果是一次求职路径试航记录和作品集起点，不构成能力认证、录用判断、职业承诺或开源项目贡献声明。",
  markdownExportDescription:
    "完整 Markdown 仅在 6 问全部完成且反包装检查通过后生成。导出内容包含候选人背景、路径结论、样例 JD 说明、OpenDocuments 来源与 License、OpenDocuments 公开能力、用户试航产出、不可声称内容、6 问作答和免责声明。",
};

export function createMarkdownInput(
  selectedPathId: PathId,
  userProfile: UserProfileInput,
  trialAnswers: MarkdownInput["trialAnswers"],
): MarkdownInput {
  return {
    demoVersion,
    userProfile,
    sampleJdNotice,
    sampleJds,
    openSourceProject,
    selectedPath: getRecommendationPath(selectedPathId, userProfile),
    trialQuestions,
    trialAnswers,
    portfolioDraft,
    metrics: metricRows,
    risks: riskRows,
    complianceAdvice,
    interviewPrep,
  };
}
