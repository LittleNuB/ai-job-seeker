# Quick Launch: Railway + Vercel

AI Job Copilot 上线方案。后端 Railway，前端 Vercel。

## 当前部署地址

- 前端：**https://ai-jobcopilot.vercel.app**
- 后端：**https://ai-job-copilot-production.up.railway.app**

## 架构

```
浏览器 → Vercel (Next.js) → Railway (FastAPI + PostgreSQL + Redis)
```

## 重新部署步骤

### 后端（Railway）

1. https://railway.app → GitHub 登录
2. New Project → Deploy from GitHub → `feat/quick-launch-portfolio`
3. 添加插件：PostgreSQL + Redis
4. 环境变量见 `.env.production.railway.example`

### 前端（Vercel）

1. https://vercel.com → GitHub 登录 → Import
2. Root Directory: `frontend`
3. 环境变量：`NEXT_PUBLIC_API_URL` = 后端 URL
4. Deploy

## 成本

| 平台 | 月费 |
|------|------|
| Vercel | 免费 |
| Railway | ~$5/mo |
| 智谱 GLM-4.5-AirX | ~$0.01/次 |
