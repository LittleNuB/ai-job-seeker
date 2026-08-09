# Competitive Capability Matrix

Status: Draft for owner review
Research date: 2026-08-09

Related decision draft: [AI Job Copilot Product Definition](./PRODUCT_DEFINITION.md)

## Purpose and method

这份矩阵专门回答一个问题：市场上是否已经有人在做“把普通经历挖出来并合理美化成更强简历”。答案是**有，而且国内外都已经出现直接竞品**。

研究只记录截至研究日能从产品官网或官方帮助中心确认的能力。官网营销文案能够证明产品如何定位自己，不能证明实际效果、用户规模或模型质量。

符号含义：

- **●**：官方材料明确提供。
- **◐**：提供相邻或受限能力，但不能确认等价。
- **—**：本次查看的官方材料未能确认；不代表产品一定没有。

本轮选择八个代表：两款直接面向中国求职者的对话挖掘产品、一个中文简历工作台、三个成熟 AI 简历生成器，以及两个更强调控制或事实约束的英文工具。

## Capability matrix

### 经历挖掘与表达增益

| 产品 | 引导式经历挖掘 | JD 定向 | 成就/结果重构 | 量化引导 | 表达或语气控制 | 逐条用户编辑 |
| --- | --- | --- | --- | --- | --- | --- |
| OfferCat | ● | ● | ● | ◐ | — | ◐ |
| EvoResume | ● | ● | ● | ● | — | ◐ |
| TalenCat | — | ● | ● | ◐ | — | ● |
| Teal | ● | ● | ● | ● | — | ● |
| Rezi | ◐ | ● | ● | ● | — | ● |
| Kickresume | — | ◐ | ● | ● | — | ● |
| Resuque | — | ● | ● | ◐ | ● | ● |
| Weekday | ◐ | ● | ● | ● | ◐ | ● |

这里的“表达或语气控制”只表示用户可以选择 tone、seniority 或相邻控制项，不等于能够控制责任、因果和影响主张的强弱。Teal 的 Bullet Assistant 属于结构化引导：用户填写行动、方法与影响等字段；它不同于自由对话式访谈，但已经覆盖核心成就框架。

### 边界、面试与反馈闭环

| 产品 | 明示不静默编造重要事实 | 简历主张连接面试追问 | 中国招聘市场定位 | 中文 AI 岗位专门化 | 投递结果学习闭环 | 自托管/BYOK |
| --- | --- | --- | --- | --- | --- | --- |
| OfferCat | — | — | ● | — | — | — |
| EvoResume | ◐ | ◐ | ● | — | — | — |
| TalenCat | — | ◐ | ● | — | — | — |
| Teal | ◐ | — | — | — | — | — |
| Rezi | ● | ◐ | — | — | — | — |
| Kickresume | ◐ | — | — | — | — | — |
| Resuque | ● | — | — | — | ◐ | — |
| Weekday | ● | — | — | — | — | — |

“简历主张连接面试追问”要求面试准备直接从用户刚选中的主张继续，而不是产品同时存在一个独立模拟面试模块。TalenCat 明确提供基于简历的多轮问答，EvoResume 用“简历审讯”描述逐句追问，因此标为相邻能力；本次未确认它们是否维护主张到面试故事的逐条链路。

## Representative findings

### 1. 国内已经出现最直接的同类定位

OfferCat 明确宣传“AI 对话挖掘经历”，流程是粘贴 JD、与 AI 聊天、由 AI 引导式追问关键信息，再生成面向中国求职者的简历。EvoResume 更直接地使用“简历审讯”定位，宣传逐句追问、挖出数据、重构 STAR 并对齐 JD。

因此，“自然对话＋经历挖掘＋中国市场”不能再被称为未被满足的产品空白。

### 2. 成就量化和强动词已经高度商品化

Teal 用结构化字段帮助用户写清做了什么、如何做、为什么做以及产生的影响。Rezi 可以生成标准 bullet、带数字的 bullet 和多个重写版本。Kickresume 甚至只要求职位和公司就能从零生成工作经历，并鼓励用户再补具体成绩与数字。

这说明“把职责改成结果”“加入数字”“用 STAR/XYZ 公式”已经是基础能力，不足以形成主张。

### 3. 不编数字也已经有人做

Weekday 明确声称不发明数字，在没有指标时提示用户补充或使用比较表达；Resuque 强调改写基于现有 bullet 和目标岗位，并由用户审批建议；Rezi 也提醒用户确认生成的指标是否准确反映个人经历。

因此，“不幻觉”是质量底线和可评测指标，不是单独的市场差异。

### 4. 语气控制存在，但“主张强度控制”仍未被明确占据

Resuque 提供 formal、technical、casual 等 tone；Weekday 根据职位资历调整语气和指标权重。但本轮没有在这些官方材料中确认：产品把同一事实系统地生成“稳妥、竞争、冲刺”三档，并让用户看见责任、因果和影响分别增强在哪里。

这是当前最值得验证的交互切口，但只能说“本轮未确认”，不能说市场上绝对没有。

### 5. 简历和面试通常是并列模块，不是同一条主张链

TalenCat 提供基于简历的多轮文字面试，Rezi 也有相邻的面试练习能力；但本轮没有确认主流产品会对用户刚接受的每一条强主张立即生成故事与连续追问，再把讲述中发现的细节回写简历。

这给 AI Job Copilot 留下一个更具体的闭环：**写强一句，马上检验这句话能不能被讲开；讲开的新细节再反哺简历。**

## Implications for AI Job Copilot

### 不能作为差异化的能力

- AI 简历优化；
- AI 对话挖掘经历；
- ATS、关键词或 JD 匹配；
- STAR、XYZ、行动动词或量化结果；
- “更懂中国招聘市场”；
- 逐条接受和编辑 AI 建议；
- 单独提供模拟面试；
- 声明模型不会编数字。

### 更可信的待验证产品主张

> AI Job Copilot 面向中文 AI 岗位，用最少的自适应追问把普通经历挖成可复用的事实底稿，再提供可控的主张强度；用户选中的每条简历主张都能立即变成经得起连续追问的面试故事，并通过跨投递结果逐步学习哪种表达真正有效。

这个主张由五部分组成：中文 AI 岗位语义、追问效率、主张阶梯、简历到面试的逐条桥接、投递结果回流。每一部分都可以被竞品复制；只有持续积累真实使用与结果数据，组合才可能形成优势。

## Sources

- [OfferCat](https://www.offerscat.app/) — AI 对话挖掘经历、引导式追问、JD 匹配和中国招聘市场定位。
- [EvoResume](https://www.evoresume.tech/) — 逐句追问、数据挖掘、STAR 重构、JD 对齐和中文求职定位。
- [TalenCat](https://talencat.cn/) — JD 定向简历、经历表达优化和基于简历的多轮面试。
- [Teal Bullet Assistant](https://help.tealhq.com/en/articles/9457691-leveraging-the-bullet-assistant) — 行动、方法、影响和指标的结构化 bullet 引导。
- [Rezi Experience Guide](https://www.rezi.ai/rezi-docs/the-resume-experience-section-best-practices) — 成就导向、量化、生成与重写，并提醒核对指标。
- [Kickresume AI Bullet Point Generator](https://www.kickresume.com/en/ai-resume-bullet-point-generator/) — 从职位和公司生成经历 bullet，再由用户补充成绩和数字。
- [Resuque](https://resuque.com/) — 基于现有经历和目标岗位改写、tone 选择、逐条审批和投递追踪。
- [Weekday Resume Bullet Rewriter](https://www.weekday.works/resume-bullet-rewriter) — JD 定向、量化提示、资历校准和不编数字规则。
- [SHRM: How to Spot AI-Generated Lies on a Resume](https://www.shrm.org/topics-tools/news/technology/how-to-spot-ai-generated-lies-on-a-resume) — 招聘方常用连续追问识别无法展开的夸大主张；同时区分合理增益与虚构。
