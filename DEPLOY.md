# 部署到 Vercel（GitHub 教育认证可领 Hobby 额度）

仓库：https://github.com/paimmme/hn-ai-tracker  
模型：`deepseek-v4-flash`（用环境变量 `DEEPSEEK_MODEL`）

## 一、网页导入（推荐，教育认证最省事）

1. 打开 [vercel.com](https://vercel.com) → **Continue with GitHub** 登录  
2. 若有教育权益：Settings → Billing 或 [GitHub Student Pack](https://education.github.com/pack) 关联 Vercel  
3. **Add New… → Project → Import** `paimmme/hn-ai-tracker`  
4. Framework 选 **Vite**（或让它自动识别 `vercel.json`）  
5. 构建设置保持：
   - Build Command: `npm run build`（会先跑 `prebuild` 拷贝 `skills/data.json`）
   - Output Directory: `dist`
6. 先 **不部署**，先配环境变量（下一步），再 Deploy

## 二、环境变量（Vercel Project → Settings → Environment Variables）

对 **Production / Preview / Development** 都勾上（或至少 Production）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | ✅ | 你本地已配置的 DeepSeek key |
| `DEEPSEEK_MODEL` | 建议 | 填 `deepseek-v4-flash` |
| `ANALYZE_API_KEY` | ✅ | 自设一串随机密钥，保护「刷新分析」 |
| `ALLOWED_ORIGIN` | 建议 | 部署后的域名，如 `https://hn-ai-tracker.vercel.app` |

可选（邮件仍走 GitHub Actions，不必配到 Vercel）：

- `QQ_EMAIL` / `QQ_SMTP_PASS` → 配在 **GitHub Secrets**，不是 Vercel

生成 `ANALYZE_API_KEY` 示例：

```bash
openssl rand -hex 24
```

## 三、Deploy

环境变量保存后，点 **Deploy**。成功后访问：

| 路径 | 内容 |
|------|------|
| `/` | 主技能分析 SPA |
| `/projects` 或 `/projects.html` | 练手项目看板 |
| `/api/data` | 缓存的 JD 分析结果 |
| `/api/jobs` | 实时岗位（10 分钟缓存） |
| `/api/analyze` | 需带 `Authorization: Bearer <ANALYZE_API_KEY>` |

## 四、GitHub 侧（邮件 / 周更，与 Vercel 独立）

仓库 → Settings → Secrets and variables → Actions：

| Secret | 用途 |
|--------|------|
| `DEEPSEEK_API_KEY` | 邮件摘要 + 周更技能分析 |
| `QQ_EMAIL` | 邮件收发账号 |
| `QQ_SMTP_PASS` | QQ SMTP 授权码 |

手动触发试跑：

- Actions → **AI RSS → 邮件推送** → Run workflow  
- Actions → **Analyze Skills** → Run workflow（会 force-add `skills/data.json` 并 push）

周更 push 后，若 Vercel 已接 Git，会自动 redeploy，`/api/data` 与练手项目页数据随之更新。

## 五、终端一键（可选，需先登录 Vercel CLI）

```bash
cd /Users/wangjie/hn-ai-tracker

# 安装 CLI（首次）
npm i -g vercel
# 或：npx vercel

# 登录（浏览器授权 GitHub）
vercel login

# 关联项目并拉环境
vercel link

# 把本地 .env.local 里的 key 推到 Vercel（Production）
# 注意：只会推你确认的变量，不要推 QQ 密码到错环境
vercel env add DEEPSEEK_API_KEY production
vercel env add DEEPSEEK_MODEL production   # 输入 deepseek-v4-flash
vercel env add ANALYZE_API_KEY production

# 部署生产
vercel --prod
```

## 六、教育认证注意

- GitHub Education 本身**不直接**给 Vercel，但 Student Pack 常含 Vercel 优惠；登录后在 Billing 确认 Hobby/Pro 额度即可。  
- Hobby 足够本项目（静态 SPA + 少量 Serverless）。  
- `/api/analyze` 会打 DeepSeek 且抓国聘，**务必配 `ANALYZE_API_KEY`**，避免被刷额度。

## 七、部署后自检

```bash
# 替换成你的域名
BASE=https://你的项目.vercel.app

curl -s "$BASE/api/data" | head -c 200
curl -s "$BASE/skills/data.json" | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/projects.html"
curl -s -X POST "$BASE/api/analyze" -H 'Content-Type: application/json' -d '{}'
# 期望 401/403（未带 key）；带 key 后应为 200
```

## 八、常见问题

1. **练手项目页空白**  
   确认 build 日志有 `[prepare-static] copied skills/data.json`；或手动跑 `npm run analyze` 再 push。

2. **刷新分析 403**  
   生产未配 `ANALYZE_API_KEY`，或前端没带 `VITE_ANALYZE_API_KEY`（前端密钥只建议本地用；生产可关掉公开刷新按钮）。

3. **`/api/data` 为空**  
   仓库里 `skills/data.json` 被 gitignore，但 CI 用 `git add -f` 提交；确保 Analyze Skills 至少成功跑过一次。

4. **国聘接口失败**  
   Serverless 出站可能被目标站限制；邮件流水线在 GitHub Actions 更稳。
