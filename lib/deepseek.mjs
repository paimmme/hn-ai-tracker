// DeepSeek analysis for daily email pipeline

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.substring(0, max) + '…' : s;
}

export async function analyzeWithDeepSeek(articles, jobs = [], cluster = null) {
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
    company: j.company_name || j.company,
    title: j.job_name || j.title,
    location: j.district_list?.[0]?.area_cn || j.location || '',
    education: j.education_cn || j.education || '',
    major: j.major_cn || j.major || [],
    deadline: j.end_time || j.deadline || '',
    advantage: j.advantage_notes?.length ? j.advantage_notes : [],
    skills: j.extracted_skills || [],
  }));

  const clusterHint = cluster ? `
JD 技能聚类摘要（请对齐专项学习建议）：
${JSON.stringify({
  must_have: cluster.must_have?.slice(0, 8),
  should_have: cluster.should_have?.slice(0, 6),
  focus_plan: cluster.focus_plan?.slice(0, 6),
  role_clusters: cluster.role_clusters?.map(r => ({
    role: r.role, count: r.count, top_skills: r.top_skills?.slice(0, 5),
  })),
}, null, 2)}
` : '';

  const jobSection = jobsForLLM.length
    ? `\n\n同时你收到 ${jobsForLLM.length} 个国企校招岗位（已按管科/信管专业预筛）：\n${JSON.stringify(jobsForLLM, null, 2)}

对这些岗位的额外任务：
- 判断每个岗位对用户的匹配度（管理科学与工程/信息管理与信息系统背景能做什么、如何切入）
- 标注明确提及 985/双一流/硕士优待的岗位及其具体优待说明
- 标注是否属于 AI 产品/应用类岗位，还是综合管理/通用岗
- 给出投递建议和价值分析（为什么值得/不值得）

在 career_advice 中融入岗位洞察与 JD 共性技能专项学习建议。在输出中增加 jobs 数组。
${clusterHint}`
    : '';

  const prompt = `你是一名在职 AI 工程师/研究员，正在给一位备战秋招的学生分享行业洞察。学生背景：西安交通大学（985）研究生，管理科学与工程/信息管理与信息系统专业。以下是今日 ${articles.length} 篇科技/AI 文章（已按 AI 相关度优先筛选）。${jobSection}

请用中文完成：

1. 今日要闻概览：选出 3-5 条最重要新闻，每条用中文一句话概括

2. 求职风向标：结合今天新闻，从求职者视角分析
   - 业界新趋势：今年值得关注的新方向/新技术栈
   - 新需求涌现：哪些岗位技能需求在增长
   - 给我的建议：针对秋招准备，学到什么、简历方向、面试重点等具体建议
   - 若有 JD 聚类，补充 3 条「专项学习」：每条必须写「技能：练手项目名」（优先 must_have）

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
    "tips": ["建议1", "建议2"],
    "focus_study": ["SQL：做「国企业务漏斗数仓」", "Python：做「岗位JD结构化清洗」", "大模型/LLM：做「校招助手RAG」"]
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
      { role: 'user', content: prompt + '\n\n文章列表：\n' + JSON.stringify(articlesForLLM, null, 2) },
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

  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) {
      try { parsed = JSON.parse(m[1]); } catch { /* ignore */ }
    }
  }

  if (!parsed || !parsed.articles) {
    console.warn('  ! 无法解析 AI 输出，原始内容:', content.slice(0, 300));
    return null;
  }

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
    model: DEEPSEEK_MODEL,
  };
}
