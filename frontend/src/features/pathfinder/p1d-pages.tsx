"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  MessageSquareText,
  PencilLine,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActionButton,
  BulletList,
  ButtonLink,
  Notice,
  PageHeader,
  Panel,
  Section,
  StatusPill,
} from "./components";
import { requestPathfinderProjects } from "./api";
import { requiredMarkdownSectionLabels } from "./contract";
import {
  createMarkdownInput,
  getApprovedProjectMatches,
  isUserProfileReady,
  markdownExportItems,
  openDocumentsProjectRecord,
  priorityPathId,
  sampleJdNotice,
  trialQuestionImpacts,
  trialQuestions,
} from "./data";
import { generatePathfinderMarkdown } from "./markdown";
import { usePathfinder } from "./state";
import type {
  BackendSyncStatus,
  ExtractedProfileSignal,
  OpenSourceProjectRecord,
  PathId,
  PathfinderRecordStatus,
  ProjectMatch,
  RequiredMarkdownSection,
  TrialQuestion,
  TrialQuestionId,
  UserProfileInput,
} from "./types";

type SignalReadinessLevel = "ready" | "suggested_more" | "insufficient";

type PilotType = "development" | "product" | "operations";

interface RoleStarPoint {
  id: string;
  field: "AI 产品 / 应用" | "AI 开发 / 工程" | "AI 数据 / 评测" | "AI 运营 / 增长";
  title: string;
  pathId?: PathId;
  orbit: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  aliases: string[];
  jdSignals: string[];
  deliverables: string[];
  migrationEntries: string[];
  workSummary: string;
  firstScenes: string[];
  fitJudgement: string;
  highlightReason: string;
  nonHighlightReason: string;
  distanceLabel: string;
  pilotType: PilotType;
}

const roleStarPoints: RoleStarPoint[] = [
  {
    id: "ai-product-manager",
    field: "AI 产品 / 应用",
    title: "AI 产品经理（AI应用方向）",
    pathId: "industry-ai-product-assistant",
    orbit: 1,
    x: 360,
    y: 188,
    aliases: ["AI 应用产品经理", "行业 AI 产品经理", "知识库产品经理"],
    jdSignals: ["需求拆解", "PRD 草稿", "问答样例", "验收口径", "Demo 测试"],
    deliverables: ["场景说明", "用户流程", "MVP 范围", "验收清单"],
    migrationEntries: ["行业资料整理", "用户访谈", "流程梳理", "AI 工具使用记录"],
    workSummary: "把一个真实业务场景拆成 AI 应用需求、用户流程、原型范围和验收口径。",
    firstScenes: ["企业知识库问答产品", "AI 简历助手产品", "客服问答质检产品"],
    fitJudgement: "优先探索：已有资料整理、流程拆解或跨角色沟通信号时，可以先从小场景试航。",
    highlightReason: "你的背景里如果有资料整理、流程拆解或跨角色沟通，优先从这里形成作品集起点。",
    nonHighlightReason: "如果还缺少真实业务场景或用户问题，可以先补充一段具体项目经历。",
    distanceLabel: "近场：适合先完成一轮轻量试航",
    pilotType: "product",
  },
  {
    id: "data-product-manager",
    field: "AI 产品 / 应用",
    title: "数据产品经理（AI数据方向）",
    pathId: "ai-data-evaluation-assistant",
    orbit: 1,
    x: 270,
    y: 250,
    aliases: ["AI 数据产品经理", "评测数据产品经理", "样例库产品经理"],
    jdSignals: ["数据口径", "样例库", "标注流程", "质检规则", "反馈闭环"],
    deliverables: ["数据需求说明", "样例字段表", "标注规范", "质量看板"],
    migrationEntries: ["表格整理", "数据治理", "内容审核", "流程协同"],
    workSummary: "把数据、样例、标注和反馈流程组织成能支持 AI 产品迭代的产品机制。",
    firstScenes: ["问答样例库设计", "标注质检流程", "用户反馈归因看板"],
    fitJudgement: "优先探索：有数据整理、审核、表格分析或流程管理经历时，可以先做样例库试航。",
    highlightReason: "适合把数据、质检、审核或测试经历转成可复核材料。",
    nonHighlightReason: "如果还缺少样例或质检动作，建议再补充一段数据处理经历线索。",
    distanceLabel: "近场：可用已有数据整理经验切入",
    pilotType: "product",
  },
  {
    id: "ai-ops-growth-specialist",
    field: "AI 运营 / 增长",
    title: "AI运营/增长专家",
    pathId: "ai-application-ops-implementation-assistant",
    orbit: 1,
    x: 448,
    y: 276,
    aliases: ["AI 工具运营", "AI 用户增长", "AI 体验营负责人"],
    jdSignals: ["工具选型", "使用教程", "体验任务", "反馈表", "复盘指标"],
    deliverables: ["体验营方案", "任务卡", "内容日历", "反馈闭环"],
    migrationEntries: ["社群运营", "培训组织", "内容策划", "工具体验"],
    workSummary: "围绕 AI 工具采用、用户教育、活动节奏和反馈复盘推动试用与增长。",
    firstScenes: ["3 天 AI 工具体验营", "新用户上手任务卡", "社群反馈复盘"],
    fitJudgement: "优先探索：有运营、培训、社群、内容或用户反馈经历时，可以先做体验营试航。",
    highlightReason: "适合把运营、培训、社群或内容经验连接到 AI 工具落地。",
    nonHighlightReason: "如果缺少组织或内容材料，可以先做一次小范围工具体验记录。",
    distanceLabel: "近场：非技术背景也能先体验小场景",
    pilotType: "operations",
  },
  {
    id: "ai-solution-architect",
    field: "AI 产品 / 应用",
    title: "AI解决方案架构师",
    pathId: "industry-ai-solution-assistant",
    orbit: 2,
    x: 506,
    y: 204,
    aliases: ["AI 售前方案架构师", "AI PoC 方案负责人", "行业 AI 解决方案顾问"],
    jdSignals: ["客户访谈纪要", "痛点整理", "PoC 范围", "Demo 脚本", "交付边界"],
    deliverables: ["客户场景调研", "PoC 范围", "Demo 脚本", "验收材料"],
    migrationEntries: ["客户沟通", "方案 PPT", "项目协调", "交付复盘"],
    workSummary: "这是样例岗位中真实存在的方向，工作会把客户问题、业务流程、数据边界和可行性整理成可沟通的 AI 方案。",
    firstScenes: ["知识库 PoC 范围说明", "客服场景 Demo 脚本", "内部流程自动化方案"],
    fitJudgement: "可以先体验：完整岗位门槛较高，但可以先从客户场景调研、PoC 范围、Demo 脚本和验收材料这些小场景开始试航。",
    highlightReason: "适合有沟通、方案材料或项目协调经历的用户，先把一个小场景讲清楚。",
    nonHighlightReason: "如果缺少客户或业务侧沟通证据，建议再补充协作细节。",
    distanceLabel: "中近场：先体验方案中的小场景",
    pilotType: "product",
  },
  {
    id: "llm-app-engineer",
    field: "AI 开发 / 工程",
    title: "AI应用开发工程师",
    pathId: "algorithm-llm-engineer",
    orbit: 3,
    x: 136,
    y: 302,
    aliases: ["大模型应用工程师", "LLM 应用开发", "Prompt 工程师"],
    jdSignals: ["模型调用流程", "Prompt 调试", "日志观察", "异常兜底", "接口联调"],
    deliverables: ["小型原型", "调用流程", "测试记录", "边界说明"],
    migrationEntries: ["Python/JS 基础", "自动化脚本", "低代码工具", "技术文档阅读"],
    workSummary: "把模型能力接入业务流程，处理提示词、调用链路、日志观察和异常兜底。",
    firstScenes: ["文本分类小工具", "知识问答调用链", "批量资料整理脚本"],
    fitJudgement: "可以先了解：如果已经有代码或工具集成记录，可以向工程试航靠近；否则建议先补充可运行材料。",
    highlightReason: "如果你已有可运行代码或工具集成经验，可把它作为工程试航入口。",
    nonHighlightReason: "如果缺少代码或实验记录，短期不把它作为主攻结论。",
    distanceLabel: "外场：需要可运行代码或实验记录",
    pilotType: "development",
  },
  {
    id: "rag-engineer",
    field: "AI 开发 / 工程",
    title: "RAG工程师",
    pathId: "algorithm-llm-engineer",
    orbit: 2,
    x: 350,
    y: 374,
    aliases: ["知识库工程师", "检索增强应用开发", "文档问答工程师"],
    jdSignals: ["文档切分", "向量检索", "引用返回", "召回调试", "权限边界"],
    deliverables: ["项目拆解", "检索流程图", "测试样例", "改造建议"],
    migrationEntries: ["公开项目阅读", "数据清洗", "文档系统", "搜索体验"],
    workSummary: "围绕文档处理、检索、引用展示和问答质量调试搭建知识库应用链路。",
    firstScenes: ["公开项目阅读拆解", "文档问答流程图", "引用展示验收清单"],
    fitJudgement: "可以先体验：有技术基础时可做开源项目拆解；没有工程基础时先做产品或运营试航更稳。",
    highlightReason: "适合用已核验开源项目做阅读和场景改造，不声称参与原项目。",
    nonHighlightReason: "如果没有工程基础，可先做产品或运营类试航，再补代码材料。",
    distanceLabel: "中近场：可通过已核验项目阅读切入",
    pilotType: "development",
  },
  {
    id: "ai-implementation-consultant",
    field: "AI 开发 / 工程",
    title: "AI应用实施顾问",
    pathId: "ai-application-ops-implementation-assistant",
    orbit: 3,
    x: 578,
    y: 312,
    aliases: ["AI 实施顾问", "系统配置工程师", "交付支持顾问"],
    jdSignals: ["环境配置", "需求确认", "权限检查", "用户培训", "问题记录"],
    deliverables: ["实施清单", "验收表", "培训脚本", "问题台账"],
    migrationEntries: ["SaaS 实施", "客户成功", "运维支持", "流程培训"],
    workSummary: "把 AI 工具或系统带入真实团队使用，处理配置、培训、验收和问题反馈。",
    firstScenes: ["工具配置清单", "用户培训脚本", "试点问题台账"],
    fitJudgement: "可以先了解：有实施、培训、支持或工具落地经历时更靠近；否则建议补一次工具配置记录。",
    highlightReason: "适合有工具落地、培训、支持或跨团队推进经验的用户。",
    nonHighlightReason: "如果缺少真实交付流程，先补充一次工具配置或体验营记录。",
    distanceLabel: "外场：需要更多交付现场证据",
    pilotType: "development",
  },
  {
    id: "ai-data-evaluation-engineer",
    field: "AI 数据 / 评测",
    title: "LLM评测工程师",
    pathId: "ai-data-evaluation-assistant",
    orbit: 2,
    x: 216,
    y: 204,
    aliases: ["AI 数据评测工程师", "模型评测工程师", "问答评测专员"],
    jdSignals: ["样例构造", "标注规范", "抽检记录", "错误归因", "复核流程"],
    deliverables: ["评测样例表", "错误分类", "质检流程", "复盘记录"],
    migrationEntries: ["数据整理", "内容审核", "测试记录", "表格分析"],
    workSummary: "设计评测样例、记录错误类型、维护复核流程，帮助判断大模型输出在具体场景里的问题类型。",
    firstScenes: ["问答样例评测表", "错误归因清单", "人工复核流程"],
    fitJudgement: "可以先体验：有数据、质检、审核或测试经历时，可以先做一版样例评测材料。",
    highlightReason: "适合把数据、质检、审核或测试经历转成可复核材料。",
    nonHighlightReason: "如果没有样例或质检动作，建议先补充一段数据处理经历。",
    distanceLabel: "中近场：适合补成可复核材料",
    pilotType: "operations",
  },
  {
    id: "annotation-qc-specialist",
    field: "AI 数据 / 评测",
    title: "AI数据标注与质检专家",
    pathId: "ai-data-evaluation-assistant",
    orbit: 3,
    x: 236,
    y: 404,
    aliases: ["数据标注质检专家", "标注运营", "质检流程专员"],
    jdSignals: ["口径维护", "批次管理", "一致性检查", "反馈闭环", "人员协同"],
    deliverables: ["标注口径", "样例库目录", "质检表", "协作 SOP"],
    migrationEntries: ["内容运营", "客服质检", "审核流程", "培训材料"],
    workSummary: "维护标注口径、质检流程、协作规则和样例库，让 AI 数据生产更稳定。",
    firstScenes: ["标注口径整理", "批次抽检记录", "协作 SOP 草稿"],
    fitJudgement: "可以先了解：如果有审核、培训或流程协作经历，可先补一份标注质检样例。",
    highlightReason: "适合把重复流程和质量管理经验转成 AI 数据侧试航材料。",
    nonHighlightReason: "如果缺少流程复盘，先补一次人工审核或样例整理。",
    distanceLabel: "外场：需要流程和协作证据",
    pilotType: "operations",
  },
  {
    id: "feedback-analyst",
    field: "AI 数据 / 评测",
    title: "AI数据分析师",
    pathId: "ai-data-evaluation-assistant",
    orbit: 3,
    x: 484,
    y: 406,
    aliases: ["模型反馈分析师", "用户反馈分析", "AI 体验分析师"],
    jdSignals: ["数据整理", "指标拆解", "趋势观察", "反馈归因", "复盘报告"],
    deliverables: ["分析表", "指标口径", "洞察摘要", "行动建议"],
    migrationEntries: ["用户运营", "客服反馈", "产品体验", "数据复盘"],
    workSummary: "把业务数据、用户反馈和使用记录整理成可解释的指标、趋势和改进建议。",
    firstScenes: ["用户反馈归因", "体验数据复盘", "改进建议清单"],
    fitJudgement: "可以先了解：有表格整理、数据复盘、用户反馈或产品体验经历时更容易靠近。",
    highlightReason: "适合有表格整理、指标观察或体验复盘经历的用户。",
    nonHighlightReason: "如果没有数据或反馈材料，先从一次工具体验记录开始。",
    distanceLabel: "外场：需要数据样本和复盘动作",
    pilotType: "operations",
  },
  {
    id: "ai-agent-engineer",
    field: "AI 开发 / 工程",
    title: "Agent应用开发工程师",
    pathId: "algorithm-llm-engineer",
    orbit: 4,
    x: 640,
    y: 166,
    aliases: ["AI Agent 应用工程师", "工作流智能体工程师", "AI 自动化工程师"],
    jdSignals: ["工具调用", "任务编排", "状态管理", "权限边界", "异常回退"],
    deliverables: ["Agent 流程图", "工具清单", "测试任务集", "风险边界"],
    migrationEntries: ["自动化脚本", "工作流工具", "代码项目", "系统集成"],
    workSummary: "把模型、工具、流程和权限组合成能完成特定任务的智能体应用。",
    firstScenes: ["资料整理 Agent", "客服工单分流 Agent", "报告初稿工作流"],
    fitJudgement: "建议长期准备：需要代码、流程编排和异常处理证据；当前可先了解小任务工作流。",
    highlightReason: "如果你已有自动化脚本或系统集成经验，可以作为中长期工程试航方向。",
    nonHighlightReason: "信号不足时建议先了解，不急于把它写成主攻方向。",
    distanceLabel: "远场：需要长期准备和更多工程证据",
    pilotType: "development",
  },
  {
    id: "ai-project-manager-delivery",
    field: "AI 开发 / 工程",
    title: "MLOps/AI平台工程师",
    pathId: "ai-application-ops-implementation-assistant",
    orbit: 4,
    x: 86,
    y: 166,
    aliases: ["AI 平台工程师", "模型平台工程师", "AI 项目经理（交付方向）"],
    jdSignals: ["发布流程", "环境监控", "权限与成本", "稳定性记录", "问题复盘"],
    deliverables: ["平台流程图", "上线检查清单", "监控指标", "问题复盘"],
    migrationEntries: ["运维支持", "平台配置", "自动化脚本", "交付复盘"],
    workSummary: "围绕 AI 应用运行、发布、监控、权限和成本控制，维护团队可持续使用的 AI 平台能力。",
    firstScenes: ["上线检查清单", "监控指标说明", "问题复盘记录"],
    fitJudgement: "建议长期准备：需要平台、运维、发布或稳定性证据；当前可先了解一份上线检查清单。",
    highlightReason: "适合已有运维、平台配置、自动化脚本或交付复盘经验的用户作为后续拓展方向。",
    nonHighlightReason: "如果缺少平台或运维证据，可以先补一份工具运行记录或问题复盘。",
    distanceLabel: "远场：需要长期准备和平台运行证据",
    pilotType: "development",
  },
];

const roleByPathId: Partial<Record<PathId, string>> = {
  "industry-ai-product-assistant": "ai-product-manager",
  "industry-ai-solution-assistant": "ai-solution-architect",
  "ai-data-evaluation-assistant": "ai-data-evaluation-engineer",
  "ai-application-ops-implementation-assistant": "ai-ops-growth-specialist",
  "algorithm-llm-engineer": "rag-engineer",
};

const pilotTypeLabels: Record<PilotType, string> = {
  development: "开发岗适航任务",
  product: "产品岗 Vibe Coding 原型试航",
  operations: "运营岗 AI 工具体验营试航",
};

const pilotTypeOutputs: Record<PilotType, string[]> = {
  development: [
    "已核验开源项目拆解",
    "场景改造方案",
    "技术边界说明",
    "面试追问准备",
  ],
  product: [
    "原型概念",
    "PRD 摘要",
    "用户流程",
    "验收指标",
    "迭代清单",
  ],
  operations: [
    "目标人群",
    "活动节奏",
    "内容日历",
    "AI 工具任务卡",
    "反馈闭环",
    "风险边界",
  ],
};

const manualSignalFields: Array<{
  key: keyof UserProfileInput;
  label: string;
  rows: number;
  placeholder: string;
  required?: boolean;
}> = [
  {
    key: "displayName",
    label: "称呼",
    rows: 1,
    placeholder: "可留空；导出时会使用“候选人”。",
  },
  {
    key: "professionalBackground",
    label: "专业 / 行业背景",
    rows: 3,
    required: true,
    placeholder: "写你真实的专业、行业、岗位或过往工作类型。",
  },
  {
    key: "jobTarget",
    label: "想探索的 AI 岗位方向",
    rows: 3,
    required: true,
    placeholder: "例如 AI 产品、解决方案、数据评测、工具运营或应用工程。",
  },
  {
    key: "timeline",
    label: "时间线",
    rows: 2,
    required: true,
    placeholder: "例如 3 天整理材料、1 个月形成作品集、3 个月开始投递。",
  },
  {
    key: "projectExperience",
    label: "真实项目 / 流程 / 协作经历",
    rows: 4,
    required: true,
    placeholder: "写你亲自参与的动作、材料、协作对象、产出和复盘。",
  },
  {
    key: "aiToolExperience",
    label: "AI 工具使用经历",
    rows: 3,
    required: true,
    placeholder: "写用过哪些 AI 工具、辅助了什么、哪些内容由你人工确认。",
  },
  {
    key: "technicalBasics",
    label: "技术 / 数据 / 工具基础",
    rows: 3,
    required: true,
    placeholder: "写编程、数据处理、产品工具、提示词、文档系统等基础。",
  },
  {
    key: "currentConfusion",
    label: "当前困惑",
    rows: 3,
    required: true,
    placeholder: "写不确定的方向、证据缺口、边界担心或面试追问压力。",
  },
  {
    key: "constraints",
    label: "偏好、工作方式、排斥项、学习意愿",
    rows: 4,
    required: true,
    placeholder:
      "补充你喜欢的工作方式、不想碰的工作内容、可投入时间、学习意愿和不能公开的材料。",
  },
];

const selfAwarenessSignals = ["偏好", "工作方式", "排斥项", "学习意愿"];

function profileName(profile: UserProfileInput) {
  return profile.displayName.trim() || "候选人";
}

function statusLabelForRecord(status: PathfinderRecordStatus) {
  const labels: Record<PathfinderRecordStatus, string> = {
    draft: "草稿",
    answers_incomplete: "问答缺项",
    anti_packaging_blocked: "反包装阻断",
    ready_to_export: "成果包可导出",
    exported: "已保存快照",
  };
  return labels[status];
}

function statusToneForRecord(status: PathfinderRecordStatus) {
  if (status === "ready_to_export" || status === "exported") return "teal";
  if (status === "anti_packaging_blocked") return "rose";
  return "amber";
}

function statusLabelForBackend(status: BackendSyncStatus) {
  const labels: Record<BackendSyncStatus, string> = {
    local_only: "本地草稿",
    creating: "正在保存",
    saving: "正在保存",
    saved: "已保存",
    failed: "保存失败，可继续本地试航",
  };
  return labels[status];
}

function statusToneForBackend(status: BackendSyncStatus) {
  if (status === "saved") return "teal";
  if (status === "failed") return "rose";
  return "amber";
}

function signalReadiness(params: {
  profile: UserProfileInput;
  signals: ExtractedProfileSignal[];
  signalConfirmationStatus: string;
  userTurnCount: number;
}): { level: SignalReadinessLevel; label: string; detail: string } {
  const manualFieldCount = manualSignalFields.filter(
    (field) => field.required && params.profile[field.key].trim(),
  ).length;
  const confirmedSignalCount =
    params.signalConfirmationStatus === "confirmed"
      ? params.signals.filter((signal) => signal.userEditableText.trim()).length
      : params.signals.filter(
          (signal) =>
            signal.confirmationStatus === "user_confirmed" &&
            signal.userEditableText.trim(),
        ).length;

  if (isUserProfileReady(params.profile) || confirmedSignalCount >= 2) {
    return {
      level: "ready",
      label: "可生成",
      detail: "已有可确认背景信号，可以先生成一版个人 AI 求职星图。",
    };
  }

  if (manualFieldCount >= 3 || params.signals.length >= 1 || params.userTurnCount >= 1) {
    return {
      level: "suggested_more",
      label: "建议补充",
      detail: "可以继续追问，也可以先整理信号草稿再决定是否生成星图。",
    };
  }

  return {
    level: "insufficient",
    label: "信息不足",
    detail: "还缺少真实经历、用户动作或可追溯材料，建议先讲一个具体场景。",
  };
}

function readinessTone(level: SignalReadinessLevel) {
  if (level === "ready") return "teal";
  if (level === "suggested_more") return "amber";
  return "rose";
}

const starmapOrbitBands: Array<{
  orbit: RoleStarPoint["orbit"];
  rx: number;
  ry: number;
  label: string;
}> = [
  { orbit: 1, rx: 104, ry: 66, label: "近场试航" },
  { orbit: 2, rx: 178, ry: 112, label: "可先体验" },
  { orbit: 3, rx: 254, ry: 158, label: "建议补证据" },
  { orbit: 4, rx: 322, ry: 204, label: "长期准备" },
];

const starmapFieldColors: Record<RoleStarPoint["field"], string> = {
  "AI 产品 / 应用": "#2dd4bf",
  "AI 开发 / 工程": "#f59e0b",
  "AI 数据 / 评测": "#38bdf8",
  "AI 运营 / 增长": "#a3e635",
};

function roleTitleLines(title: string) {
  if (title.includes("（")) {
    return title.replace("）", "").split("（");
  }
  if (title.length <= 8) return [title];
  return [title.slice(0, 8), title.slice(8)];
}

function pilotActionCopy(type: PilotType) {
  if (type === "development") {
    return "下方可选择已审计公开项目，生成一份岗位试航任务。";
  }
  if (type === "product") {
    return "下方提供产品试航框架，可先整理原型、流程和验收材料。";
  }
  return "下方提供运营试航框架，可先整理体验营节奏、任务卡和复盘材料。";
}

function highlightedRoleIds(responsePaths?: Array<{ pathId: PathId; decision: string }>) {
  const fromResponse =
    responsePaths
      ?.filter((path) => path.decision !== "not_recommended_short_term")
      .map((path) => roleByPathId[path.pathId])
      .filter((id): id is string => Boolean(id)) ?? [];
  return Array.from(
    new Set([
      ...fromResponse,
      "ai-product-manager",
      "ai-solution-architect",
      "ai-data-evaluation-engineer",
    ]),
  ).slice(0, 3);
}

function normalizeTrialQuestions(
  candidateQuestions:
    | Array<{
        questionId: TrialQuestionId;
        title: string;
        prompt: string;
        required: boolean;
      }>
    | undefined,
): TrialQuestion[] {
  if (!candidateQuestions?.length) return trialQuestions;

  return candidateQuestions.map((question) => {
    const fallback = trialQuestions.find((item) => item.id === question.questionId);
    return {
      id: question.questionId,
      title: question.title,
      prompt: question.prompt,
      helper:
        fallback?.helper ??
        "请基于你的真实经历作答，并保留项目来源与个人产出的边界。",
    };
  });
}

function activeRoleForPath(pathId: PathId): RoleStarPoint {
  const roleId = roleByPathId[pathId];
  return (
    roleStarPoints.find((role) => role.id === roleId) ??
    roleStarPoints.find((role) => role.pathId === pathId) ??
    roleStarPoints[0]
  );
}

function projectBoundaryItems(params: {
  match: ProjectMatch;
  project?: OpenSourceProjectRecord;
}) {
  const { match, project } = params;
  return [
    project ? `${project.name}: ${project.description}` : `项目：${match.projectId}`,
    project
      ? `License：${project.license} / ${project.licenseVerificationStatus}`
      : "License：等待项目库返回核验信息。",
    project?.sourceBoundary ??
      "来源边界：仅作已审计公开项目参考，不声称用户参与原项目。",
    ...match.boundaryNotes,
  ];
}

function PilotTypeTag({ type }: { type: PilotType }) {
  const tone = type === "development" ? "teal" : type === "product" ? "amber" : "slate";
  return <StatusPill label={pilotTypeLabels[type]} tone={tone} />;
}

export function PathfinderEntryPage() {
  const router = useRouter();
  const { state, parseResumeFile } = usePathfinder();
  const resumeParse = state.resumeParse;
  const isUploadingResume = resumeParse.status === "uploading";

  async function onResumeSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file || isUploadingResume) return;
    const parsed = await parseResumeFile(file);
    if (parsed) {
      router.push("/pathfinder/background");
      return;
    }
    event.currentTarget.value = "";
  }

  return (
    <div>
      <PageHeader
        title="个人 AI 求职星图"
        description="上传简历或直接聊经历，把真实背景整理成可确认信号，再生成 12 个岗位星点的试航路径。"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Panel>
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 h-6 w-6 shrink-0 text-teal-700" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                上传简历生成星图
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                上传后，系统会先整理你的经历线索；你确认或修改后再生成星图。
              </p>
            </div>
          </div>
          <label
            htmlFor="resume-upload"
            className={`mt-5 flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-teal-300 bg-teal-50 px-4 py-6 text-center transition hover:border-teal-500 hover:bg-teal-100 ${
              isUploadingResume ? "cursor-wait opacity-80" : "cursor-pointer"
            }`}
          >
            <FileText className="h-8 w-8 text-teal-700" aria-hidden="true" />
            <span className="mt-3 text-sm font-semibold text-slate-950">
              {isUploadingResume ? "正在读取简历里的经历线索" : "选择 PDF / DOCX / TXT 简历"}
            </span>
            <span className="mt-1 text-xs leading-5 text-slate-600">
              支持常见简历文件。敏感信息可以先自行删去。
            </span>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="sr-only"
              disabled={isUploadingResume}
              onChange={onResumeSelected}
            />
          </label>
          {resumeParse.status === "uploading" ? (
            <Notice title="正在读取简历里的经历线索" tone="teal">
              完成后会进入背景页，你可以逐条确认、删除或补充。
            </Notice>
          ) : null}
          {resumeParse.status === "parsed" ? (
            <Notice title="已整理简历线索" tone="teal">
              {resumeParse.fileName ?? "这份简历"} 已整理为 {state.extractedSignals.length} 条可确认线索。请进入背景页确认后再生成星图。
            </Notice>
          ) : null}
          {resumeParse.status === "error" ? (
            <Notice title="暂时没能读取这份简历" tone="amber">
              {resumeParse.userMessage ?? "可以换一份文件，或继续用 AI 访谈补充经历线索。"}
            </Notice>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/pathfinder/background">
              去确认背景信号
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <MessageSquareText
              className="mt-1 h-6 w-6 shrink-0 text-teal-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                AI 聊聊我的经历
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                从一段真实经历开始，AI 可以继续追问项目、协作、工具、边界和自我认知信号；你可以随时停止并生成星图。
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              "讲一个真实项目、流程或资料整理场景",
              "补充偏好、工作方式、排斥项和学习意愿",
              "确认信号后进入 12 岗位星点工作台",
            ].map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5">
            <ButtonLink href="/pathfinder/background" variant="primary">
              开始航前访谈
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Notice title="不是简历包装" tone="amber">
          Pathfinder 只整理真实背景信号、样例 JD 证据和边界说明，不替用户编造成果。
        </Notice>
        <Notice title="不是录用判断" tone="slate">
          星点代表可试航方向，不代表录用结论、企业筛选或能力背书。
        </Notice>
        <Notice title="结果是适航成果包" tone="teal">
          Markdown 只是导出格式，主结果是一组可追溯的岗位星点、试航产出和打磨计划。
        </Notice>
      </div>
    </div>
  );
}

export function PathfinderBackgroundPage() {
  const router = useRouter();
  const {
    state,
    userProfile,
    updateUserProfile,
    startInterviewSession,
    answerInterviewQuestion,
    extractInterviewSignals,
    updateExtractedSignal,
    confirmExtractedSignals,
    submitUserProfile,
  } = usePathfinder();
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [isInterviewBusy, setIsInterviewBusy] = useState(false);
  const ready = isUserProfileReady(userProfile);
  const hasUserTurns = state.interviewMessages.some((message) => message.role === "user");
  const hasPendingSignals = state.extractedSignals.length > 0;
  const resumeParse = state.resumeParse;
  const hasResumeSignals = state.extractedSignals.some(
    (signal) => signal.sourceField === "resume",
  );
  const canConfirmSignals = state.extractedSignals.some((signal) =>
    signal.userEditableText.trim(),
  );
  const readiness = signalReadiness({
    profile: userProfile,
    signals: state.extractedSignals,
    signalConfirmationStatus: state.signalConfirmationStatus,
    userTurnCount: state.interviewMessages.filter((message) => message.role === "user").length,
  });

  function updateField(key: keyof UserProfileInput, value: string) {
    updateUserProfile({ ...userProfile, [key]: value });
  }

  async function onStartOrSendInterview() {
    const answer = interviewAnswer.trim();
    setIsInterviewBusy(true);
    try {
      if (answer) {
        await answerInterviewQuestion(answer);
        setInterviewAnswer("");
      } else {
        await startInterviewSession();
      }
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onExtractSignals() {
    setIsInterviewBusy(true);
    try {
      await extractInterviewSignals();
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onConfirmSignals() {
    if (!canConfirmSignals) return;
    setIsInterviewBusy(true);
    try {
      await confirmExtractedSignals();
      router.push("/pathfinder/recommendation");
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onStopAndGenerate() {
    if (canConfirmSignals) {
      await onConfirmSignals();
      return;
    }
    if (ready) {
      submitUserProfile();
      router.push("/pathfinder/recommendation");
      return;
    }
    if (hasUserTurns) {
      await onExtractSignals();
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    submitUserProfile();
    router.push("/pathfinder/recommendation");
  }

  return (
    <div>
      <PageHeader
        title="航前访谈：把经历整理成可确认信号"
        description="AI 可以继续追问，直到信号足够；你也可以随时停止，先生成一版个人 AI 求职星图。"
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex items-start gap-3">
            <MessageSquareText
              className="mt-1 h-5 w-5 shrink-0 text-teal-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                开放式 AI 访谈
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                可以讲项目、流程、资料、协作、AI 工具和限制条件。AI 只整理信号，不替你决定岗位、项目或结论。
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {state.interviewMessages.length ? (
              state.interviewMessages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md border p-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "border-teal-200 bg-teal-50 text-teal-950"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold text-slate-500">
                    {message.role === "user" ? "你的回答" : "下一问"}
                  </div>
                  {message.content}
                </div>
              ))
            ) : (
              <Notice title="从真实经历开始" tone="teal">
                不需要先填长表单。先回答一段话，后续问题会围绕你已经说过的内容继续追问。
              </Notice>
            )}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-950">你的回答</span>
            <textarea
              value={interviewAnswer}
              onChange={(event) => setInterviewAnswer(event.target.value)}
              rows={5}
              placeholder="例如：我做过客服知识库整理，把常见问题、处理流程和用户反馈归类，也用 AI 工具辅助整理初稿，但最终会人工确认。"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton onClick={onStartOrSendInterview} disabled={isInterviewBusy}>
              {interviewAnswer.trim()
                ? "发送回答"
                : state.interviewSessionId
                  ? "继续追问"
                  : "开始访谈"}
            </ActionButton>
            <ActionButton
              onClick={onExtractSignals}
              variant="secondary"
              disabled={!hasUserTurns || isInterviewBusy}
            >
              整理信号草稿
            </ActionButton>
            <ActionButton
              onClick={onStopAndGenerate}
              variant="secondary"
              disabled={isInterviewBusy || (!canConfirmSignals && !ready && !hasUserTurns)}
            >
              暂时够了，生成星图
            </ActionButton>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Notice title={`信号完整度：${readiness.label}`} tone={readinessTone(readiness.level)}>
            {readiness.detail}
          </Notice>
          {resumeParse.status === "parsed" ? (
            <Notice title="简历线索已整理" tone="teal">
              {resumeParse.userMessage ??
                "请逐条确认这些经历线索。确认前不会生成岗位星图。"}
            </Notice>
          ) : null}
          {resumeParse.status === "error" ? (
            <Notice title="简历读取未完成" tone="amber">
              可以换一份文件，或直接通过访谈补充真实经历。
            </Notice>
          ) : null}
          <Panel>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Sparkles className="h-4 w-4 text-teal-700" aria-hidden="true" />
              自我认知信号
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selfAwarenessSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {signal}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              这些内容只用于解释和排序参考，不作为性格测评，也不会单独决定岗位星点。
            </p>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <PencilLine className="h-4 w-4 text-teal-700" aria-hidden="true" />
              {hasResumeSignals ? "来自简历的经历线索" : "可确认背景信号"}
            </div>
            {hasPendingSignals ? (
              <div className="mt-4 space-y-3">
                {state.extractedSignals.map((signal) => (
                  <label key={signal.signalId} className="block">
                    <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      {signal.label}
                      <StatusPill
                        label={
                          signal.confirmationStatus === "user_confirmed"
                            ? "用户已确认"
                            : "待确认"
                        }
                        tone={signal.confirmationStatus === "user_confirmed" ? "teal" : "amber"}
                      />
                      {signal.sourceField === "resume" ? (
                        <StatusPill label="来自简历" tone="slate" />
                      ) : null}
                    </span>
                    <textarea
                      value={signal.userEditableText}
                      onChange={(event) =>
                        updateExtractedSignal(signal.signalId, event.target.value)
                      }
                      rows={3}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                ))}
                <ActionButton
                  onClick={onConfirmSignals}
                  disabled={!canConfirmSignals || isInterviewBusy}
                >
                  确认信号并查看星图
                </ActionButton>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                上传简历或回答访谈后，这里会出现可编辑信号。确认前不会进入推荐或试航任务。
              </p>
            )}
          </Panel>
        </div>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-lg font-semibold text-slate-950">
          编辑已提取信息 / 手动补充
        </summary>
        <form onSubmit={onSubmit} className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-2">
            {manualSignalFields.map((field) => (
              <label key={field.key} className={field.rows > 3 ? "md:col-span-2" : ""}>
                <span className="text-sm font-semibold text-slate-950">
                  {field.label}
                  {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
                </span>
                {field.rows === 1 ? (
                  <input
                    value={userProfile[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                ) : (
                  <textarea
                    value={userProfile[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    rows={field.rows}
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="grid content-start gap-4">
            <Notice title={ready ? "可生成星图" : "建议补齐必填信号"} tone={ready ? "teal" : "amber"}>
              手动补充用于修正或补齐信号。保存后只进入证据链和星图，不产生录用判断。
            </Notice>
            <div className="flex flex-wrap gap-3">
              <ActionButton type="submit" disabled={!ready}>
                保存背景并生成星图
              </ActionButton>
              <ButtonLink href="/pathfinder" variant="secondary">
                返回入口
              </ButtonLink>
            </div>
          </div>
        </form>
      </details>
    </div>
  );
}

export function PathfinderRecommendationPage() {
  const { state, userProfile, generateTrialPackage } = usePathfinder();
  const router = useRouter();
  const recommendation = state.recommendationResponse;
  const topRoleIds = useMemo(
    () => highlightedRoleIds(recommendation?.paths),
    [recommendation?.paths],
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roleStarPoints[0].id);
  const selectedRole =
    roleStarPoints.find((role) => role.id === selectedRoleId) ?? roleStarPoints[0];
  const selectedPathId = selectedRole.pathId ?? priorityPathId;
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<OpenSourceProjectRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const approvedMatches = useMemo(
    () => getApprovedProjectMatches(selectedPathId, recommendation),
    [recommendation, selectedPathId],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.projectId, project])),
    [projects],
  );
  const canGeneratePackage = approvedMatches.some(
    (match) => match.projectId === selectedProjectId,
  );

  useEffect(() => {
    let active = true;
    void requestPathfinderProjects().then((response) => {
      if (active) setProjects(response.projects);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedRoleId((current) =>
      roleStarPoints.some((role) => role.id === current)
        ? current
        : topRoleIds[0] || roleStarPoints[0].id,
    );
  }, [topRoleIds]);

  useEffect(() => {
    const stillAvailable = approvedMatches.some(
      (match) => match.projectId === selectedProjectId,
    );
    if (!stillAvailable) {
      setSelectedProjectId(approvedMatches[0]?.projectId ?? "");
    }
  }, [approvedMatches, selectedProjectId]);

  async function onGenerateTrialPackage() {
    if (!canGeneratePackage || !selectedProjectId || isGenerating) return;
    setIsGenerating(true);
    try {
      await generateTrialPackage({ selectedPathId, selectedProjectId });
      router.push("/pathfinder/trial");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!state.profileSubmitted || !isUserProfileReady(userProfile)) {
    return (
      <div>
        <PageHeader
          title="需要先补充真实背景"
          description="缺少真实背景时，不展示伪造的个人星图。请先上传简历、完成访谈或手动补充背景信号。"
        />
        <Notice title="背景证据不足" tone="amber">
          星图只使用用户确认信号、样例 JD 信号和已审计项目来源，不进行黑箱岗位结论。
        </Notice>
        <div className="mt-6">
          <ButtonLink href="/pathfinder/background">返回背景页</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${profileName(userProfile)}的 AI 求职星图`}
        description="12 个岗位星点围绕你的位置展开。越靠近中心，代表越适合先做一轮小场景试航；越远，代表需要更长期的经历线索和作品材料。"
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_410px]">
        <div className="rounded-lg border border-slate-800 bg-[#10171c] p-4 text-slate-100 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-teal-200">
                岗位星图导航盘
              </div>
              <p className="mt-1 text-sm text-slate-400">
                点击任意星点查看岗位内容、靠近原因和试航入口。
              </p>
            </div>
            <div className="rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200">
              金色星点代表当前重点试航方向
            </div>
          </div>

          <div className="rounded-lg border border-slate-700/80 bg-[#0c1317] p-2 sm:p-4">
            <PathfinderStarmap
              roles={roleStarPoints}
              selectedRoleId={selectedRole.id}
              highlightedRoleIds={topRoleIds}
              onSelectRole={setSelectedRoleId}
            />
            <div className="mt-3 flex flex-wrap gap-2 px-1 text-xs text-slate-300">
              {starmapOrbitBands.map((band) => (
                <span
                  key={band.orbit}
                  className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1"
                >
                  {band.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <RoleDetailPanel
          role={selectedRole}
          highlighted={topRoleIds.includes(selectedRole.id)}
          canGeneratePackage={canGeneratePackage}
          isGenerating={isGenerating}
          onGenerateTrialPackage={onGenerateTrialPackage}
        />
      </div>

      <Section
        title="适航任务入口"
        description="开发岗可生成已核验开源项目试航任务；产品和运营先提供可提交的任务框架，不伪装成完整成果。"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PilotCard
            type="development"
            title="已核验开源项目拆解 + 场景改造"
            body="选择已审计公开项目，生成现有开源项目试航工单。"
            outputs={pilotTypeOutputs.development}
            active={selectedRole.pilotType === "development"}
          >
            <div className="space-y-3">
              {approvedMatches.length ? (
                approvedMatches.map((match) => {
                  const project = projectById.get(match.projectId);
                  const selected = selectedProjectId === match.projectId;
                  return (
                    <button
                      key={`${match.rolePathId}-${match.projectId}`}
                      type="button"
                      onClick={() => setSelectedProjectId(match.projectId)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        selected
                          ? "border-teal-300 bg-white"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {project?.name ?? match.projectId}
                      </div>
                      <div className="mt-2">
                        <BulletList items={projectBoundaryItems({ match, project }).slice(0, 3)} />
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  当前星点没有可生成的已审计项目匹配，可先查看产品或运营试航框架。
                </p>
              )}
              {canGeneratePackage ? (
                <ActionButton onClick={onGenerateTrialPackage} disabled={isGenerating}>
                  {isGenerating ? "正在生成适航任务" : "生成开发岗适航任务"}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </ActionButton>
              ) : null}
            </div>
          </PilotCard>

          <PilotCard
            type="product"
            title="Vibe Coding 原型试航"
            body="把一个 AI 应用场景拆成可演示原型、PRD 摘要、流程和验收指标。"
            outputs={pilotTypeOutputs.product}
            active={selectedRole.pilotType === "product"}
          >
            <StatusPill label="提交版框架，暂不生成完整工单" tone="amber" />
          </PilotCard>

          <PilotCard
            type="operations"
            title="AI 工具体验营运营方案试航"
            body="围绕目标人群、活动节奏、任务卡、内容日历和反馈闭环形成运营作品起点。"
            outputs={pilotTypeOutputs.operations}
            active={selectedRole.pilotType === "operations"}
          >
            <StatusPill label="提交版框架，暂不生成完整工单" tone="amber" />
          </PilotCard>
        </div>
      </Section>
    </div>
  );
}

function PathfinderStarmap({
  roles,
  selectedRoleId,
  highlightedRoleIds,
  onSelectRole,
}: {
  roles: RoleStarPoint[];
  selectedRoleId: string;
  highlightedRoleIds: string[];
  onSelectRole: (roleId: string) => void;
}) {
  return (
    <svg
      role="img"
      aria-label="个人 AI 求职岗位星图"
      viewBox="0 0 720 520"
      className="block h-auto w-full max-w-full"
    >
      <defs>
        <radialGradient id="pathfinder-user-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#ccfbf1" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#14b8a6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <filter id="pathfinder-star-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="720" height="520" rx="18" fill="#0c1317" />
      <path
        d="M62 458C164 376 227 346 360 350C492 354 555 318 662 230"
        fill="none"
        stroke="#5eead4"
        strokeDasharray="7 9"
        strokeOpacity="0.24"
        strokeWidth="2"
      />
      {starmapOrbitBands.map((band) => (
        <g key={band.orbit}>
          <ellipse
            cx="360"
            cy="260"
            rx={band.rx}
            ry={band.ry}
            fill="none"
            stroke="#94a3b8"
            strokeDasharray={band.orbit === 1 ? "0" : "8 10"}
            strokeOpacity={band.orbit === 1 ? "0.45" : "0.26"}
            strokeWidth="1.3"
          />
          <text
            x={360 + band.rx - 16}
            y={260 - band.ry + 6}
            fill="#94a3b8"
            fontSize="12"
            textAnchor="end"
          >
            {band.label}
          </text>
        </g>
      ))}

      <g aria-label="用户当前位置">
        <circle cx="360" cy="260" r="54" fill="url(#pathfinder-user-glow)" />
        <circle cx="360" cy="260" r="25" fill="#0f766e" stroke="#99f6e4" strokeWidth="2" />
        <text x="360" y="255" fill="#ecfeff" fontSize="13" fontWeight="700" textAnchor="middle">
          你的位置
        </text>
        <text x="360" y="274" fill="#ccfbf1" fontSize="11" textAnchor="middle">
          已确认背景
        </text>
      </g>

      {roles.map((role) => (
        <RoleStarNode
          key={role.id}
          role={role}
          selected={selectedRoleId === role.id}
          highlighted={highlightedRoleIds.includes(role.id)}
          onSelectRole={onSelectRole}
        />
      ))}
    </svg>
  );
}

function RoleStarNode({
  role,
  selected,
  highlighted,
  onSelectRole,
}: {
  role: RoleStarPoint;
  selected: boolean;
  highlighted: boolean;
  onSelectRole: (roleId: string) => void;
}) {
  const accent = highlighted ? "#fbbf24" : starmapFieldColors[role.field];
  const labelLines = roleTitleLines(role.title);
  const labelAbove = role.y < 260;
  const labelY = role.y + (labelAbove ? -28 : 34);
  const hitY = labelAbove ? role.y - 58 : role.y - 18;

  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectRole(role.id);
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`查看${role.title}`}
      aria-pressed={selected}
      onClick={() => onSelectRole(role.id)}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none"
    >
      <rect
        x={role.x - 76}
        y={hitY}
        width="152"
        height={labelLines.length > 1 ? "78" : "62"}
        fill="transparent"
        pointerEvents="all"
      />
      <line
        x1="360"
        y1="260"
        x2={role.x}
        y2={role.y}
        stroke={accent}
        strokeOpacity={highlighted || selected ? "0.44" : "0.14"}
        strokeWidth={highlighted || selected ? "1.8" : "1"}
      />
      <circle
        cx={role.x}
        cy={role.y}
        r={highlighted ? 16 : 12}
        fill={selected ? "#ecfeff" : accent}
        fillOpacity={selected ? "1" : highlighted ? "0.95" : "0.78"}
        stroke={selected ? accent : "#0f172a"}
        strokeWidth={selected ? "3" : "1.6"}
        filter={highlighted ? "url(#pathfinder-star-glow)" : undefined}
      />
      <circle
        cx={role.x}
        cy={role.y}
        r={highlighted ? 28 : 21}
        fill="none"
        stroke={accent}
        strokeOpacity={selected ? "0.6" : highlighted ? "0.32" : "0.12"}
        strokeWidth="1.4"
      />
      <text
        x={role.x}
        y={labelY}
        fill={selected ? "#f8fafc" : "#dbeafe"}
        fontSize="12"
        fontWeight={selected || highlighted ? "700" : "600"}
        textAnchor="middle"
      >
        {labelLines.map((line, index) => (
          <tspan key={line} x={role.x} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function RoleDetailPanel({
  role,
  highlighted,
  canGeneratePackage,
  isGenerating,
  onGenerateTrialPackage,
}: {
  role: RoleStarPoint;
  highlighted: boolean;
  canGeneratePackage: boolean;
  isGenerating: boolean;
  onGenerateTrialPackage: () => void;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={role.field} tone="slate" />
        <StatusPill
          label={highlighted ? "重点试航星点" : "可以先了解"}
          tone={highlighted ? "teal" : "amber"}
        />
      </div>
      <h2 className="mt-3 text-xl font-semibold text-slate-950">{role.title}</h2>
      <div className="mt-4 space-y-4">
        <InfoBlock title="岗位做什么" items={[role.workSummary]} />
        <InfoBlock
          title="岗位适配判断"
          items={[
            highlighted
              ? role.fitJudgement
              : `可以先了解；${role.nonHighlightReason}`,
          ]}
        />
        <InfoBlock
          title="为什么靠近 / 稍远"
          items={[
            role.distanceLabel,
            highlighted ? role.highlightReason : role.nonHighlightReason,
          ]}
        />
        <InfoBlock title="可先体验的岗位场景" items={role.firstScenes} />
        <InfoBlock title="相关岗位叫法" items={role.aliases} />
        <InfoBlock title="样例 JD 信号" items={role.jdSignals} />
        <InfoBlock title="常见交付物" items={role.deliverables} />
        <InfoBlock title="迁移入口" items={role.migrationEntries} />
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-950">
            进入岗位试航任务
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {pilotActionCopy(role.pilotType)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PilotTypeTag type={role.pilotType} />
            {role.pilotType === "development" && canGeneratePackage ? (
              <ActionButton onClick={onGenerateTrialPackage} disabled={isGenerating}>
                {isGenerating ? "正在生成适航任务" : "生成岗位试航任务"}
              </ActionButton>
            ) : (
              <StatusPill
                label={role.pilotType === "development" ? "先选择下方项目" : "查看下方任务框架"}
                tone="amber"
              />
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function PathfinderTrialPage() {
  const { state, userProfile, trialAnswerMap, answerQuestion } = usePathfinder();
  const sourceProject =
    state.trailRecord.trialPackageCandidate?.sourceProject ?? openDocumentsProjectRecord;
  const activeTrialQuestions = useMemo(
    () =>
      normalizeTrialQuestions(
        state.trailRecord.trialPackageCandidate?.trialQuestions,
      ),
    [state.trailRecord.trialPackageCandidate?.trialQuestions],
  );
  const missing = activeTrialQuestions.filter(
    (question) => !trialAnswerMap[question.id]?.trim(),
  );
  const canEnterResult =
    state.profileSubmitted &&
    isUserProfileReady(userProfile) &&
    missing.length === 0 &&
    state.trailRecord.status !== "anti_packaging_blocked";

  if (!state.profileSubmitted || !isUserProfileReady(userProfile)) {
    return (
      <div>
        <PageHeader
          title="需要先补充背景"
          description="适航任务必须基于真实用户背景开始，不提供默认身份或默认作答。"
        />
        <ButtonLink href="/pathfinder/background">返回背景页</ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${sourceProject.name} 适航任务`}
        description="围绕已核验公开项目做拆解和场景改造，所有作答必须来自你的真实理解与人工确认。"
        eyebrow={`${profileName(userProfile)} / ${statusLabelForRecord(state.trailRecord.status)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                {sourceProject.name} 来源参照
              </h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>项目：{sourceProject.name}</p>
              <p className="break-all">来源：{sourceProject.sourceUrl}</p>
              <p>License：{sourceProject.license}</p>
              <p>核验状态：{sourceProject.licenseVerificationStatus}</p>
              {sourceProject.sourceBoundary ? <p>{sourceProject.sourceBoundary}</p> : null}
              <InfoBlock
                title="公开能力"
                items={sourceProject.publicCapabilities.slice(0, 4)}
              />
              <InfoBlock
                title="可用表达边界"
                items={sourceProject.allowedContexts.slice(0, 3)}
              />
              <InfoBlock
                title="不可声称"
                items={sourceProject.forbiddenClaims.slice(0, 3)}
              />
            </div>
          </Panel>
          <Notice
            title={missing.length ? "适航问答尚未完成" : "适航问答已完成"}
            tone={missing.length ? "amber" : "teal"}
          >
            {missing.length
              ? `未完成：${missing.map((question) => question.title).join("、")}。`
              : "可以进入适航成果包查看证据链、边界和 Markdown 导出。"}
          </Notice>
          <StatusPill
            label={statusLabelForBackend(state.backendSync.status)}
            tone={statusToneForBackend(state.backendSync.status)}
          />
        </div>

        <Section title="适航作答">
          <Panel>
            <div className="space-y-5">
              {activeTrialQuestions.map((question, index) => {
                const value = trialAnswerMap[question.id] ?? "";
                return (
                  <div
                    key={question.id}
                    className="rounded-md border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label
                        htmlFor={question.id}
                        className="flex items-center gap-3 text-base font-semibold text-slate-950"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm ${
                            value.trim()
                              ? "border-teal-200 bg-teal-50 text-teal-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span>{question.title}</span>
                      </label>
                      <StatusPill
                        label={value.trim() ? "已填写" : "缺项"}
                        tone={value.trim() ? "teal" : "amber"}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {question.prompt}
                    </p>
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                      {question.helper}
                    </p>
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                      成果包模块：{trialQuestionImpacts[question.id]}
                    </p>
                    <textarea
                      id={question.id}
                      value={value}
                      onChange={(event) =>
                        answerQuestion(question.id, event.target.value)
                      }
                      rows={5}
                      className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      placeholder="填写你的真实适航作答"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {canEnterResult ? (
                <ButtonLink href="/pathfinder/result">进入适航成果包</ButtonLink>
              ) : (
                <ActionButton disabled>进入适航成果包</ActionButton>
              )}
              <ButtonLink href="/pathfinder/recommendation" variant="secondary">
                返回星图
              </ButtonLink>
            </div>
          </Panel>
        </Section>
      </div>
    </div>
  );
}

export function PathfinderResultPage() {
  const { state, userProfile, trialAnswerMap, saveMarkdownSnapshot } = usePathfinder();
  const [copyStatus, setCopyStatus] = useState<string>("");
  const selectedPathId = (state.trailRecord.selectedPathId || priorityPathId) as PathId;
  const sourceProject =
    state.trailRecord.trialPackageCandidate?.sourceProject ?? openDocumentsProjectRecord;
  const activeTrialQuestions = useMemo(
    () =>
      normalizeTrialQuestions(
        state.trailRecord.trialPackageCandidate?.trialQuestions,
      ),
    [state.trailRecord.trialPackageCandidate?.trialQuestions],
  );
  const selectedRole = activeRoleForPath(selectedPathId);
  const markdownInput = useMemo(
    () =>
      createMarkdownInput(
        selectedPathId,
        userProfile,
        trialAnswerMap,
        activeTrialQuestions,
        sourceProject,
      ),
    [
      activeTrialQuestions,
      selectedPathId,
      sourceProject,
      trialAnswerMap,
      userProfile,
    ],
  );
  const markdownResult = useMemo(
    () => generatePathfinderMarkdown(markdownInput),
    [markdownInput],
  );
  const missing =
    !markdownResult.ok && markdownResult.reason === "missing_questions"
      ? markdownResult.missingQuestionIds
      : [];
  const antiPackagingCheck = markdownResult.antiPackagingCheck;

  useEffect(() => {
    if (
      !markdownResult.ok &&
      markdownResult.reason === "anti_packaging_blocked" &&
      state.trailRecord.markdownSnapshot?.exportScope !== "draft"
    ) {
      saveMarkdownSnapshot(markdownResult.draftSnapshot, antiPackagingCheck);
    }
  }, [
    antiPackagingCheck,
    markdownResult,
    saveMarkdownSnapshot,
    state.trailRecord.markdownSnapshot?.exportScope,
  ]);

  async function copyMarkdown(markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown);
      if (markdownResult.ok) {
        saveMarkdownSnapshot(markdownResult.snapshot, antiPackagingCheck);
      }
      setCopyStatus("Markdown 已复制。");
    } catch {
      setCopyStatus("复制失败，请手动选择预览内容。");
    }
  }

  function downloadMarkdown(markdown: string, filename: string) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    if (markdownResult.ok) {
      saveMarkdownSnapshot(markdownResult.snapshot, antiPackagingCheck);
    }
    setCopyStatus("Markdown 已开始下载。");
  }

  if (!state.profileSubmitted || !isUserProfileReady(userProfile)) {
    return (
      <div>
        <PageHeader
          title="适航成果包尚未生成"
          description="请先补充背景、选择岗位星点并完成适航任务。"
        />
        <ButtonLink href="/pathfinder/background">返回背景页</ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="适航成果包"
        description="这里整理岗位星点结论、适航产出、证据链边界和 3/7 天打磨计划。Markdown 只是导出格式。"
        eyebrow={`${profileName(userProfile)} / ${selectedRole.title} / ${statusLabelForRecord(state.trailRecord.status)}`}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <GitBranch className="h-4 w-4 text-teal-700" aria-hidden="true" />
              证据链
            </div>
            <StatusPill
              label={statusLabelForRecord(state.trailRecord.status)}
              tone={statusToneForRecord(state.trailRecord.status)}
            />
            <StatusPill
              label={statusLabelForBackend(state.backendSync.status)}
              tone={statusToneForBackend(state.backendSync.status)}
            />
          </div>
          <p className="mt-3 text-base leading-7 text-slate-800">
            样例 JD 信号 + {profileName(userProfile)}背景 + {sourceProject.name} 公开来源 -&gt; 适航作答 -&gt; 成果包草稿。
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <TraceNode
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              title="输入"
              body="用户确认背景、样例 JD 信号、公开项目来源"
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
              title="过程"
              body="适航问答、边界说明、人工确认"
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
              title="输出"
              body="岗位星点结论、成果包、打磨计划"
            />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${
                markdownResult.ok
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {markdownResult.ok ? (
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              ) : (
                <CircleAlert className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">
                成果包状态
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-950">
                {markdownResult.ok ? "适航材料已就绪" : "仍有缺口需要补齐"}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {antiPackagingCheck.exportAllowed
                  ? "反包装检查未发现导出阻断。"
                  : "缺项或风险表达会阻断完整导出。"}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {missing.length > 0 ? (
        <div className="mb-6">
          <Notice title="适航问答尚未完成" tone="amber">
            缺少：{missing.map((id) => activeTrialQuestions.find((q) => q.id === id)?.title ?? id).join("、")}。
          </Notice>
        </div>
      ) : null}

      <Section title="1. 岗位星点结论">
        <Panel>
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <InfoBlock
              title={selectedRole.title}
              items={[
                `星域：${selectedRole.field}`,
                `任务类型：${pilotTypeLabels[selectedRole.pilotType]}`,
                selectedRole.highlightReason,
              ]}
            />
            <InfoBlock title="JD 样例信号" items={selectedRole.jdSignals} />
          </div>
        </Panel>
      </Section>

      <Section title="2. 适航成果包">
        <Panel>
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoBlock
              title="成果模块"
              items={pilotTypeOutputs[selectedRole.pilotType]}
            />
            <InfoBlock
              title="本次来源"
              items={[
                sourceProject.name,
                sourceProject.license,
                sourceProject.licenseVerificationStatus,
              ]}
            />
            <InfoBlock
              title="已回答任务"
              items={activeTrialQuestions
                .filter((question) => trialAnswerMap[question.id]?.trim())
                .map((question) => question.title)
                .slice(0, 6)}
            />
          </div>
        </Panel>
      </Section>

      <Section title="3. 证据链与边界">
        <Panel tone={antiPackagingCheck.exportAllowed ? "teal" : "rose"}>
          <div className="grid gap-4 lg:grid-cols-3">
            <InfoBlock
              title="来源"
              items={[
                `${profileName(userProfile)}确认背景`,
                sampleJdNotice,
                `${sourceProject.name} 公开来源`,
              ]}
            />
            <InfoBlock
              title="边界"
              items={[
                "不声称参与原开源项目开发、维护或官方贡献。",
                "不把公开项目能力写成个人已交付成果。",
                "不输出录用判断或企业筛选结论。",
              ]}
            />
            <InfoBlock
              title="反包装检查"
              items={[
                antiPackagingCheck.status,
                `阻断 ${antiPackagingCheck.blockingCount} 项`,
                `提示 ${antiPackagingCheck.warningCount} 项`,
              ]}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {Object.entries(requiredMarkdownSectionLabels).map(([section, label]) => (
              <div
                key={section}
                className={`rounded-md border px-3 py-2 text-sm ${
                  antiPackagingCheck.requiredMarkdownSections[
                    section as RequiredMarkdownSection
                  ]
                    ? "border-teal-100 bg-white text-slate-700"
                    : "border-rose-100 bg-rose-50 text-rose-800"
                }`}
              >
                {label.replace("## ", "")}
              </div>
            ))}
          </div>
        </Panel>
      </Section>

      <Section title="4. 下一步 3/7 天打磨计划">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <h3 className="text-base font-semibold text-slate-950">3 天</h3>
            <BulletList
              items={[
                "补齐一段最具体的真实经历：背景、动作、材料、结果、边界。",
                "把适航作答改成可复核条目，删掉夸大或归属不清的表述。",
                "为当前重点星点准备 3 个面试追问和证据来源。",
              ]}
            />
          </Panel>
          <Panel>
            <h3 className="text-base font-semibold text-slate-950">7 天</h3>
            <BulletList
              items={[
                "完成一个小型原型、流程图或运营方案草稿。",
                "补一页来源、License、不可声称内容和人工确认说明。",
                "用一次模拟讲解检查能否把岗位星点、任务和证据链讲清楚。",
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section title="Markdown 导出">
        <Panel tone={markdownResult.ok ? "teal" : "amber"}>
          <p className="text-sm leading-6 text-slate-700">
            Markdown 只是把适航成果包导出为便于复核的文本，不是主结果本身。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {markdownExportItems.map((item) => (
              <div
                key={item}
                className="rounded-md border border-white bg-white px-3 py-2 text-sm text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
          {markdownResult.ok ? (
            <div className="mt-4">
              <div className="mb-4 flex flex-wrap gap-3">
                <ActionButton onClick={() => copyMarkdown(markdownResult.markdown)}>
                  复制 Markdown
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    downloadMarkdown(markdownResult.markdown, markdownResult.filename)
                  }
                  variant="secondary"
                >
                  下载 Markdown
                </ActionButton>
                {copyStatus ? (
                  <span className="self-center text-sm text-teal-800">
                    {copyStatus}
                  </span>
                ) : null}
              </div>
              <textarea
                readOnly
                value={markdownResult.markdown}
                rows={14}
                className="w-full rounded-md border border-teal-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-800"
              />
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-slate-700">
                {markdownResult.reason === "anti_packaging_blocked"
                  ? "反包装检查命中阻断项，可保留草稿快照，但不能导出完整 Markdown。"
                  : "还有适航问答未完成，暂不能导出完整 Markdown。"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton disabled>复制 Markdown</ActionButton>
                <ActionButton disabled variant="secondary">
                  下载 Markdown
                </ActionButton>
                <ButtonLink href="/pathfinder/trial" variant="secondary">
                  返回补充作答
                </ButtonLink>
              </div>
            </div>
          )}
        </Panel>
      </Section>
    </div>
  );
}

function PilotCard({
  type,
  title,
  body,
  outputs,
  active,
  children,
}: {
  type: PilotType;
  title: string;
  body: string;
  outputs: string[];
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Panel tone={active ? "teal" : "default"}>
      <div className="flex flex-wrap items-center gap-2">
        <PilotTypeTag type={type} />
        {active ? <StatusPill label="当前星点匹配" tone="teal" /> : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-3">
        <BulletList items={outputs} />
      </div>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-2">
        <BulletList items={items.filter(Boolean)} />
      </div>
    </div>
  );
}

function TraceNode({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className="text-teal-700">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}
