# Quick Launch: Vercel + Railway

将 AI Job Copilot 上线到公网，用于作品集展示。前端 Vercel（免费），后端 Railway（含免费额度）。

预计耗时：1-2 小时 | 月费：~$0-5

## 架构

```
用户浏览器
    │
    ├─ https://your-app.vercel.app (Vercel)
    │       Next.js 前端，处理页面渲染和静态资源
    │
    └─ https://your-api.railway.app (Railway)
            FastAPI 后端 + PostgreSQL + Redis
            处理认证、LLM 分析、数据存储
```

## 第一步：Railway 部署后端

1. 注册 [Railway](https://railway.app)（GitHub 登录即可）
2. 新建项目 → "Deploy from GitHub repo" → 选择 `ai-job-seeker` 仓库
3. 在项目设置中添加插件：
   - **PostgreSQL** — 自动注入 `DATABASE_URL`
   - **Redis** — 自动注入 `REDIS_URL`
4. 设置环境变量（见下方清单）
5. Railway 自动检测 `railway.toml` 并构建部署

### 环境变量清单

以下变量在 Railway 项目 Settings → Environment 中手动添加：

| 变量 | 值 | 必填 |
|------|-----|------|
| `APP_ENV` | `production` | 是 |
| `JWT_SECRET` | 生成 32+ 字符随机串 | 是 |
| `CORS_ALLOW_ORIGINS` | 先填 `*`，拿到 Vercel 域名后改 | 是 |
| `GLM_API_KEY` | 你的智谱 API Key | 是 |
| `GLM_MODEL` | `GLM-4.5-AirX` | 是 |
| `GLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4/` | 是 |
| `GLM_TEMPERATURE` | `0.7` | 否 |
| `GLM_MAX_TOKENS` | `8192` | 否 |
| `GLM_TIMEOUT_SECONDS` | `120` | 否 |
| `GLM_MAX_RETRIES` | `1` | 否 |

> `DATABASE_URL` 和 `REDIS_URL` 由 Railway 插件自动注入，**不要手动设置**。

部署完成后，访问 `https://<your-service>.railway.app/api/health` 确认返回 `{"status":"ok"}`。

## 第二步：Vercel 部署前端

1. 注册 [Vercel](https://vercel.com)（GitHub 登录）
2. Import 同一个仓库 → 设置 Root Directory 为 `frontend`
3. Framework 自动识别为 Next.js
4. 添加环境变量：

| 变量 | 值 |
|------|-----|
| `NEXT_PUBLIC_API_URL` | Railway 后端 URL，如 `https://xxx.railway.app` |

5. 点击 Deploy

部署完成后 Vercel 会给出域名如 `https://ai-job-seeker.vercel.app`。

## 第三步：修整

1. 将 Vercel 域名更新到 Railway 的 `CORS_ALLOW_ORIGINS`（替换 `*`）
2. 在 Railway 中重新部署一次使 CORS 生效
3. 在浏览器中打开 Vercel 域名，完成注册、JD 分析等测试

## 成本估算

| 平台 | 免费额度 | 预计月费 |
|------|---------|---------|
| Vercel | 100GB 带宽, 6000 构建分钟 | $0 |
| Railway | $5 信用额度, PostgreSQL 512MB RAM | $0-5 |
| 智谱 GLM-4.5-AirX | 按量计费 | ~$0.01/次分析 |

每月 100 次分析约 $1-6。

## 常见问题

**Q: 后端请求超时怎么办？**
Railway 默认超时 300s，项目设置里可以调。把 `GLM_TIMEOUT_SECONDS` 调低（如 90），前端超时也相应调整。

**Q: 怎么绑定自己的域名？**
Vercel 和 Railway 都支持自定义域名，在各自项目的 Settings → Domains 中添加即可。

**Q: 数据库数据会丢吗？**
Railway PostgreSQL 是持久化的。如需备份，在 Railway 中启用自动备份。

**Q: 不想公开代码怎么办？**
Vercel 和 Railway 都支持私有仓库。或者 fork 一份公开的演示版，只放 frontend 代码。
