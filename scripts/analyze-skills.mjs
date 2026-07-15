// 岗位技能分析 — 调用 DeepSeek 生成能力树 + AI 覆盖 + 学习路线
import { writeFileSync } from 'fs';
import { fetchJobs } from './fetch-jobs.mjs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function truncate(s, n) {
  if (!s) return '';
  const cleaned = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > n ? cleaned.slice(0, n) : cleaned;
}

async function analyzeWithDeepSeek(jobs) {
  const jobsForLLM = jobs.map(j => ({
    company: j.company_name,
    title: j.job_name,
    content: truncate(j.contents, 600),
    major: j.major_cn?.join(', ') || '',
    education: j.education_cn || '',
    location: j.district_list?.[0]?.area_cn || '',
  }));

  const prompt = `你是资深 AI 职业规划师。分析以下国企校招岗位（学生背景：西安交通大学 985 硕，管理科学与工程/信息管理与信息系统），输出结构化的能力树分析。

分析目标：
1. 汇总这些岗位共同要求的技术栈和能力
2. 指出最新 AI 技术如何赋能/覆盖每项能力需求
3. 给出有针对性的学习路径建议

输出严格 JSON（无 markdown 包裹），结构如下：
{
  "overall_summary": "3-5 句总体洞察，说明这些岗位对能力的需求趋势",
  "skill_tree": [
    {
      "category": "数据分析与 AI 基础",
      "description": "岗位对这些能力的要求概况",
      "items": [
        { "skill": "SQL", "importance": "必备", "reason": "出现于 XX% 以上数据分析/产品岗" },
        { "skill": "Python", "importance": "推荐", "reason": "AI 产品需求分析、数据处理场景常用" }
      ]
    }
  ],
  "ai_coverage": [
    {
      "skill_needed": "数据分析",
      "how_ai_covers": "用 AI Agent / Code Interpreter 直接加速数据清洗与分析流程",
      "learn": "学习 LangChain + AutoGen 搭建自动化分析管线",
      "project": "构建一个简历/岗位匹配分析 Agent"
    }
  ],
  "learning_path": [
    {
      "priority": "P0",
      "topic": "AI Agent 开发框架",
      "reason": "国企数智化转型核心需求",
      "approach": "从 LangChain 入门，理解 Agent/Tool/Chain 概念，做实战项目",
      "projects": ["智能文档问答系统", "自动化数据分析 Pipeline"]
    }
  ]
}

注意：importance 可选值 "必备"/"重要"/"推荐"。priority 可选值 "P0"/"P1"/"P2"。每个数组保持 3-6 项。`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: '你是资深 AI 职业规划师，专精国企数字化转型人才需求和能力分析。输出严格 JSON。' },
        { role: 'user', content: prompt + '\n\n岗位列表：\n' + JSON.stringify(jobsForLLM, null, 2) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 16384,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty DeepSeek response');

  // Try to parse JSON, handle if wrapped in ```json
  let parsed;
  const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[1]);
  } else {
    parsed = JSON.parse(content);
  }

  return parsed;
}

async function main() {
  console.log('[skills] 抓取岗位...');
  const jobs = await fetchJobs();
  const topJobs = jobs.slice(0, 30);
  console.log(`[skills] 分析 ${topJobs.length} 个岗位...`);

  const analysis = await analyzeWithDeepSeek(topJobs);
  console.log('[skills] DeepSeek 分析完成');

  const output = {
    ...analysis,
    last_updated: new Date().toISOString(),
    total_jobs: jobs.length,
    analyzed_jobs: topJobs.map(j => ({
      company: j.company_name,
      title: j.job_name,
      location: j.district_list?.[0]?.area_cn || '',
      education: j.education_cn || '',
    })),
  };

  writeFileSync('skills/data.json', JSON.stringify(output, null, 2));
  console.log('[skills] 写入 skills/data.json');
}

main().catch(err => {
  console.error('[skills] 失败:', err.message);
  process.exit(1);
});
