# Quick Launch: Render + Vercel

AI Job Copilot 上线方案。后端 Render，前端 Vercel。两个平台均支持免费额度。

## 当前部署地址

- 前端：**https://ai-jobcopilot.vercel.app**
- 后端：**https://ai-job-copilot-backend-m0md.onrender.com**

## 架构

```
浏览器 → Vercel (Next.js) → Render (FastAPI + PostgreSQL + Redis)
```

## 部署步骤

### 后端（Render）

1. https://render.com → GitHub 登录
2. **New +** → **Blueprint** → 选 `LittleNuB/ai-job-seeker`，分支 `feat/quick-launch-portfolio`
3. Render 自动读取 `render.yaml` 创建 Web Service
4. 添加 PostgreSQL：**New +** → **PostgreSQL** → Free plan → 复制 Internal Connection String
5. Web Service → Environment 添加 `DATABASE_URL`（粘贴连接串）
6. 添加 `JWT_SECRET`（随机 32 位字符串）和 `GLM_API_KEY`（智谱 API Key）
7. Redis 可选，免费版不支持

### 前端（Vercel）

1. https://vercel.com → GitHub 登录 → Import
2. Root Directory: `frontend`
3. 环境变量：`NEXT_PUBLIC_API_URL` = 后端 URL
4. Deploy

## 成本

| 平台 | 月费 | 备注 |
|------|------|------|
| Vercel | 免费 | - |
| Render | 免费 | 15 分钟无访问后休眠，冷启动 30-60s |
| 智谱 GLM-4.5-AirX | ~$0.01/次 | 按量计费 |

升级 Render 到 Starter ($7/月) 可避免休眠。
