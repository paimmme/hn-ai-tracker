import { fetchAndScoreJobs, cleanJob } from './_lib.mjs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!DEEPSEEK_API_KEY) return res.status(400).json({ error: 'DEEPSEEK_API_KEY not configured' });

  try {
    const { jobCount = 30 } = req.body || {};

    // Step 1: Fetch jobs
    const jobs = (await fetchAndScoreJobs()).slice(0, Math.min(jobCount, 50));
    const cleaned = jobs.map(cleanJob);

    // Step 2: DeepSeek analysis
    const jobsForLLM = cleaned.map(j => ({
      company: j.company, title: j.title, location: j.location,
      education: j.education, major: j.major?.join(', ') || '',
      content: j.content.slice(0, 500),
    }));

    const prompt = `你是一名资深 AI 职业规划师。以下是 ${jobsForLLM.length} 个国企校招岗位（目标学生背景：西交 985 硕，管科/信管专业）。

分析需求：
1. 把岗位的共同要求汇总成能力树
2. 分析最新 AI 技术如何覆盖/赋能这些能力
3. 给出有针对性的学习路线建议

输出 JSON：
{
  "overall_summary": "3-5 句话总体洞察",
  "skill_tree": [{ "category": "分类名", "description": "概况", "items": [{ "skill": "技能名", "importance": "必备|重要|推荐", "reason": "为什么" }] }],
  "ai_coverage": [{ "skill_needed": "能力", "how_ai_covers": "AI覆盖方式", "learn": "学习建议", "project": "推荐项目" }],
  "learning_path": [{ "priority": "P0|P1|P2", "topic": "主题", "reason": "原因", "approach": "方法", "projects": ["项目1","项目2"] }]
}`;

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: '你是 AI 职业规划师，输出严格 JSON。' },
          { role: 'user', content: prompt + '\n\n岗位：\n' + JSON.stringify(jobsForLLM, null, 2) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 16384,
      }),
    });
    const dsData = await dsRes.json();
    const content = dsData.choices?.[0]?.message?.content || '{}';

    let analysis;
    const m = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    analysis = JSON.parse(m ? m[1] : content);

    return res.status(200).json({
      ok: true,
      analysis,
      jobs: cleaned,
      total_jobs: jobs.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
