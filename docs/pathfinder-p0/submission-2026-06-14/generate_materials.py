from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
SCREENSHOTS = ROOT / "screenshots"
FONT_PATH = "C:/Windows/Fonts/msyh.ttc"

PRODUCT_NAME = "寻径星图：帮转型求职者找到 AI 岗位切入点"
PRODUCT_INTRO = (
    "很多学生和早期求职者想进入 AI 行业，但并不清楚自己的专业、项目和实习经历能对应哪些岗位，"
    "也不知道该做什么准备来应对求职。\n\n"
    "寻径星图从这个问题出发：用户可以上传简历，也可以和 AI 聊自己的真实经历。系统会把经历整理成"
    "可确认的背景线索，再生成一张个人 AI 求职星图。星图里有基于真实 JD 样本提炼出的 AI 岗位星点，"
    "覆盖产品、开发、数据评测和运营增长等方向。用户可以看到当前更值得探索的几个岗位，也可以点开"
    "其他星点了解岗位任务、常见工作内容和适合的准备方式。\n\n"
    "在确定方向后，产品会给出对应的适航任务。开发方向可以从开源项目拆解开始，产品方向可以用 "
    "Vibe Coding 做一个原型，运营方向可以设计一次 AI 工具体验营。最后生成一份试航成果包，帮助用户"
    "把这次探索沉淀成岗位理解、任务产出和后续打磨计划。"
)


pdfmetrics.registerFont(TTFont("MSYH", FONT_PATH))
pdfmetrics.registerFont(TTFont("MSYH-Bold", FONT_PATH))

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "CNTitle",
        fontName="MSYH-Bold",
        fontSize=24,
        leading=32,
        textColor=colors.HexColor("#07111f"),
        alignment=TA_CENTER,
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        "CNSubtitle",
        fontName="MSYH",
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#536174"),
        alignment=TA_CENTER,
        spaceAfter=18,
    )
)
styles.add(
    ParagraphStyle(
        "CNH1",
        fontName="MSYH-Bold",
        fontSize=16,
        leading=23,
        textColor=colors.HexColor("#0f766e"),
        spaceBefore=10,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        "CNH2",
        fontName="MSYH-Bold",
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#111827"),
        spaceBefore=6,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        "CNBody",
        fontName="MSYH",
        fontSize=9.5,
        leading=15,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "SlideTitle",
        fontName="MSYH-Bold",
        fontSize=27,
        leading=35,
        textColor=colors.HexColor("#07111f"),
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "SlideSub",
        fontName="MSYH",
        fontSize=14,
        leading=22,
        textColor=colors.HexColor("#334155"),
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        "SlideBody",
        fontName="MSYH",
        fontSize=12.5,
        leading=20,
        textColor=colors.HexColor("#1f2937"),
        spaceAfter=8,
    )
)


def para(text: str, style: str = "CNBody") -> Paragraph:
    escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(escaped.replace("\n", "<br/>"), styles[style])


def bullet(text: str, style: str = "CNBody") -> Paragraph:
    return para("• " + text, style)


def fit_image(path: Path, max_w: float, max_h: float) -> Image:
    img = PILImage.open(path)
    width, height = img.size
    scale = min(max_w / width, max_h / height)
    return Image(str(path), width=width * scale, height=height * scale)


def build_brief() -> Path:
    doc_path = ROOT / "01-pathfinder-product-brief.pdf"
    doc = SimpleDocTemplate(
        str(doc_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    story = [
        para("寻径星图作品说明", "CNTitle"),
        para("帮转型求职者找到 AI 岗位切入点", "CNSubtitle"),
        para(PRODUCT_INTRO),
        Spacer(1, 8),
        fit_image(SCREENSHOTS / "01-entry.png", 165 * mm, 88 * mm),
        PageBreak(),
        para("1. 解决的问题", "CNH1"),
        para(
            "很多早期求职者并不是没有经历，而是不知道这些经历能连接到哪些 AI 岗位。"
            "他们容易直接进入改简历、海投岗位或泛泛学习阶段，缺少一个先判断方向、再准备作品的过程。"
        ),
        para("2. 目标用户", "CNH1"),
        bullet("想进入 AI 行业的学生、转型求职者和早期求职者。"),
        bullet("有课程项目、实习、行业经验、运营活动或工具使用经历，但缺少清晰的 AI 岗位准备路径。"),
        bullet("希望用一件可解释、可追溯的作品证明自己理解岗位，而不是包装经历。"),
        para("3. 核心流程", "CNH1"),
        bullet("上传简历，或通过 AI 追问补充真实经历。"),
        bullet("确认系统整理出的背景线索。"),
        bullet("生成个人 AI 求职星图，探索 12 个 AI 岗位星点。"),
        bullet("选择更适合当前背景的岗位方向，进入对应适航任务。"),
        bullet("沉淀试航成果包，用于复盘、展示和后续打磨。"),
        Spacer(1, 8),
        fit_image(SCREENSHOTS / "02-resume-signals.png", 165 * mm, 96 * mm),
        PageBreak(),
        para("4. 个人 AI 求职星图", "CNH1"),
        para(
            "星图里的岗位星点来自当前样例 JD 和样本趋势参考，覆盖产品、开发、数据评测和运营增长等方向。"
            "系统会高亮更值得探索的几个方向，同时保留其他岗位星点，让用户可以自主点开比较。"
        ),
        fit_image(SCREENSHOTS / "03-star-map.png", 165 * mm, 132 * mm),
        PageBreak(),
        para("5. 三类适航任务", "CNH1"),
    ]

    table_data = [
        [para("方向", "CNH2"), para("任务形式", "CNH2"), para("产出", "CNH2")],
        [para("开发", "CNBody"), para("开源项目拆解和场景改造", "CNBody"), para("项目理解、改造方案、技术边界、面试追问准备", "CNBody")],
        [para("产品", "CNBody"), para("Vibe Coding 产品原型", "CNBody"), para("原型说明、PRD 摘要、用户流程、验收指标", "CNBody")],
        [para("运营", "CNBody"), para("AI 工具体验营方案", "CNBody"), para("目标人群、活动节奏、内容日历、反馈与复盘指标", "CNBody")],
    ]
    table = Table(table_data, colWidths=[28 * mm, 50 * mm, 82 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "MSYH"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ecfeff")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#a7f3d0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story += [
        table,
        Spacer(1, 10),
        para("6. 作品边界", "CNH1"),
        bullet("岗位星点基于当前样例 JD 与样本趋势参考，不代表市场完整覆盖。"),
        bullet("适航任务用于帮助用户形成准备材料，不构成能力认证或录用预测。"),
        bullet("开源项目只作为参考材料，用户不能声称自己开发或参与了原项目，除非有真实公开贡献记录。"),
        PageBreak(),
        para("7. 当前演示完成度", "CNH1"),
        bullet("简历上传后可提取候选背景线索，并要求用户确认。"),
        bullet("AI 访谈可以持续追问，用户可以主动停止并生成星图。"),
        bullet("星图展示 12 个 AI 岗位星点，并高亮 Top 3 探索方向。"),
        bullet("产品、开发、运营三类适航任务已有演示闭环。"),
        bullet("结果页生成适航成果包，保留证据链、边界说明和后续打磨计划。"),
        Spacer(1, 8),
        fit_image(SCREENSHOTS / "04-outcome-package.png", 165 * mm, 96 * mm),
    ]

    doc.build(story)
    return doc_path


def slide(title: str, subtitle: str = "", bullets_list: list[str] | None = None, image: str | None = None) -> list:
    story = [para(title, "SlideTitle")]
    if subtitle:
        story.append(para(subtitle, "SlideSub"))
    for item in bullets_list or []:
        story.append(bullet(item, "SlideBody"))
    if image:
        story += [Spacer(1, 10), fit_image(SCREENSHOTS / image, 235 * mm, 116 * mm)]
    story.append(PageBreak())
    return story


def build_deck() -> Path:
    doc_path = ROOT / "02-pathfinder-demo-deck.pdf"
    doc = SimpleDocTemplate(
        str(doc_path),
        pagesize=landscape(A4),
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    story = []
    story += slide(
        "寻径星图",
        "帮学生和早期求职者找到 AI 岗位切入点",
        [
            "上传简历或通过 AI 访谈整理真实经历。",
            "生成个人 AI 求职星图，看到更值得探索的岗位方向。",
            "用适航任务把方向判断沉淀成可继续打磨的成果包。",
        ],
        "01-entry.png",
    )
    story += slide(
        "为什么需要它",
        "很多人想进入 AI 行业，但第一步就卡住了。",
        [
            "不知道自己的专业、项目和实习经历能对应哪些 AI 岗位。",
            "不知道应该做什么准备来应对求职。",
            "容易把精力放在泛泛改简历，而不是先找到合适切入点。",
        ],
    )
    story += slide(
        "第一步：整理真实经历",
        "用户可以上传简历，也可以和 AI 聊自己的经历。",
        [
            "系统提取的是候选背景线索，不直接替用户下结论。",
            "用户可以编辑、删除和确认线索。",
            "只有确认后的内容才进入后续星图推荐。",
        ],
        "02-resume-signals.png",
    )
    story += slide(
        "第二步：生成 AI 求职星图",
        "把岗位方向做成可以探索的星点，而不是一张静态列表。",
        [
            "星图覆盖产品、开发、数据评测和运营增长等方向。",
            "Top 3 方向会被高亮，其他星点仍可点击探索。",
            "每个星点都说明岗位任务、常见工作内容和准备方式。",
        ],
        "03-star-map.png",
    )
    story += slide(
        "第三步：进入适航任务",
        "方向确定后，用户需要一件能继续打磨的任务产出。",
        [
            "开发方向：从已审计开源项目拆解和场景改造开始。",
            "产品方向：用 Vibe Coding 做一个可讲清楚的原型。",
            "运营方向：设计一次 AI 工具体验营，锻炼活动策划和复盘能力。",
        ],
    )
    story += slide(
        "第四步：生成适航成果包",
        "把一次探索沉淀成岗位理解、任务产出和后续计划。",
        [
            "包含岗位方向、背景线索、适航任务和边界说明。",
            "保留反包装提示，避免把参考项目写成个人原创贡献。",
            "支持 Markdown 导出，便于继续打磨作品集。",
        ],
        "04-outcome-package.png",
    )
    story += slide(
        "当前版本完成度",
        "已经可以作为参赛演示版本提交。",
        [
            "简历上传、AI 访谈、背景线索确认、星图探索、适航任务和结果导出已形成闭环。",
            "后端支持简历解析和访谈记录保存，继续复用现有记录表，不新增迁移。",
            "前端通过安全检查、构建、专项 E2E 和后端测试。",
        ],
    )
    story += slide(
        "产品边界",
        "这不是能力认证，也不是录用预测。",
        [
            "只基于当前样例 JD 和样本趋势参考做方向探索。",
            "不做企业筛选、offer 概率、能力认证或简历包装。",
            "开源项目只作为试航参考，明确区分原项目贡献和用户试航产出。",
        ],
    )
    story += slide(
        "下一步",
        "从参赛 Demo 走向真实可用产品。",
        [
            "继续提升简历解析质量和 AI 访谈追问体验。",
            "扩展岗位星点和适航任务库，并建立数据核验流程。",
            "补齐历史记录、正式权限和更多真实用户测试反馈。",
        ],
    )
    story += slide(
        "一句话总结",
        "寻径星图帮助早期求职者先找准 AI 岗位切入点，再用一次适航任务形成可继续打磨的准备材料。",
    )
    if story and isinstance(story[-1], PageBreak):
        story = story[:-1]
    doc.build(story)
    return doc_path


if __name__ == "__main__":
    print(build_brief())
    print(build_deck())
