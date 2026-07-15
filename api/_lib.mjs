// Shared: fetch jobs from 国聘 API
const API_BASE = 'https://gp-api.iguopin.com/api/jobs/v1';
const HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
  Device: 'pc',
  Subsite: 'cujiuye',
  Version: '5.0.0',
};

const TARGET_ROLES = [
  'AI产品', '人工智能产品', '数据产品', '数据分析',
  '产品经理', '数据运营', '项目管理', '管培生', '培训生',
];
const SECONDARY_ROLES = [
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

async function fetchList(keyword = '') {
  const r = await fetch(API_BASE + '/list', {
    method: 'POST', headers: HEADERS,
    body: JSON.stringify({ page: 1, page_size: 200, keyword, nature: ['115xW5oQ'] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()).data?.list || [];
}

function scanAdvantages(job) {
  const text = `${job.job_name || ''} ${job.contents || ''} ${(job.major_cn || []).join('')}`;
  const notes = [];
  if (/985/.test(text)) notes.push('985 优先/要求');
  if (/双一流/.test(text)) notes.push('双一流高校优先');
  if (/硕士研究生/.test(text)) notes.push('硕士研究生学历要求');
  if (/专项招生|定向培养/.test(text)) notes.push('专项招生/定向培养');
  return notes;
}

function scoreJob(job) {
  const name = job.job_name || '';
  const content = job.contents || '';
  const majors = (job.major_cn || []).join('');
  let score = 0;
  if (TARGET_ROLES.some(r => name.includes(r))) score += 40;
  else if (SECONDARY_ROLES.some(r => name.includes(r))) {
    score += 20;
    if (/AI|人工智能|机器学习|大数据/.test(content)) score += 10;
  }
  if (/管理科学与工程|信息管理与信息系统|信息管理|信息系统/.test(majors) ||
      /管理科学与工程|信息管理与信息系统/.test(content)) score += 30;
  else if (/管理类|经济类|数学|统计|计算机类|电子信息/.test(majors)) score += 15;
  if (/AI|人工智能|机器学习|大数据|数据挖掘|数字化/.test(content)) score += 15;
  const nature = job.company_info?.nature_cn || '';
  if (nature.includes('国企') || nature.includes('央企')) score += 15;
  if (scanAdvantages(job).length > 0) score += 10;
  if (/销售|推销/.test(name) && !/产品/.test(name)) score -= 50;
  return Math.max(score, 0);
}

export async function fetchAndScoreJobs() {
  const [all, ai, aiCn] = await Promise.all([
    fetchList(''), fetchList('AI'), fetchList('人工智能'),
  ]);
  const seen = new Set();
  const merged = [];
  for (const j of [...all, ...ai, ...aiCn]) {
    if (seen.has(j.job_id)) continue;
    seen.add(j.job_id);
    merged.push(j);
  }
  return merged
    .map(j => {
      const name = j.job_name || '';
      const majors = (j.major_cn || []).join('');
      if (EXCLUDE_PURE_TECH.some(k => name.includes(k)) && !TARGET_ROLES.some(r => name.includes(r))) return null;
      if (EXCLUDE_SPECIAL.some(k => majors.includes(k))) return null;
      const hasMajor = /管理科学与工程|信息管理与信息系统|管理类|经济类|数学|统计|计算机/.test(majors) ||
        /管理科学与工程|信息管理/.test(j.contents || '');
      const hasRole = TARGET_ROLES.some(r => name.includes(r)) || SECONDARY_ROLES.some(r => name.includes(r));
      if (!hasMajor && !hasRole) return null;
      const score = scoreJob(j);
      if (score < 20) return null;
      return { job: j, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map(s => {
      s.job.score = s.score;
      s.job.advantage_notes = scanAdvantages(s.job);
      return s.job;
    });
}

export function cleanJob(job) {
  return {
    job_id: job.job_id,
    company: job.company_name,
    title: job.job_name,
    location: job.district_list?.[0]?.area_cn || '',
    education: job.education_cn || '',
    major: job.major_cn || [],
    salary: job.min_wage && job.max_wage ? `${job.min_wage}-${job.max_wage}K` : '面议',
    deadline: job.end_time || '',
    content: (job.contents || '').replace(/<[^>]*>/g, '').slice(0, 2000),
    advantage_notes: job.advantage_notes || [],
    score: job.score || 0,
  };
}
