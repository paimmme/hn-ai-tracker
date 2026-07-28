// Shared: 国聘网校招岗位抓取与打分
const API_BASE = 'https://gp-api.iguopin.com/api/jobs/v1';
const HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
  Device: 'pc',
  Subsite: 'cujiuye',
  Version: '5.0.0',
  'User-Agent': 'Mozilla/5.0',
};

export const TARGET_ROLES = [
  'AI产品', '人工智能产品', '数据产品', '数据分析',
  '产品经理', '数据运营', '项目管理', '管培生', '培训生',
];

export const SECONDARY_ROLES = [
  '产品', '运营', '解决方案', '咨询', '市场',
  '数字化', '智能化', '项目', '综合管理',
];

const EXCLUDE_PURE_TECH = [
  '算法工程师', '算法开发', '后端', '前端', '编码',
  '嵌入式', '硬件开发', '驱动开发', '编译器', '内核', '运维工程师',
];

const EXCLUDE_SPECIAL = [
  '医学', '药学', '护理', '兽医', '土木', '水利',
  '地质', '采矿', '冶金', '纺织', '食品', '轻工',
];

// 从 JD 文本中抽取可聚类技能关键词
export const JD_SKILL_PATTERNS = [
  { skill: 'SQL', re: /\bSQL\b|数据库查询|MySQL|PostgreSQL|Oracle/i },
  { skill: 'Python', re: /\bPython\b|爬虫|数据分析脚本/i },
  { skill: 'Excel/数分', re: /Excel|透视表|Power\s*BI|Tableau|数据可视化/i },
  { skill: '数据分析', re: /数据分析|数据挖掘|数据建模|指标体系|数仓/i },
  { skill: '机器学习', re: /机器学习|深度学习|神经网络|\bML\b|\bDL\b/i },
  { skill: '大模型/LLM', re: /大模型|LLM|AIGC|生成式|ChatGPT|Prompt|RAG|智能体|Agent/i },
  { skill: '产品设计', re: /产品经理|需求分析|PRD|原型|Axure|Figma|MasterGo|用户研究/i },
  { skill: '项目管理', re: /项目管理|PMP|敏捷|Scrum|甘特|里程碑/i },
  { skill: '沟通协作', re: /沟通|协调|跨部门|汇报|表达/i },
  { skill: '数字化转型', re: /数字化|智能化|数智化|信息化|流程优化/i },
  { skill: '行业知识', re: /金融|能源|制造|电网|运营商|政企|对公/i },
  { skill: '英语', re: /英语|CET|托福|雅思|双语/i },
  { skill: '统计学', re: /统计|计量|SPSS|R语言|\bR\b/i },
  { skill: 'Java/后端基础', re: /\bJava\b|Spring|后端开发/i },
  { skill: 'AI工具应用', re: /Cursor|Copilot|Claude|AI编程|效率工具/i },
  { skill: '数据治理', re: /数据治理|主数据|元数据|数据质量/i },
  { skill: '运营增长', re: /用户运营|内容运营|增长|漏斗|转化/i },
  { skill: '解决方案', re: /解决方案|售前|方案撰写|客户交流/i },
];

/**
 * 技能 → 可写简历的练手项目（规则兜底，不依赖 LLM）
 * 面向：管科/信管 + 国企数智化/AI 产品求职
 */
export const PRACTICE_PROJECTS = {
  'SQL': [
    '国企业务漏斗数仓：用 SQL 建 3–5 张主题表 + 窗口函数排名报表',
    '校招岗位宽表：清洗 JD 文本特征并用 SQL 统计技能覆盖率',
  ],
  'Python': [
    '岗位 JD 爬取与结构化：requests/parse → pandas 清洗 → 导出匹配报告',
    '周报自动生成器：读取 RSS/CSV，生成 Markdown/HTML 摘要',
  ],
  'Excel/数分': [
    '招聘漏斗看板：Excel/Power BI 做阶段转化 + 异常下钻',
    '能力雷达对比表：个人技能 vs 岗位共性覆盖率可视化',
  ],
  '数据分析': [
    '秋招投递决策分析：用公开数据做岗位匹配度打分与优先级排序',
    '指标体系设计：为一个 AI 产品写北极星指标 + 拆解到过程指标',
  ],
  '机器学习': [
    '简历-岗位匹配分类：TF-IDF/简单分类模型预测匹配等级',
    '小样本异常检测：用工单/日志样例做孤立森林 demo',
  ],
  '大模型/LLM': [
    '校招助手 RAG：上传 10 份 JD，问答“我适合哪些岗/缺口是什么”',
    '投递信 Agent：输入公司+岗位，自动生成定制化自我介绍',
  ],
  '产品设计': [
    'AI 校招助手 PRD + MasterGo/Figma 高保真原型（含 3 个核心流程）',
    '竞品拆解：拆 2 个招聘/AI 产品，输出功能对比与差异化方案',
  ],
  '项目管理': [
    '用看板管理 4 周学习计划：里程碑、风险清单、周复盘模板',
    '模拟数字化项目：写项目章程 + WBS + 沟通计划（1 页纸即可）',
  ],
  '沟通协作': [
    '跨角色对齐会议纪要模板：产品/技术/业务三方立场与结论格式',
    '3 分钟电梯演讲：把个人项目讲成业务价值故事并录音复盘',
  ],
  '数字化转型': [
    '选一个国企场景写“数字化改造建议书”（现状-痛点-方案-ROI）',
    '流程自动化案例：识别 1 个重复流程并用 AI/RPA 思路重设计',
  ],
  '行业知识': [
    '目标行业一周扫盲笔记：术语表 + 价值链 + 3 个 AI 落点',
    '某央企年报/白皮书摘要：数智化投入与岗位机会映射',
  ],
  '英语': [
    '精读 5 篇英文 AI 产品/研究 blog，输出中英对照一页纸',
    '英文 STAR 项目描述：把 1 个项目改写成可放简历/面试英文版',
  ],
  '统计学': [
    'A/B 测试小实验：用公开数据做假设检验与结论边界说明',
    '问卷/样本偏差分析：解释“覆盖率高≠因果”的常见误区',
  ],
  'Java/后端基础': [
    '最小 API：Spring Boot/Express 暴露岗位匹配接口（CRUD + 过滤）',
    '读懂一篇后端接口文档并画出时序图（校招面试常考）',
  ],
  'AI工具应用': [
    '用 Cursor 从 0 到 1 做出可演示的小 Web 工具并写开发日志',
    '对比 Cursor/Claude：同一任务下的效率、质量与人工修正点',
  ],
  '数据治理': [
    'JD 数据质量规则：缺失/重复/冲突检测 + 治理看板',
    '主数据字典：公司-岗位-技能三层实体与血缘示意',
  ],
  '运营增长': [
    '设计校园招聘获客漏斗：渠道-转化-复盘仪表盘',
    '内容运营实验：围绕 AI 校招选题做 7 天内容计划与指标',
  ],
  '解决方案': [
    '售前方案包：场景痛点 + 架构图 + 实施路径 + 价值评估',
    '客户访谈纪要模板：挖需求 → 归纳痛点 → 映射产品能力',
  ],
};

export function getProjectsForSkill(skill, limit = 2) {
  if (!skill) return [];
  if (PRACTICE_PROJECTS[skill]) return PRACTICE_PROJECTS[skill].slice(0, limit);

  // 模糊匹配（LLM 可能改写技能名）
  const key = Object.keys(PRACTICE_PROJECTS).find(k =>
    skill.includes(k) || k.includes(skill) ||
    skill.replace(/\s+/g, '').includes(k.replace(/\s+/g, ''))
  );
  if (key) return PRACTICE_PROJECTS[key].slice(0, limit);

  return [
    `围绕「${skill}」做一个可演示 demo，并写清业务问题→方案→结果`,
    `整理「${skill}」面试问答 10 条 + 1 个项目复盘`,
  ].slice(0, limit);
}

export function enrichSkillWithProjects(skillObj) {
  const skill = skillObj.skill || skillObj.topic || '';
  const projects = skillObj.projects?.length
    ? skillObj.projects
    : getProjectsForSkill(skill, 2);
  return { ...skillObj, projects };
}

function fetchWithRetry(url, body, retries = 2) {
  const opts = {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  };
  return fetch(url, opts).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }).catch(err => {
    if (retries > 0) {
      return new Promise(r => setTimeout(r, 1500)).then(() =>
        fetchWithRetry(url, body, retries - 1)
      );
    }
    throw err;
  });
}

async function fetchList(keyword = '') {
  const data = await fetchWithRetry(`${API_BASE}/list`, {
    page: 1,
    page_size: 200,
    keyword,
    nature: ['115xW5oQ'], // 校招
  });
  return data?.data?.list || [];
}

export function scanAdvantages(job) {
  const text = `${job.job_name || ''} ${job.contents || ''} ${(job.major_cn || []).join('')}`;
  const notes = [];
  if (/985/.test(text)) notes.push('明确提及 985 优先/要求');
  if (/双一流/.test(text)) notes.push('双一流高校优先/要求');
  if (/硕士/.test(text) && !/硕士及以上/.test(text)) {
    notes.push('特定面向硕士招生/优待');
  } else if (/硕士研究生/.test(text)) notes.push('硕士研究生学历要求');
  if (/专项招生|定向培养/.test(text)) notes.push('可能有专项招生/定向培养政策');
  return notes;
}

export function scoreJob(job) {
  const name = job.job_name || '';
  const content = job.contents || '';
  const majors = (job.major_cn || []).join('');
  let score = 0;

  if (TARGET_ROLES.some(r => name.includes(r))) {
    score += 40;
  } else if (SECONDARY_ROLES.some(r => name.includes(r))) {
    score += 20;
    if (/AI|人工智能|机器学习|大数据/.test(content)) score += 10;
  }

  if (/管理科学与工程|信息管理与信息系统|信息管理|信息系统/.test(majors) ||
      /管理科学与工程|信息管理与信息系统/.test(content)) {
    score += 30;
  } else if (/管理类|经济类|数学|统计|计算机类|电子信息/.test(majors)) {
    score += 15;
  }

  if (/AI|人工智能|机器学习|大数据|数据挖掘|数字化/.test(content)) score += 15;

  const nature = job.company_info?.nature_cn || '';
  if (nature.includes('国企') || nature.includes('央企')) score += 15;

  const advantages = scanAdvantages(job);
  if (advantages.length > 0) score += 10;

  if (/销售|推销/.test(name) && !/产品/.test(name)) score -= 50;

  return Math.max(score, 0);
}

export function extractSkillsFromJob(job) {
  const majorList = job.major_cn || job.major || [];
  const majorText = Array.isArray(majorList) ? majorList.join(' ') : String(majorList || '');
  const text = [
    job.job_name || job.title || '',
    job.contents || job.content || '',
    majorText,
    (job.extracted_skills || []).join(' '),
  ].join(' ');
  const found = [];
  for (const { skill, re } of JD_SKILL_PATTERNS) {
    if (re.test(text)) found.push(skill);
  }
  return found;
}

export function clusterJobsBySkills(jobs) {
  const skillStats = new Map(); // skill -> { count, jobs: [] }
  const roleBuckets = {
    'AI/数据产品': [],
    '数据分析/治理': [],
    '产品/解决方案': [],
    '综合管理/管培': [],
    '其他相关': [],
  };

  for (const job of jobs) {
    const skills = extractSkillsFromJob(job);
    for (const skill of skills) {
      if (!skillStats.has(skill)) skillStats.set(skill, { skill, count: 0, companies: new Set() });
      const s = skillStats.get(skill);
      s.count += 1;
      s.companies.add(job.company_name || job.company || '未知');
    }

    const name = job.job_name || job.title || '';
    if (/AI|人工智能|数据产品|智能/.test(name)) roleBuckets['AI/数据产品'].push(job);
    else if (/数据|分析|治理|数仓/.test(name)) roleBuckets['数据分析/治理'].push(job);
    else if (/产品|解决|咨询|方案/.test(name)) roleBuckets['产品/解决方案'].push(job);
    else if (/管培|培训生|综合管理|项目管理/.test(name)) roleBuckets['综合管理/管培'].push(job);
    else roleBuckets['其他相关'].push(job);
  }

  const total = jobs.length || 1;
  const common_skills = [...skillStats.values()]
    .map(s => enrichSkillWithProjects({
      skill: s.skill,
      count: s.count,
      coverage: Math.round((s.count / total) * 100),
      sample_companies: [...s.companies].slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);

  const role_clusters = Object.entries(roleBuckets)
    .filter(([, list]) => list.length > 0)
    .map(([role, list]) => {
      const skillCount = new Map();
      for (const j of list) {
        for (const sk of extractSkillsFromJob(j)) {
          skillCount.set(sk, (skillCount.get(sk) || 0) + 1);
        }
      }
      const top_skills = [...skillCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([skill, count]) => enrichSkillWithProjects({
          skill,
          count,
          coverage: Math.round((count / list.length) * 100),
        }));
      return {
        role,
        count: list.length,
        coverage: Math.round((list.length / total) * 100),
        top_skills,
        // 角色簇级推荐：取 top skills 的项目汇总
        projects: [...new Set(
          top_skills.flatMap(s => getProjectsForSkill(s.skill, 1))
        )].slice(0, 3),
        sample_jobs: list.slice(0, 5).map(j => ({
          company: j.company_name || j.company || '',
          title: j.job_name || j.title || '',
        })),
      };
    })
    .sort((a, b) => b.count - a.count);

  // 共性门槛：覆盖率 >= 20% 视为共性要求
  const must_have = common_skills.filter(s => s.coverage >= 35).slice(0, 10);
  const should_have = common_skills.filter(s => s.coverage >= 20 && s.coverage < 35).slice(0, 10);
  const nice_to_have = common_skills.filter(s => s.coverage < 20).slice(0, 10);

  const makePlanItem = (s, priority, action) => {
    const projects = getProjectsForSkill(s.skill, 2);
    return {
      priority,
      skill: s.skill,
      coverage: s.coverage,
      reason: `${s.coverage}% 岗位提及` + (
        priority === 'P0' ? '，属于共性硬门槛' :
        priority === 'P1' ? '，拉开差异化的关键技能' : '，加分项'
      ),
      action,
      projects,
      // 明确首推项目，方便邮件/摘要直接展示
      primary_project: projects[0] || '',
    };
  };

  const focus_plan = [
    ...must_have.slice(0, 4).map(s => makePlanItem(
      s, 'P0',
      `本周完成 1 个练手项目并写进简历「项目经历」：优先做「${getProjectsForSkill(s.skill, 1)[0] || s.skill}」`,
    )),
    ...should_have.slice(0, 3).map(s => makePlanItem(
      s, 'P1',
      `两周内完成 1 个差异化 demo：${getProjectsForSkill(s.skill, 1)[0] || s.skill}`,
    )),
    ...nice_to_have.slice(0, 2).map(s => makePlanItem(
      s, 'P2',
      `轻量了解 + 收藏案例；有余力可做：${getProjectsForSkill(s.skill, 1)[0] || s.skill}`,
    )),
  ];

  // 共性 → 练手项目对照表（需求闭环的核心交付）
  const skill_project_map = [...must_have, ...should_have].slice(0, 12).map(s => ({
    skill: s.skill,
    coverage: s.coverage,
    count: s.count,
    level: s.coverage >= 35 ? '必备' : '重要',
    projects: getProjectsForSkill(s.skill, 2),
  }));

  return {
    total_jobs: jobs.length,
    common_skills,
    must_have,
    should_have,
    nice_to_have,
    role_clusters,
    focus_plan,
    skill_project_map,
    generated_at: new Date().toISOString(),
  };
}

export async function fetchAndScoreJobs() {
  console.log('  [jobs] 抓取国聘校招岗位...');
  const [allJobs, aiJobs, aiCnJobs] = await Promise.all([
    fetchList(''),
    fetchList('AI'),
    fetchList('人工智能'),
  ]);
  console.log(`  [jobs] 全部: ${allJobs.length} 条 | AI: ${aiJobs.length} 条 | 人工智能: ${aiCnJobs.length} 条`);

  const seen = new Set();
  const merged = [];
  for (const job of [...allJobs, ...aiJobs, ...aiCnJobs]) {
    if (seen.has(job.job_id)) continue;
    seen.add(job.job_id);
    merged.push(job);
  }
  console.log(`  [jobs] 去重后: ${merged.length} 条`);

  const scored = merged.map(job => {
    const name = job.job_name || '';
    const content = job.contents || '';
    const majors = (job.major_cn || []).join('');

    if (EXCLUDE_PURE_TECH.some(k => name.includes(k)) && !TARGET_ROLES.some(r => name.includes(r))) {
      return null;
    }
    if (EXCLUDE_SPECIAL.some(k => majors.includes(k))) return null;

    const hasMajorMatch = /管理科学与工程|信息管理与信息系统|管理类|经济类|数学|统计|计算机/.test(majors) ||
      /管理科学与工程|信息管理/.test(content);
    const hasRoleMatch = TARGET_ROLES.some(r => name.includes(r)) ||
      SECONDARY_ROLES.some(r => name.includes(r));

    if (!hasMajorMatch && !hasRoleMatch) return null;

    const score = scoreJob(job);
    if (score < 20) return null;

    return { job, score };
  }).filter(Boolean);

  console.log(`  [jobs] 筛选通过: ${scored.length} 条`);

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 50).map(s => {
    const j = s.job;
    j.score = s.score;
    j.advantage_notes = scanAdvantages(j);
    j.extracted_skills = extractSkillsFromJob(j);
    return j;
  });
  console.log(`  [jobs] 返回 ${top.length} 个优质岗`);
  return top;
}

/** @deprecated alias */
export async function fetchJobs() {
  return fetchAndScoreJobs();
}

export function cleanJob(job) {
  return {
    job_id: job.job_id,
    company: job.company_name || job.company,
    title: job.job_name || job.title,
    location: job.district_list?.[0]?.area_cn || job.location || '',
    education: job.education_cn || job.education || '',
    major: job.major_cn || job.major || [],
    salary: job.min_wage && job.max_wage ? `${job.min_wage}-${job.max_wage}K` : (job.salary || '面议'),
    deadline: job.end_time || job.deadline || '',
    content: (job.contents || job.content || '').replace(/<[^>]*>/g, '').slice(0, 2000),
    advantage_notes: job.advantage_notes || [],
    extracted_skills: job.extracted_skills || extractSkillsFromJob(job),
    score: job.score || 0,
  };
}
