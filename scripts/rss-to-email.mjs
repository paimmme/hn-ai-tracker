import RssParser from 'rss-parser';
import nodemailer from 'nodemailer';
import { fetchJobs } from './fetch-jobs.mjs';

const FEEDS = [
  // English — research & engineering
  { name: 'arXiv AI/ML/CV', url: 'https://rss.arxiv.org/rss/cs.AI+cs.CL+cs.LG' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/' },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/' },
  { name: 'BAIR Blog', url: 'https://bair.berkeley.edu/blog/feed.xml' },
  // Chinese — industry & product
  { name: '机器之心', url: 'https://www.jiqizhixin.com/rss' },
  { name: '量子位', url: 'https://rsshub.app/qbitai' },
  { name: 'InfoQ 中文', url: 'https://rsshub.app/infoq/topic/1' },
];

const parser = new RssParser({
  timeout: 20000,
  customFields: { item: ['source'] },
});

// DeepSeek config
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const AI_BATCH_SIZE = 20; // top N articles sent to LLM

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '…' : s;
}

// ─── DeepSeek AI analysis ────────────────────────────────────────

async function analyzeWithDeepSeek(articles, jobs = []) {
  if (!DEEPSEEK_API_KEY) {
    console.log('  ! DEEPSEEK_API_KEY 未设置，跳过 AI 分析');
    return null;
  }

  const articlesForLLM = articles.map((a, i) => ({
    id: i,
    title: a.title,
    content: truncate(a.content || '', 400),
    source: a.source,
  }));

  const jobsForLLM = jobs.slice(0, 12).map(j => ({
    id: j.job_id,
    company: j.company_name,
    title: j.job_name,
    location: j.district_list?.[0]?.area_cn || '',
    education: j.education_cn || '',
    major: j.major_cn || [],
    deadline: j.end_time || '',
    advantage: j.advantage_notes?.length ? j.advantage_notes : [],
  }));

  const jobSection = jobsForLLM.length
    ? `\n\n同时你收到 ${jobsForLLM.length} 个国企校招岗位（已按管科/信管专业预筛）：\n${JSON.stringify(jobsForLLM, null, 2)}

对这些岗位的额外任务：
- 判断每个岗位对用户的匹配度（管理科学与工程/信息管理与信息系统背景能做什么、如何切入）
- 标注明确提及 985/双一流/硕士优待的岗位及其具体优待说明
- 标注是否属于 AI 产品/应用类岗位，还是综合管理/通用岗
- 给出投递建议和价值分析（为什么值得/不值得）

在 career_advice 中融入岗位洞察。在输出中增加 jobs 数组。`
    : '';

  const prompt = `你是一名在职 AI 工程师/研究员，正在给一位备战秋招的学生分享行业洞察。学生背景：西安交通大学（985）研究生，管理科学与工程/信息管理与信息系统专业。以下是今日 ${articles.length} 篇科技/AI 文章。${jobSection}

请用中文完成：

1. 今日要闻概览：选出 3-5 条最重要新闻，每条用中文一句话概括

2. 求职风向标：结合今天新闻，从求职者视角分析
   - 业界新趋势：今年值得关注的新方向/新技术栈
   - 新需求涌现：哪些岗位技能需求在增长
   - 给我的建议：针对秋招准备，学到什么、简历方向、面试重点等具体建议

3. 对每篇文章提供中文分析：
   - 中文标题（意译，符合中文习惯）
   - 中文摘要（1-2 句概括核心）
   - 关键要点（2-3 条要点，每条10字以内）

以严格 JSON 格式返回（不要 markdown 代码块标记，不要其他文字）：
{
  "highlights": [
    { "title": "中文标题", "summary": "一句话概括" }
  ],
  "career_advice": {
    "trends": ["新方向1", "新方向2"],
    "demands": ["需求1", "需求2"],
    "tips": ["建议1", "建议2"]
  },
  "articles": [
    {
      "id": 0,
      "chinese_title": "中文意译标题",
      "summary": "核心内容摘要",
      "key_points": ["要点1", "要点2"]
    }
  ]${jobsForLLM.length ? `,
  "jobs": [
    {
      "job_id": "岗位ID",
      "company": "公司名",
      "title": "岗位名",
      "location": "工作地点",
      "type": "AI产品应用类 | 综合管理类 | 数据分析类",
      "match_reason": "为什么适合该生（管科背景如何切入）",
      "advantage_flag": true_or_false,
      "advantage_note": "985/硕士优待说明（有则写，无则null）",
      "advice": "投递建议"
    }
  ]` : ''}
}`;

  const body = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: '你是一名在职 AI 从业者，兼顾帮助西交管科学生求职。用过来人视角输出可操作的求职洞察，输出严格 JSON。' },
      { role: 'user', content: prompt + '\n\n文章列表：\n' + JSON.stringify(articlesForLLM, null, 2) + (jobsForLLM.length ? '\n\n岗位列表：\n' + JSON.stringify(jobsForLLM, null, 2) : '') },
    ],
    temperature: 0.3,
    max_tokens: 16384,
  };

  console.log(`  调用 DeepSeek API（${articles.length} 篇）...`);
  const start = Date.now();

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek 返回空内容');

  console.log(`  ✓ DeepSeek 响应 ${elapsed}s, ${content.length} chars`);

  // Parse JSON — try direct, then extract from code block
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try { parsed = JSON.parse(m[1]); } catch {}
    }
  }

  if (!parsed || !parsed.articles) {
    console.warn('  ! 无法解析 AI 输出，原始内容:', content.slice(0, 300));
    return null;
  }

  // Build lookup by id
  const articleMap = {};
  for (const a of parsed.articles) {
    if (typeof a.id === 'number') articleMap[a.id] = a;
  }

  return {
    highlights: parsed.highlights || [],
    careerAdvice: parsed.career_advice || null,
    articleMap,
    jobs: parsed.jobs || [],
    usage: data?.usage,
  };
}

// ─── Email HTML generation ───────────────────────────────────────

function buildHtml(topItems, aiResult, jobsRaw = []) {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

  let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans SC',sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">

<!-- Header -->
<div style="background:#ff6600;padding:24px 20px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:22px">AI 资讯摘要</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px">${now} · ${topItems.length} 篇</p>
</div>

<div style="padding:16px">`;

  // ── AI highlights section ──
  if (aiResult?.highlights?.length) {
    html += `
<!-- AI Today's Highlights -->
<div style="background:linear-gradient(135deg,#fff7ed,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa">
  <h2 style="margin:0 0 12px;font-size:16px;color:#c2410c">🔥 今日 AI 要闻</h2>
  ${aiResult.highlights.map(h => `
  <div style="margin-bottom:10px;padding-left:12px;border-left:3px solid #f97316">
    <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:2px">${escapeHtml(h.title)}</div>
    <div style="font-size:12px;color:#666">${escapeHtml(h.summary)}</div>
  </div>`).join('')}
</div>`;
  }

  // ── Career advice section ──
  if (aiResult?.careerAdvice) {
    const ca = aiResult.careerAdvice;
    html += `
<!-- Career Advice -->
<div style="background:linear-gradient(135deg,#f0f9ff,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #bae6fd">
  <h2 style="margin:0 0 12px;font-size:16px;color:#0369a1">🎯 求职风向标</h2>
  ${ca.trends?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 业界新趋势</div>
    ${ca.trends.map(t => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(t)}</div>`).join('')}
  </div>` : ''}
  ${ca.demands?.length ? `
  <div style="margin-bottom:10px">
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 新需求涌现</div>
    ${ca.demands.map(d => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(d)}</div>`).join('')}
  </div>` : ''}
  ${ca.tips?.length ? `
  <div>
    <div style="font-size:12px;font-weight:600;color:#0284c7;margin-bottom:4px">📌 给我的建议</div>
    ${ca.tips.map(t => `<div style="font-size:12px;color:#444;margin-bottom:3px;padding-left:12px">• ${escapeHtml(t)}</div>`).join('')}
  </div>` : ''}
</div>`;
  }

  // ── 国企校招机会 section ──
  if (aiResult?.jobs?.length) {
    const effectiveJobs = aiResult.jobs.slice(0, 12);
    html += `
<!-- Jobs -->
<div style="background:linear-gradient(135deg,#f0fdf4,#fff);border-radius:8px;padding:16px;margin-bottom:16px;border:1px solid #bbf7d0">
  <h2 style="margin:0 0 12px;font-size:16px;color:#15803d">🏛️ 国企校招机会</h2>
  ${effectiveJobs.map(j => `
  <div style="margin-bottom:12px;padding:12px;background:#fff;border-radius:6px;border:1px solid #eee">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:4px">
      <span style="font-size:14px;font-weight:600;color:#333">${escapeHtml(j.company)}</span>
      <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px">${escapeHtml(j.type || '')}</span>
    </div>
    <div style="font-size:13px;color:#555;margin-bottom:4px">${escapeHtml(j.title)}</div>
    <div style="font-size:11px;color:#999;margin-bottom:6px">📍 ${escapeHtml(j.location)}</div>
    <div style="font-size:12px;color:#555;margin-bottom:4px">💡 ${escapeHtml(j.match_reason || '')}</div>
    ${j.advantage_flag ? `
    <div style="font-size:12px;color:#b45309;font-weight:600;margin-bottom:4px;padding:4px 8px;background:#fef3c7;border-radius:4px;display:inline-block">⭐ ${escapeHtml(j.advantage_note)}</div>` : ''}
    ${j.advice ? `
    <div style="font-size:12px;color:#555;margin-top:4px">📌 ${escapeHtml(j.advice)}</div>` : ''}
    <div style="margin-top:6px">
      <a href="https://www.iguopin.com/job/detail?id=${encodeURIComponent(j.job_id)}" target="_blank" style="font-size:12px;color:#15803d;text-decoration:underline">查看详情 →</a>
    </div>
  </div>`).join('')}
</div>`;
  }

  // ── AI deep analysis section ──
  if (aiResult?.articleMap) {
    const analyzed = topItems.filter((item, i) => aiResult.articleMap[i]);
    if (analyzed.length > 0) {
      html += `
<!-- AI Deep Analysis -->
<h2 style="margin:0 0 12px;font-size:16px;color:#333">📖 AI 深度摘要</h2>`;
      for (const [idx, item] of analyzed.entries()) {
        const ai = aiResult.articleMap[idx];
        const dateStr = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
          : '';
        html += `
<div style="padding:14px;margin-bottom:10px;background:#fafafa;border-radius:6px;border-left:3px solid #ff6600">
  <div style="margin-bottom:4px">
    <a href="${escapeHtml(item.link)}" style="font-size:11px;color:#999;text-decoration:underline">${escapeHtml(item.title)}</a>
  </div>
  <h3 style="margin:0 0 6px;font-size:15px;color:#333">${escapeHtml(ai.chinese_title || item.title)}</h3>
  <div style="font-size:12px;color:#999;margin-bottom:6px">
    <span style="color:#ff6600;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
  </div>
  <p style="margin:0 0 6px;font-size:13px;color:#555;line-height:1.5">${escapeHtml(ai.summary || '')}</p>
  ${ai.key_points?.length ? `
  <div style="margin-top:6px">
    ${ai.key_points.map(kp => `<span style="display:inline-block;background:#fff3e6;color:#c2410c;font-size:11px;padding:2px 8px;border-radius:4px;margin:0 4px 4px 0">${escapeHtml(kp)}</span>`).join('')}
  </div>` : ''}
</div>`;
      }
    }
  }

  // ── Full article list (compact) ──
  html += `
<!-- All Articles -->
<h2 style="margin:16px 0 12px;font-size:16px;color:#333">📋 全部文章</h2>`;
  for (const item of topItems) {
    const dateStr = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '';
    html += `
<div style="padding:12px;margin-bottom:8px;background:#fafafa;border-radius:6px;border-left:2px solid #ddd">
  <h3 style="margin:0 0 4px;font-size:14px"><a href="${escapeHtml(item.link)}" style="color:#333;text-decoration:none">${escapeHtml(item.title)}</a></h3>
  <div style="font-size:11px;color:#999">
    <span style="color:#ff6600;font-weight:600">${escapeHtml(item.source)}</span>${dateStr ? ' · ' + dateStr : ''}
  </div>
</div>`;
  }

  // ── Footer ──
  html += `
</div>
<div style="background:#fafafa;padding:12px;text-align:center;font-size:11px;color:#999">
  AI 分析由 DeepSeek ${DEEPSEEK_MODEL} 生成 · 由 GitHub Actions 自动推送
</div>
</div>
</body></html>`;

  return html;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`[${new Date().toISOString()}] 开始抓取 ${FEEDS.length} 个源...`);

  // Fetch all feeds in parallel
  const results = await Promise.allSettled(FEEDS.map(async feed => {
    const result = await parser.parseURL(feed.url);
    const items = (result.items || []).map(item => ({
      title: item.title || '(无标题)',
      link: item.link || '',
      pubDate: item.isoDate || item.pubDate || '',
      content: item.contentSnippet || item.content || '',
      source: feed.name,
    }));
    console.log(`  ✓ ${feed.name}: ${items.length} 篇`);
    return items;
  }));

  // Collect all items
  const allItems = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    } else {
      console.error(`  ✗ ${FEEDS[i].name}: ${r.reason.message}`);
    }
  }

  if (allItems.length === 0) {
    throw new Error('没有抓到任何文章');
  }

  // Deduplicate by link
  const seen = new Set();
  const unique = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Sort by date descending
  unique.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  const topItems = unique.slice(0, 60);
  console.log(`\n去重后 ${unique.length} 篇，取前 ${topItems.length} 篇`);

  // ── Fetch jobs ──
  let topJobs = [];
  try {
    topJobs = await fetchJobs();
    console.log(`  ✓ 国聘: ${topJobs.length} 个相关校招岗位`);
  } catch (e) {
    console.error(`  ✗ 国聘抓取失败: ${e.message}`);
  }

  // ── AI analysis ──
  let aiResult = null;
  const aiBatch = topItems.slice(0, AI_BATCH_SIZE);
  if (aiBatch.length > 0) {
    try {
      aiResult = await analyzeWithDeepSeek(aiBatch, topJobs);
    } catch (e) {
      console.error(`  ✗ AI 分析失败: ${e.message}`);
      // Continue without AI analysis
    }
  }

  // ── Build HTML ──
  const html = buildHtml(topItems, aiResult);
  const subjectBase = `AI 资讯摘要 ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

  // ── Send email ──
  console.log('\n发送邮件中...');
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.QQ_EMAIL,
      pass: process.env.QQ_SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.QQ_EMAIL,
    to: process.env.QQ_EMAIL,
    subject: `${subjectBase}（${topItems.length} 篇${topJobs.length ? ` · ${topJobs.length} 个岗位` : ''}${aiResult ? ' · AI 分析' : ''}）`,
    html,
  });

  console.log('✓ 邮件发送成功！');
}

main().catch(e => {
  console.error('\n✗ 失败:', e.message);
  process.exit(1);
});
