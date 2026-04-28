"""爬虫配置：目标公司、搜索关键词、请求参数等"""

import os
from dotenv import load_dotenv

load_dotenv()

# GLM API 配置（复用项目的 .env）
GLM_API_KEY = os.getenv("GLM_API_KEY", "")
GLM_MODEL = os.getenv("GLM_MODEL", "glm-4.6V")
GLM_BASE_URL = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/")

# 爬虫行为参数
REQUEST_DELAY_MIN = 3.0   # 请求间最小延迟（秒）
REQUEST_DELAY_MAX = 8.0   # 请求间最大延迟（秒）
KEYWORD_DELAY_MIN = 8.0   # 关键词间最小延迟（秒）
KEYWORD_DELAY_MAX = 15.0  # 关键词间最大延迟（秒）
MAX_PAGES_PER_KEYWORD = 5 # 每个关键词最多翻页数
MAX_RETRIES = 3           # 单次请求最大重试次数

# 输出路径
OUTPUT_DIR = os.path.join(os.path.dirname(__file__))
RAW_DIR = os.path.join(OUTPUT_DIR, "raw")
CLEANED_DIR = os.path.join(OUTPUT_DIR, "cleaned")
STRUCTURED_DIR = os.path.join(OUTPUT_DIR, "structured")

# 目标公司配置
COMPANY_CONFIGS = {
    "bytedance": {
        "name": "字节跳动",
        "career_url": "https://jobs.bytedance.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "推荐算法", "机器学习", "语音算法", "AI工程"],
        "use_api": True,
        "api_url": "https://jobs.bytedance.com/api/v1/search",
    },
    "alibaba": {
        "name": "阿里巴巴",
        "career_url": "https://talent.alibaba.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "推荐算法", "机器学习", "通义"],
        "use_api": True,
        "api_url": "https://talent.alibaba.com/api/jobs/search",
    },
    "tencent": {
        "name": "腾讯",
        "career_url": "https://join.qq.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "推荐算法", "机器学习", "混元"],
        "use_api": False,
    },
    "baidu": {
        "name": "百度",
        "career_url": "https://talent.baidu.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "推荐算法", "机器学习", "文心"],
        "use_api": True,
        "api_url": "https://talent.baidu.com/external/portal/search",
    },
    "meituan": {
        "name": "美团",
        "career_url": "https://zhaopin.meituan.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "推荐算法", "机器学习"],
        "use_api": False,
    },
    "huawei": {
        "name": "华为",
        "career_url": "https://career.huawei.com",
        "search_keywords": ["AI算法", "大模型", "NLP", "计算机视觉", "昇腾", "MindSpore"],
        "use_api": False,
    },
    "nvidia": {
        "name": "NVIDIA",
        "career_url": "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
        "search_keywords": ["AI", "machine learning", "deep learning", "LLM", "CUDA", "autonomous driving"],
        "use_api": True,
    },
}

# 预定义目标岗位（聚类目标）
TARGET_POSITIONS = {
    # 算法方向
    "nlp_engineer": "NLP算法工程师",
    "llm_engineer": "大模型算法工程师",
    "cv_engineer": "计算机视觉算法工程师",
    "multimodal_engineer": "多模态算法工程师",
    "recsys_engineer": "推荐算法工程师",
    "speech_engineer": "语音算法工程师",
    "kg_engineer": "知识图谱工程师",
    "search_algorithm_engineer": "搜索算法工程师",
    "rl_engineer": "强化学习工程师",
    "automl_engineer": "AutoML工程师",
    "audio_algorithm_engineer": "音频算法工程师",
    "federated_learning_engineer": "联邦学习工程师",
    "anomaly_detection_engineer": "异常检测算法工程师",

    # 工程方向
    "mlops_engineer": "MLOps/AI平台工程师",
    "ai_infra_engineer": "AI基础设施工程师",
    "model_deployment_engineer": "模型部署/推理优化工程师",
    "rag_engineer": "RAG工程师",
    "ai_safety_engineer": "AI安全工程师",
    "data_engineer": "数据工程师",
    "inference_engineer": "推理优化工程师",
    "ai_architect": "AI架构师",

    # 产品方向
    "ai_product_manager": "AI产品经理",
    "data_product_manager": "数据产品经理",
    "ai_ops_specialist": "AI运营/增长专家",
    "ai_ux_designer": "AI交互设计师",
    "ai_solution_architect": "AI解决方案架构师",
    "ai_commercial_pm": "AI商业化产品经理",

    # 数据方向
    "data_scientist": "数据科学家",
    "data_analyst": "数据分析师",
    "data_governance_engineer": "数据治理工程师",
    "annotation_manager": "AI标注经理",

    # 应用方向
    "ai_application_dev": "AI应用开发工程师",
    "prompt_engineer": "Prompt工程师",
    "ai_fullstack": "AI全栈工程师",
    "ai_trainer": "AI训练师",
    "digital_human_engineer": "数字人工程师",
    "ai_content_ops": "AI内容运营",
    "ai_compliance_specialist": "AI合规专员",

    # AI芯片/算力方向
    "ai_chip_engineer": "AI芯片工程师",
    "cuda_engineer": "CUDA工程师",
    "asic_design_engineer": "ASIC设计工程师",

    # AI+行业方向
    "ai_medical_engineer": "AI医疗算法工程师",
    "ai_fintech_engineer": "AI金融算法工程师",
    "ai_autonomous_driving": "自动驾驶算法工程师",
    "ai_robotics_engineer": "机器人算法工程师",
    "ai_education_specialist": "AI教育产品经理",
}

# 岗位聚类关键词映射
CLUSTER_KEYWORDS = {
    "nlp_engineer": ["nlp", "自然语言", "NLP", "文本", "语义", "对话系统", "语言模型"],
    "llm_engineer": ["大模型", "LLM", "大语言", "语言模型训练", "基座模型", "预训练", "SFT", "RLHF", "对齐"],
    "cv_engineer": ["计算机视觉", "CV", "图像", "视觉算法", "目标检测", "图像分割", "OCR", "人脸"],
    "multimodal_engineer": ["多模态", "multimodal", "视觉语言", "图文", "3D生成", "文生3D", "图生3D"],
    "recsys_engineer": ["推荐", "recsys", "推荐系统", "召回", "排序", "粗排", "精排"],
    "speech_engineer": ["语音", "ASR", "TTS", "语音识别", "语音合成", "声学"],
    "kg_engineer": ["知识图谱", "KG", "图数据库", "实体识别", "关系抽取"],
    "search_algorithm_engineer": ["搜索算法", "检索", "query理解", "排序学习"],
    "rl_engineer": ["强化学习", "RL", "决策", "博弈", "策略优化"],
    "automl_engineer": ["AutoML", "自动化机器学习", "NAS", "超参优化"],
    "audio_algorithm_engineer": ["音频", "声纹", "音效", "降噪", "音乐信息检索"],
    "federated_learning_engineer": ["联邦学习", "隐私计算", "多方安全计算"],
    "anomaly_detection_engineer": ["异常检测", "风控算法", "反欺诈"],
    "mlops_engineer": ["MLOps", "AI平台", "机器学习平台", "模型管理", "特征平台"],
    "ai_infra_engineer": ["AI基础设施", "AI Infra", "算力", "GPU集群", "训练框架", "分布式训练"],
    "model_deployment_engineer": ["模型部署", "推理优化", "推理引擎", "TensorRT", "模型量化", "模型加速"],
    "rag_engineer": ["RAG", "检索增强", "向量数据库", "知识库"],
    "ai_safety_engineer": ["AI安全", "模型安全", "对抗", "对齐安全", "内容安全"],
    "data_engineer": ["数据工程师", "数据仓库", "ETL", "数据管道", "数仓"],
    "inference_engineer": ["推理优化", "推理引擎", "serving", "vLLM", "PagedAttention"],
    "ai_architect": ["AI架构师", "技术架构", "系统设计"],
    "ai_product_manager": ["AI产品", "AI PM", "智能产品", "AI产品经理"],
    "data_product_manager": ["数据产品", "数据中台", "BI产品", "数据平台"],
    "ai_ops_specialist": ["AI运营", "AI增长", "模型运营", "Prompt运营"],
    "ai_ux_designer": ["AI交互", "对话设计", "AI UX", "AI设计"],
    "ai_solution_architect": ["解决方案", "售前", "AI方案", "技术方案"],
    "ai_commercial_pm": ["商业化", "AI商业化", "AI变现"],
    "data_scientist": ["数据科学家", "Data Scientist", "DS", "统计建模"],
    "data_analyst": ["数据分析师", "Data Analyst", "DA", "业务分析"],
    "data_governance_engineer": ["数据治理", "数据质量", "数据安全", "数据合规"],
    "annotation_manager": ["数据标注", "标注管理", "数据标注经理", "标注质量"],
    "ai_application_dev": ["AI应用", "AI开发", "大模型应用", "Agent开发", "LLM应用"],
    "prompt_engineer": ["Prompt", "提示词", "提示工程"],
    "ai_fullstack": ["AI全栈", "全栈AI", "AI+全栈"],
    "ai_trainer": ["AI训练师", "模型训练师", "数据训练"],
    "digital_human_engineer": ["数字人", "虚拟人", "虚拟主播", "数字分身"],
    "ai_content_ops": ["AI内容运营", "AIGC运营", "内容运营"],
    "ai_compliance_specialist": ["AI合规", "AI伦理", "算法合规", "算法备案"],
    "ai_chip_engineer": ["AI芯片", "NPU", "TPU", "加速器", "推理芯片"],
    "cuda_engineer": ["CUDA", "GPU编程", "GPU算子", "kernel优化"],
    "asic_design_engineer": ["ASIC", "芯片设计", "RTL", "FPGA"],
    "ai_medical_engineer": ["AI医疗", "医疗AI", "医学影像", "药物发现"],
    "ai_fintech_engineer": ["AI金融", "金融科技", "智能风控", "量化"],
    "ai_autonomous_driving": ["自动驾驶", "无人驾驶", "感知算法", "规划控制", "SLAM"],
    "ai_robotics_engineer": ["机器人", "具身智能", "运动控制", "感知规划"],
    "ai_education_specialist": ["AI教育", "教育科技", "智能教学", "自适应学习"],
}

# 分类定义
CATEGORIES = [
    {"id": "algorithm", "name": "算法方向", "icon": "🧠", "description": "机器学习、深度学习、NLP、CV等算法研发岗位"},
    {"id": "engineering", "name": "工程方向", "icon": "⚙️", "description": "AI基础设施、模型部署、MLOps等工程相关岗位"},
    {"id": "product", "name": "产品方向", "icon": "📊", "description": "AI产品经理、数据产品等方向"},
    {"id": "data", "name": "数据方向", "icon": "📈", "description": "数据工程师、数据分析、数据挖掘等方向"},
    {"id": "applied", "name": "应用方向", "icon": "🚀", "description": "AI应用开发、全栈AI等应用层岗位"},
    {"id": "chip", "name": "芯片/算力方向", "icon": "🔲", "description": "AI芯片设计、GPU编程、算力基础设施等岗位"},
    {"id": "industry", "name": "AI+行业方向", "icon": "🏥", "description": "AI在医疗、金融、自动驾驶等行业的落地岗位"},
]

# 岗位到分类的映射
POSITION_CATEGORY_MAP = {
    "nlp_engineer": "algorithm", "llm_engineer": "algorithm", "cv_engineer": "algorithm",
    "multimodal_engineer": "algorithm", "recsys_engineer": "algorithm", "speech_engineer": "algorithm",
    "kg_engineer": "algorithm", "search_algorithm_engineer": "algorithm", "rl_engineer": "algorithm",
    "automl_engineer": "algorithm", "audio_algorithm_engineer": "algorithm",
    "federated_learning_engineer": "algorithm", "anomaly_detection_engineer": "algorithm",
    "mlops_engineer": "engineering", "ai_infra_engineer": "engineering",
    "model_deployment_engineer": "engineering", "rag_engineer": "engineering",
    "ai_safety_engineer": "engineering", "data_engineer": "engineering",
    "inference_engineer": "engineering", "ai_architect": "engineering",
    "ai_product_manager": "product", "data_product_manager": "product",
    "ai_ops_specialist": "product", "ai_ux_designer": "product",
    "ai_solution_architect": "product", "ai_commercial_pm": "product",
    "data_scientist": "data", "data_analyst": "data",
    "data_governance_engineer": "data", "annotation_manager": "data",
    "ai_application_dev": "applied", "prompt_engineer": "applied",
    "ai_fullstack": "applied", "ai_trainer": "applied",
    "digital_human_engineer": "applied", "ai_content_ops": "applied",
    "ai_compliance_specialist": "applied",
    "ai_chip_engineer": "chip", "cuda_engineer": "chip", "asic_design_engineer": "chip",
    "ai_medical_engineer": "industry", "ai_fintech_engineer": "industry",
    "ai_autonomous_driving": "industry", "ai_robotics_engineer": "industry",
    "ai_education_specialist": "industry",
}
