// 国聘网校招岗位抓取 — 按管理科学与工程/信息管理与信息系统筛选
const API_BASE = 'https://gp-api.iguopin.com/api/jobs/v1';
const HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
  Device: 'pc',
  Subsite: 'cujiuye',
  Version: '5.0.0',
  'User-Agent': 'Mozilla/5.0',
};

// 高价值岗位关键词（title 匹配即强信号）
const TARGET_ROLES = [
  'AI产品', '人工智能产品', '数据产品', '数据分析',
  '产品经理', '数据运营', '项目管理', '管培生', '培训生',
];

// 中价值岗位关键词（需要结合专业匹配）
const SECONDARY_ROLES = [
  '产品', '运营', '解决方案', '咨询', '市场',
  '数字化', '智能化', '项目', '综合管理',
];

// 纯技术排除
const EXCLUDE_PURE_TECH = [
  '算法工程师', '算法开发', '后端', '前端', '编码',
  '嵌入式', '硬件开发', '驱动开发', '编译器', '内核',
  '运维工程师',
];

// 专精领域排除
const EXCLUDE_SPECIALIZED = [
  '医学', '药学', '护理', '兽医', '土木', '水利',
  '地质', '采矿', '冶金', '纺织', '食品', '轻工',
];

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) : s;
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

function scanAdvantages(job) {
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

function scoreJob(job) {
  const name = job.job_name || '';
  const content = job.contents || '';
  const majors = (job.major_cn || []).join('');
  let score = 0;

  // 岗位标题匹配（强信号）
  if (TARGET_ROLES.some(r => name.includes(r))) {
    score += 40;
  } else if (SECONDARY_ROLES.some(r => name.includes(r))) {
    score += 20;
    // 如果同时 content 有 AI/数字化，加分
    if (/AI|人工智能|机器学习|大数据/.test(content)) score += 10;
  }

  // 专业匹配
  if (/管理科学与工程|信息管理与信息系统|信息管理|信息系统/.test(majors) ||
      /管理科学与工程|信息管理与信息系统/.test(content)) {
    score += 30;
  } else if (/管理类|经济类|数学|统计|计算机类|电子信息/.test(majors)) {
    score += 15;
  }

  // AI/技术内容相关性（加分项）
  if (/AI|人工智能|机器学习|大数据|数据挖掘|数字化/.test(content)) score += 15;

  // 国企/央企加分
  const nature = job.company_info?.nature_cn || '';
  if (nature.includes('国企') || nature.includes('央企')) score += 15;

  // 985/硕士优势加分
  const advantages = scanAdvantages(job);
  if (advantages.length > 0) score += 10;

  // 纯销售岗位惩罚
  if (/销售|推销/.test(name) && !/产品/.test(name)) score -= 50;

  return Math.max(score, 0);
}

export async function fetchJobs() {
  console.log('  [jobs] 抓取国聘校招岗位...');
  const [allJobs, aiJobs, aiCnJobs] = await Promise.all([
    fetchList(''),
    fetchList('AI'),
    fetchList('人工智能'),
  ]);
  console.log(`  [jobs] 全部: ${allJobs.length} 条 | AI: ${aiJobs.length} 条 | 人工智能: ${aiCnJobs.length} 条`);

  // 合并去重（按 job_id）
  const seen = new Set();
  const merged = [];
  for (const job of [...allJobs, ...aiJobs, ...aiCnJobs]) {
    if (seen.has(job.job_id)) continue;
    seen.add(job.job_id);
    merged.push(job);
  }
  console.log(`  [jobs] 去重后: ${merged.length} 条`);

  // 预筛选 + 打分
  const scored = merged.map(job => {
    const name = job.job_name || '';
    const content = job.contents || '';
    const majors = (job.major_cn || []).join('');

    // 排除纯技术岗
    if (EXCLUDE_PURE_TECH.some(k => name.includes(k)) && !TARGET_ROLES.some(r => name.includes(r))) {
      return null;
    }
    // 排除专精领域
    if (EXCLUDE_SPECIALIZED.some(k => majors.includes(k))) return null;

    // 至少有一条匹配理由
    const hasMajorMatch = /管理科学与工程|信息管理与信息系统|管理类|经济类|数学|统计|计算机/.test(majors) ||
      /管理科学与工程|信息管理/.test(content);
    const hasRoleMatch = TARGET_ROLES.some(r => name.includes(r)) ||
      SECONDARY_ROLES.some(r => name.includes(r));

    if (!hasMajorMatch && !hasRoleMatch) return null;

    const score = scoreJob(job);
    if (score < 20) return null; // 得分低于 20 的不要

    return { job, score };
  }).filter(Boolean);

  console.log(`  [jobs] 筛选通过: ${scored.length} 条`);

  // 排序取 top 50
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 50).map(s => {
    const j = s.job;
    j.score = s.score;
    j.advantage_notes = scanAdvantages(j);
    return j;
  });
  console.log(`  [jobs] 返回 ${top.length} 个优质岗`);

  return top;
}
