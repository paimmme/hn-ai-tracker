import { fetchAndScoreJobs, cleanJob, clusterJobsBySkills } from './_lib.mjs';
import { allowCors, requireApiKey } from '../lib/auth.mjs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

export default async function handler(req, res) {
  allowCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireApiKey(req, res)) return;
  if (!DEEPSEEK_API_KEY) return res.status(400).json({ error: 'DEEPSEEK_API_KEY not configured' });

  try {
    const { jobCount = 30 } = req.body || {};

    const jobs = (await fetchAndScoreJobs()).slice(0, Math.min(jobCount, 50));
    const cleaned = jobs.map(cleanJob);
    const cluster = clusterJobsBySkills(cleaned);

    const jobsForLLM = cleaned.map(j => ({
      company: j.company, title: j.title, location: j.location,
      education: j.education, major: j.major?.join(', ') || '',
      content: j.content.slice(0, 500),
      skills: j.extracted_skills || [],
    }));

    const prompt = `你是一名资深 AI 职业规划师。以下是 ${jobsForLLM.length} 个国企校招岗位（目标学生背景：西交 985 硕，管科/信管专业）。

已完成 JD 技能聚类结果（请在学习路线中对齐）：
${JSON.stringify({
  must_have: cluster.must_have,
  should_have: cluster.should_have,
  role_clusters: cluster.role_clusters.map(r => ({ role: r.role, count: r.count, top_skills: r.top_skills })),
}, null, 2)}

分析需求：
1. 把岗位的共同要求汇总成能力树
2. 分析最新 AI 技术如何覆盖/赋能这些能力
3. 给出有针对性的学习路线建议（优先覆盖 must_have / should_have）
4. learning_path.topic 尽量对齐 must_have 技能名；每项 projects 给 1-2 个可写进简历的具体练手项目

输出 JSON：
{
  "overall_summary": "3-5 句话总体洞察",
  "skill_tree": [{ "category": "分类名", "description": "概况", "items": [{ "skill": "技能名", "importance": "必备|重要|推荐", "reason": "为什么" }] }],
  "ai_coverage": [{ "skill_needed": "能力", "how_ai_covers": "AI覆盖方式", "learn": "学习建议", "project": "推荐项目" }],
  "learning_path": [{ "priority": "P0|P1|P2", "topic": "对齐共性技能名", "reason": "原因", "approach": "方法", "projects": ["具体项目1","具体项目2"] }]
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
      cluster,
      total_jobs: jobs.length,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
