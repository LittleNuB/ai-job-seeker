# Quick Launch: Railway 全栈部署

将 AI Job Copilot 上线到公网，前后端统一部署在 Railway。预计耗时 30 分钟。

## 架构

```
用户浏览器
    │
    ├─ https://frontend.railway.app
    │       Next.js 前端（nixpacks 自动检测）
    │       NEXT_PUBLIC_API_URL → 指向后端
    │
    └─ https://backend.railway.app
            FastAPI + PostgreSQL + Redis
            Dockerfile 构建，railway.toml 配置
```

## 部署步骤

### 1. 打开 Railway 项目

打开 https://railway.app → GitHub 登录 → New Project → Deploy from GitHub repo → 选择 `LittleNuB/ai-job-seeker`，分支选 `feat/quick-launch-portfolio`

Railway 会自动检测根目录的 `railway.toml` 并启动后端服务。

### 2. 添加插件（后端）

进入后端 Service → 右上角 **Add Plugin**：
- **PostgreSQL** — 自动注入 `DATABASE_URL`
- **Redis** — 自动注入 `REDIS_URL`

### 3. 设置后端环境变量

在后端 Service → Variables 中手动添加：

| 变量 | 值 |
|------|-----|
| `APP_ENV` | `production` |
| `JWT_SECRET` | 随机生成 32 位字符串 |
| `CORS_ALLOW_ORIGINS` | `https://*.up.railway.app` |
| `GLM_API_KEY` | 你的智谱 API Key |
| `GLM_MODEL` | `GLM-4.5-AirX` |
| `GLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4/` |
| `GLM_TEMPERATURE` | `0.7` |
| `GLM_MAX_TOKENS` | `8192` |
| `GLM_TIMEOUT_SECONDS` | `120` |
| `GLM_MAX_RETRIES` | `1` |

> `DATABASE_URL` 和 `REDIS_URL` 由插件自动注入，**不要手动添加**。

等部署完成，浏览器打开后端域名 `/api/health` 确认返回 `{"status":"ok"}`。

### 4. 添加前端服务

在 Railway 项目中点 **+ Add Service** → 选择同一个 GitHub 仓库 `LittleNuB/ai-job-seeker`，分支 `feat/quick-launch-portfolio`。

Railway 会自动检测 `frontend/` 目录下的 Next.js 项目（nixpacks）。

设置前端环境变量：

| 变量 | 值 |
|------|-----|
| `NEXT_PUBLIC_API_URL` | 第三步中后端服务的域名，如 `https://xxx.railway.app` |

### 5. 验证

1. 打开前端域名 → 首页正常渲染
2. 注册账号 → 登录
3. 粘贴一份 JD 文本 → 点分析 → 等待结果
4. 探索岗位页面正常显示

## 成本

| 项目 | 月费 |
|------|------|
| Railway (PostgreSQL 512MB + Redis 256MB) | ~$5/mo |
| 智谱 GLM-4.5-AirX | ~$0.01/次 |

每月 50-100 次分析，总计约 $5-6/月。Railway 新用户有 $5 免费额度。

## 故障排查

- **后端 502**: 查看 Railway 部署日志，通常是环境变量缺失
- **前端 API 调用失败**: 确认 `NEXT_PUBLIC_API_URL` 设置正确，确认 `CORS_ALLOW_ORIGINS` 包含前端域名
- **LLM 超时**: Railway 默认 300s 超时，调低 `GLM_TIMEOUT_SECONDS` 即可
