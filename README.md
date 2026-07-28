# hn-ai-tracker

个人向 **AI 资讯日报 + 国企校招 JD 分析** 自动化项目。

> 名字保留历史。当前主能力：邮件资讯 / 岗位技能分析 / JD 聚类专项学习。原始 HN 面板在 `legacy/`。旧版 `/skills` 页面会自动跳转到主 SPA。

## 功能

1. **AI 资讯邮件（每天 1 次，北京时间 08:00）**
   - 来源：MIT Tech Review、AWS ML、BAIR、机器之心、量子位、InfoQ、GitHub Blog
   - **已移除 arXiv**（论文过多）
   - 按 AI 相关度过滤/排序（收紧关键词，避免裸词 `ai` 误伤）
   - DeepSeek 生成要闻、求职风向标、深度摘要
   - 附带国聘校招岗位匹配与 **JD 共性聚类 / 专项学习**
2. **独立游戏开发资讯（隔日附带，2–4 条）**
   - itch.io / Game Developer / IndieDB / Godot Blog
   - 北京时间**奇数日**推送（约每两天一次）
3. **技能分析 SPA（Vercel）**
   - 能力树 / JD 聚类 / 雷达图 / 岗位探索 / AI 赋能 / 学习路线
4. **周更分析 Action**
   - 抓岗位 → 聚类 → DeepSeek 分析 → 提交 `skills/data.json`

## 仓库结构

```
api/                 Vercel Serverless (jobs/data/analyze)
lib/                 共享逻辑
  auth.mjs           API 鉴权 + CORS
  cache.mjs          内存 TTL 缓存
  jobs.mjs           国聘抓取 / 打分 / JD 聚类
  feeds.mjs          RSS 源与筛选
  deepseek.mjs       邮件侧 LLM 分析
  email-html.mjs     邮件 HTML 渲染
scripts/             GitHub Actions 入口脚本
src/                 Vue 3 SPA
legacy/              早期 HN AI 面板
skills/data.json     周更分析结果（Action force-add）
```

## 本地开发

```bash
npm install
npm run dev          # Vite http://localhost:5173
npm run build
npm run email        # 需 QQ_EMAIL / QQ_SMTP_PASS / DEEPSEEK_API_KEY
npm run analyze      # 需 DEEPSEEK_API_KEY（可选，无 key 仅写聚类）
```

前端默认请求 `/api/*`。本地联调 API：

```bash
# 终端 1
npx vercel dev --listen 3000

# 终端 2
npm run dev
```

刷新分析鉴权（Header only，不支持 query `?key=`）：

```bash
# Vercel / 本地 env
ANALYZE_API_KEY=your-secret
VITE_ANALYZE_API_KEY=your-secret   # 前端开发调试用
DEEPSEEK_API_KEY=...
ALLOWED_ORIGIN=https://your-app.vercel.app   # 可选，限制 CORS
```

## GitHub Secrets

| Secret | 用途 |
|--------|------|
| `QQ_EMAIL` | QQ 邮箱账号（收发） |
| `QQ_SMTP_PASS` | QQ SMTP 授权码 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |

## Vercel 环境变量

| 变量 | 用途 |
|------|------|
| `DEEPSEEK_API_KEY` | `/api/analyze` |
| `ANALYZE_API_KEY` | **生产环境必填**，否则 analyze 接口拒绝公开调用 |
| `ALLOWED_ORIGIN` | 可选，限制 CORS 源 |

## Actions 调度

| Workflow | Cron (UTC) | 含义 |
|----------|------------|------|
| `rss-to-email.yml` | `0 0 * * *` | 每天 08:00 CST 发 AI 资讯邮件 |
| `analyze-skills.yml` | `0 2 * * 0` | 每周日更新技能分析 |

独立游戏资讯由邮件脚本在北京时间奇数日自动附带。

## 安全说明

- `/api/analyze` 需要 `Authorization: Bearer <ANALYZE_API_KEY>` 或 `X-Api-Key`
- **不接受** URL query 传 key（避免日志/Referer 泄露）
- 生产未配置 key 时默认 **拒绝** 公开 analyze
- `/api/jobs` 带 **10 分钟内存缓存** + CDN `s-maxage=600`，降低国聘刷取压力
- `/api/data` 只读缓存的 `skills/data.json`

## License

Private / personal use.
