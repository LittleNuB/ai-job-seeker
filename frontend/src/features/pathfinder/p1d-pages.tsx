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
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
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
  aliases: string[];
  jdSignals: string[];
  deliverables: string[];
  migrationEntries: string[];
  highlightReason: string;
  nonHighlightReason: string;
  pilotType: PilotType;
}

const roleStarPoints: RoleStarPoint[] = [
  {
    id: "ai-product-assistant",
    field: "AI 产品 / 应用",
    title: "行业 AI 应用产品助理",
    pathId: "industry-ai-product-assistant",
    aliases: ["AI 产品助理", "知识库产品助理", "行业应用产品专员"],
    jdSignals: ["需求拆解", "PRD 草稿", "问答样例", "验收口径", "Demo 测试"],
    deliverables: ["场景说明", "用户流程", "MVP 范围", "验收清单"],
    migrationEntries: ["行业资料整理", "用户访谈", "流程梳理", "AI 工具使用记录"],
    highlightReason: "你的背景里如果有资料整理、流程拆解或跨角色沟通，优先从这里形成作品集起点。",
    nonHighlightReason: "如果还缺少真实业务场景或用户问题，可以先补充一段具体项目经历。",
    pilotType: "product",
  },
  {
    id: "knowledge-base-product",
    field: "AI 产品 / 应用",
    title: "AI 知识库产品助理",
    pathId: "industry-ai-product-assistant",
    aliases: ["知识库运营产品", "RAG 产品助理", "企业问答产品助理"],
    jdSignals: ["资料源盘点", "引用展示", "失败兜底", "人工复核", "反馈闭环"],
    deliverables: ["资料范围表", "问答样例集", "引用规则", "风险边界"],
    migrationEntries: ["客服知识库", "内部文档", "培训材料", "FAQ 维护"],
    highlightReason: "适合把文档、知识库、客服或培训资料经验转成可解释的 AI 应用材料。",
    nonHighlightReason: "如果没有资料治理或问答场景，可先作为探索星点。",
    pilotType: "product",
  },
  {
    id: "solution-assistant",
    field: "AI 产品 / 应用",
    title: "AI 解决方案助理",
    pathId: "industry-ai-solution-assistant",
    aliases: ["售前方案助理", "PoC 方案助理", "行业解决方案专员"],
    jdSignals: ["客户访谈纪要", "痛点整理", "PoC 范围", "Demo 脚本", "交付边界"],
    deliverables: ["方案大纲", "PoC 清单", "角色分工", "风险假设"],
    migrationEntries: ["客户沟通", "方案 PPT", "项目协调", "交付复盘"],
    highlightReason: "适合有沟通、方案材料或项目协调经历的用户试航。",
    nonHighlightReason: "如果缺少客户或业务侧沟通证据，先补充协作细节。",
    pilotType: "product",
  },
  {
    id: "llm-app-engineer",
    field: "AI 开发 / 工程",
    title: "大模型应用工程助理",
    pathId: "algorithm-llm-engineer",
    aliases: ["LLM 应用开发", "AI 应用工程助理", "Prompt 工程助理"],
    jdSignals: ["模型调用流程", "Prompt 调试", "日志观察", "异常兜底", "接口联调"],
    deliverables: ["小型原型", "调用流程", "测试记录", "边界说明"],
    migrationEntries: ["Python/JS 基础", "自动化脚本", "低代码工具", "技术文档阅读"],
    highlightReason: "如果你已有可运行代码或工具集成经验，可把它作为工程试航入口。",
    nonHighlightReason: "如果缺少代码或实验记录，短期不把它作为主攻结论。",
    pilotType: "development",
  },
  {
    id: "rag-engineering",
    field: "AI 开发 / 工程",
    title: "RAG 应用工程助理",
    pathId: "algorithm-llm-engineer",
    aliases: ["知识库工程助理", "检索增强应用开发", "文档问答工程助理"],
    jdSignals: ["文档切分", "向量检索", "引用返回", "召回调试", "权限边界"],
    deliverables: ["项目拆解", "检索流程图", "测试样例", "改造建议"],
    migrationEntries: ["公开项目阅读", "数据清洗", "文档系统", "搜索体验"],
    highlightReason: "适合用已核验开源项目做阅读和场景改造，不声称参与原项目。",
    nonHighlightReason: "如果没有工程基础，可先做产品或运营类试航，再补代码材料。",
    pilotType: "development",
  },
  {
    id: "implementation-engineer",
    field: "AI 开发 / 工程",
    title: "AI 应用实施助理",
    pathId: "ai-application-ops-implementation-assistant",
    aliases: ["AI 实施顾问助理", "系统配置助理", "交付支持助理"],
    jdSignals: ["环境配置", "需求确认", "权限检查", "用户培训", "问题记录"],
    deliverables: ["实施清单", "验收表", "培训脚本", "问题台账"],
    migrationEntries: ["SaaS 实施", "客户成功", "运维支持", "流程培训"],
    highlightReason: "适合有工具落地、培训、支持或跨团队推进经验的用户。",
    nonHighlightReason: "如果缺少真实交付流程，先补充一次工具配置或体验营记录。",
    pilotType: "development",
  },
  {
    id: "data-evaluation",
    field: "AI 数据 / 评测",
    title: "AI 数据评测助理",
    pathId: "ai-data-evaluation-assistant",
    aliases: ["模型评测助理", "数据质检助理", "问答评测专员"],
    jdSignals: ["样例构造", "标注规范", "抽检记录", "错误归因", "复核流程"],
    deliverables: ["评测样例表", "错误分类", "质检流程", "复盘记录"],
    migrationEntries: ["数据整理", "内容审核", "测试记录", "表格分析"],
    highlightReason: "适合把数据、质检、审核或测试经历转成可复核材料。",
    nonHighlightReason: "如果没有样例或质检动作，建议先补充一段数据处理经历。",
    pilotType: "operations",
  },
  {
    id: "annotation-qc",
    field: "AI 数据 / 评测",
    title: "标注质检与样例库运营",
    pathId: "ai-data-evaluation-assistant",
    aliases: ["标注运营", "样例库维护", "质检流程助理"],
    jdSignals: ["口径维护", "批次管理", "一致性检查", "反馈闭环", "人员协同"],
    deliverables: ["标注口径", "样例库目录", "质检表", "协作 SOP"],
    migrationEntries: ["内容运营", "客服质检", "审核流程", "培训材料"],
    highlightReason: "适合把重复流程和质量管理经验转成 AI 数据侧试航材料。",
    nonHighlightReason: "如果缺少流程复盘，先补一次人工审核或样例整理。",
    pilotType: "operations",
  },
  {
    id: "feedback-analyst",
    field: "AI 数据 / 评测",
    title: "模型反馈分析助理",
    pathId: "ai-data-evaluation-assistant",
    aliases: ["用户反馈分析", "问答失败分析", "AI 体验分析助理"],
    jdSignals: ["反馈收集", "问题归类", "失败案例", "改进建议", "复测记录"],
    deliverables: ["反馈看板", "失败案例库", "改进清单", "复测说明"],
    migrationEntries: ["用户运营", "客服反馈", "产品体验", "数据复盘"],
    highlightReason: "适合有用户反馈、表格整理或体验复盘经历的用户。",
    nonHighlightReason: "如果没有用户反馈材料，先从一次工具体验记录开始。",
    pilotType: "operations",
  },
  {
    id: "ai-tool-ops",
    field: "AI 运营 / 增长",
    title: "AI 工具运营助理",
    pathId: "ai-application-ops-implementation-assistant",
    aliases: ["AI 工具体验运营", "用户教育运营", "工具落地助理"],
    jdSignals: ["工具选型", "使用教程", "体验任务", "反馈表", "复盘指标"],
    deliverables: ["体验营方案", "任务卡", "内容日历", "反馈闭环"],
    migrationEntries: ["社群运营", "培训组织", "内容策划", "工具体验"],
    highlightReason: "适合把运营、培训、社群或内容经验连接到 AI 工具落地。",
    nonHighlightReason: "如果缺少组织或内容材料，可以先做一个 3 天体验营方案。",
    pilotType: "operations",
  },
  {
    id: "ai-content-growth",
    field: "AI 运营 / 增长",
    title: "AI 内容增长助理",
    aliases: ["AI 内容运营", "增长内容策划", "产品教育内容助理"],
    jdSignals: ["用户画像", "内容选题", "工具案例", "渠道节奏", "反馈数据"],
    deliverables: ["选题表", "内容脚本", "渠道计划", "复盘框架"],
    migrationEntries: ["新媒体运营", "课程内容", "用户增长", "案例撰写"],
    highlightReason: "适合用内容和用户教育经验做 AI 工具采用试航。",
    nonHighlightReason: "该星点当前适合作为探索方向，暂不生成完整试航工单。",
    pilotType: "operations",
  },
  {
    id: "ai-experience-camp",
    field: "AI 运营 / 增长",
    title: "AI 工具体验营策划",
    aliases: ["AI 训练营运营", "工具上手活动策划", "用户教育项目助理"],
    jdSignals: ["活动节奏", "任务设计", "用户分层", "答疑机制", "复盘指标"],
    deliverables: ["3 天体验营", "任务手册", "答疑 SOP", "复盘表"],
    migrationEntries: ["活动运营", "社群陪跑", "培训执行", "课程助教"],
    highlightReason: "适合把组织、陪跑、内容和反馈能力组合成低门槛试航。",
    nonHighlightReason: "如果没有活动经验，可从一次小范围工具体验记录开始。",
    pilotType: "operations",
  },
];

const roleByPathId: Partial<Record<PathId, string>> = {
  "industry-ai-product-assistant": "ai-product-assistant",
  "industry-ai-solution-assistant": "solution-assistant",
  "ai-data-evaluation-assistant": "data-evaluation",
  "ai-application-ops-implementation-assistant": "ai-tool-ops",
  "algorithm-llm-engineer": "rag-engineering",
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

function highlightedRoleIds(responsePaths?: Array<{ pathId: PathId; decision: string }>) {
  const fromResponse =
    responsePaths
      ?.filter((path) => path.decision !== "not_recommended_short_term")
      .map((path) => roleByPathId[path.pathId])
      .filter((id): id is string => Boolean(id)) ?? [];
  return Array.from(
    new Set([
      ...fromResponse,
      "ai-product-assistant",
      "solution-assistant",
      "data-evaluation",
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
  const topRoleIds = highlightedRoleIds(recommendation?.paths);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(topRoleIds[0] ?? roleStarPoints[0].id);
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
    setSelectedRoleId((current) => current || topRoleIds[0] || roleStarPoints[0].id);
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
        description="12 个岗位星点按星域展开，Top 3 代表当前更值得试航的方向；它们不是录用判断，只是有证据链的探索入口。"
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {topRoleIds.map((roleId, index) => {
          const role = roleStarPoints.find((item) => item.id === roleId);
          if (!role) return null;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-left transition hover:border-teal-400"
            >
              <div className="text-xs font-semibold text-teal-700">Top {index + 1}</div>
              <div className="mt-2 text-base font-semibold text-slate-950">
                {role.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {role.highlightReason}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="rounded-lg border border-slate-800 bg-[#10171c] p-4 text-slate-100 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-teal-200">
                2.5D 岗位星图工作台
              </div>
              <p className="mt-1 text-sm text-slate-400">
                点击任意星点查看 JD 信号、迁移入口和适航任务类型。
              </p>
            </div>
            <div className="rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200">
              证据链展示，不呈现量化结论
            </div>
          </div>

          <div
            className="rounded-lg border border-slate-700/80 p-4"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 24%, rgba(45,212,191,0.22) 0 1px, transparent 3px), radial-gradient(circle at 70% 18%, rgba(251,191,36,0.18) 0 1px, transparent 3px), radial-gradient(circle at 40% 75%, rgba(125,211,252,0.18) 0 1px, transparent 3px), linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
              backgroundSize: "180px 160px, 220px 180px, 260px 210px, 44px 44px, 44px 44px",
            }}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(["AI 产品 / 应用", "AI 开发 / 工程", "AI 数据 / 评测", "AI 运营 / 增长"] as const).map(
                (field) => (
                  <div key={field} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                    <div className="mb-3 text-sm font-semibold text-slate-200">
                      {field}
                    </div>
                    <div className="grid gap-3">
                      {roleStarPoints
                        .filter((role) => role.field === field)
                        .map((role) => {
                          const selected = role.id === selectedRole.id;
                          const highlighted = topRoleIds.includes(role.id);
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => setSelectedRoleId(role.id)}
                              className={`group min-h-24 rounded-md border p-3 text-left transition ${
                                selected
                                  ? "border-teal-300 bg-teal-300/15"
                                  : highlighted
                                    ? "border-amber-300/70 bg-amber-300/10 hover:border-amber-200"
                                    : "border-slate-700 bg-slate-900/75 hover:border-slate-500"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                                    highlighted ? "bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.75)]" : "bg-slate-400"
                                  }`}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white">
                                    {role.title}
                                  </div>
                                  <div className="mt-2">
                                    <PilotTypeTag type={role.pilotType} />
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={selectedRole.field} tone="slate" />
            {topRoleIds.includes(selectedRole.id) ? (
              <StatusPill label="Top 3 高亮" tone="teal" />
            ) : (
              <StatusPill label="可探索" tone="amber" />
            )}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-950">
            {selectedRole.title}
          </h2>
          <div className="mt-4 space-y-4">
            <InfoBlock title="相关岗位叫法" items={selectedRole.aliases} />
            <InfoBlock title="样例 JD 信号" items={selectedRole.jdSignals} />
            <InfoBlock title="常见交付物" items={selectedRole.deliverables} />
            <InfoBlock title="迁移入口" items={selectedRole.migrationEntries} />
            <InfoBlock
              title="为什么高亮 / 未高亮"
              items={[
                topRoleIds.includes(selectedRole.id)
                  ? selectedRole.highlightReason
                  : selectedRole.nonHighlightReason,
              ]}
            />
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                对应适航任务类型
              </h3>
              <div className="mt-2">
                <PilotTypeTag type={selectedRole.pilotType} />
              </div>
            </div>
          </div>
        </Panel>
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
                "为 Top 1 星点准备 3 个面试追问和证据来源。",
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
