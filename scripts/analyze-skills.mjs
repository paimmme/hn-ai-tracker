// 岗位技能分析 — DeepSeek 能力树 + JD 聚类专项学习
import { writeFileSync } from 'fs';
import { fetchJobs, cleanJob, clusterJobsBySkills } from './fetch-jobs.mjs';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

function truncate(s, n) {
  if (!s) return '';
  const cleaned = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > n ? cleaned.slice(0, n) : cleaned;
}

async function analyzeWithDeepSeek(jobs, cluster) {
  const jobsForLLM = jobs.map(j => ({
    company: j.company_name || j.company,
    title: j.job_name || j.title,
    content: truncate(j.contents || j.content || '', 600),
    major: (j.major_cn || j.major || []).join?.(', ') || j.major || '',
    education: j.education_cn || j.education || '',
    location: j.district_list?.[0]?.area_cn || j.location || '',
    skills: j.extracted_skills || [],
  }));

  const prompt = `你是资深 AI 职业规划师。分析以下国企校招岗位（学生背景：西安交通大学 985 硕，管理科学与工程/信息管理与信息系统），输出结构化的能力树分析。

已完成 JD 技能聚类（请严格对齐专项学习路线）：
${JSON.stringify({
  must_have: cluster.must_have,
  should_have: cluster.should_have,
  nice_to_have: cluster.nice_to_have?.slice(0, 8),
  role_clusters: cluster.role_clusters,
  focus_plan: cluster.focus_plan,
}, null, 2)}

分析目标：
1. 汇总这些岗位共同要求的技术栈和能力
2. 指出最新 AI 技术如何赋能/覆盖每项能力需求
3. 给出有针对性的学习路径建议（优先覆盖 must_have / should_have）

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
  const cleaned = topJobs.map(cleanJob);
  const cluster = clusterJobsBySkills(cleaned);
  console.log(`[skills] 分析 ${topJobs.length} 个岗位 + JD 聚类 (must=${cluster.must_have.length})...`);

  let analysis = {};
  if (DEEPSEEK_API_KEY) {
    analysis = await analyzeWithDeepSeek(topJobs, cluster);
    console.log('[skills] DeepSeek 分析完成');
  } else {
    console.warn('[skills] DEEPSEEK_API_KEY 未设置，仅写入聚类结果');
    analysis = {
      overall_summary: '基于规则聚类生成（未调用 LLM）。请配置 DEEPSEEK_API_KEY 获取完整能力树分析。',
      skill_tree: [{
        category: 'JD 共性技能（规则聚类）',
        description: '按关键词覆盖率统计',
        items: cluster.common_skills.slice(0, 12).map(s => ({
          skill: s.skill,
          importance: s.coverage >= 35 ? '必备' : s.coverage >= 20 ? '重要' : '推荐',
          reason: `覆盖率 ${s.coverage}%（${s.count}/${cluster.total_jobs}）`,
        })),
      }],
      ai_coverage: [],
      learning_path: cluster.focus_plan.map(p => ({
        priority: p.priority,
        topic: p.skill,
        reason: p.reason,
        approach: p.action,
        projects: [],
      })),
    };
  }

  const output = {
    ...analysis,
    cluster,
    last_updated: new Date().toISOString(),
    total_jobs: jobs.length,
    analyzed_jobs: cleaned.map(j => ({
      job_id: j.job_id,
      company: j.company,
      title: j.title,
      location: j.location,
      education: j.education,
      score: j.score,
      extracted_skills: j.extracted_skills,
      advantage_notes: j.advantage_notes,
    })),
  };

  writeFileSync('skills/data.json', JSON.stringify(output, null, 2));
  console.log('[skills] 写入 skills/data.json');
}

main().catch(err => {
  console.error('[skills] 失败:', err.message);
  process.exit(1);
});
