<script setup>
import { ref, computed, onMounted } from 'vue'
import { SpeedInsights } from '@vercel/speed-insights/vue'
import { PRACTICE_PROJECTS } from '../lib/jobs.mjs'

const loading = ref(true)
const error = ref('')
const data = ref(null)
const q = ref('')
const levelFilter = ref('all') // all | 必备 | 重要 | 加分
const onlyPlanned = ref(false)

onMounted(async () => {
  try {
    // 优先读周更缓存；失败则用规则库兜底
    const r = await fetch('/skills/data.json', { cache: 'no-store' })
    if (r.ok) {
      data.value = await r.json()
    } else {
      throw new Error(`HTTP ${r.status}`)
    }
  } catch (e) {
    error.value = `未能加载 skills/data.json（${e.message}），已回退到内置项目库`
    data.value = {
      overall_summary: '当前无岗位聚类缓存，仅展示规则项目库。请运行 npm run analyze 生成完整数据。',
      cluster: null,
      learning_path: [],
    }
  } finally {
    loading.value = false
  }
})

const cluster = computed(() => data.value?.cluster || null)

const rows = computed(() => {
  const c = cluster.value
  let list = []

  if (c?.skill_project_map?.length) {
    list = c.skill_project_map.map(s => ({
      skill: s.skill,
      coverage: s.coverage,
      count: s.count,
      level: s.level || (s.coverage >= 35 ? '必备' : s.coverage >= 20 ? '重要' : '加分'),
      projects: s.projects || [],
      source: 'cluster',
    }))
  } else if (c?.focus_plan?.length) {
    list = c.focus_plan.map(p => ({
      skill: p.skill,
      coverage: p.coverage,
      level: p.priority === 'P0' ? '必备' : p.priority === 'P1' ? '重要' : '加分',
      projects: p.projects || [],
      source: 'plan',
      priority: p.priority,
      action: p.action,
    }))
  } else {
    // 纯规则库
    list = Object.entries(PRACTICE_PROJECTS).map(([skill, projects]) => ({
      skill,
      coverage: null,
      level: '规则库',
      projects,
      source: 'library',
    }))
  }

  // 合并学习路线里的项目（去重附加）
  const path = data.value?.learning_path || []
  for (const item of path) {
    const topic = item.topic || ''
    if (!topic || !item.projects?.length) continue
    const hit = list.find(r => r.skill === topic || r.skill.includes(topic) || topic.includes(r.skill))
    if (hit) {
      const set = new Set([...(hit.projects || []), ...item.projects])
      hit.projects = [...set]
      hit.path = item
    }
  }

  if (levelFilter.value !== 'all') {
    list = list.filter(r => r.level === levelFilter.value)
  }
  if (onlyPlanned.value) {
    list = list.filter(r => r.level === '必备' || r.priority === 'P0')
  }
  if (q.value.trim()) {
    const needle = q.value.trim().toLowerCase()
    list = list.filter(r =>
      r.skill.toLowerCase().includes(needle) ||
      (r.projects || []).some(p => p.toLowerCase().includes(needle))
    )
  }

  return list.sort((a, b) => (b.coverage ?? -1) - (a.coverage ?? -1))
})

const stats = computed(() => {
  const all = rows.value
  const projectCount = all.reduce((n, r) => n + (r.projects?.length || 0), 0)
  return {
    skills: all.length,
    projects: projectCount,
    jobs: cluster.value?.total_jobs || data.value?.total_jobs || 0,
    updated: data.value?.cluster?.generated_at || data.value?.last_updated || '',
  }
})

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
  } catch {
    return iso
  }
}

function levelClass(level) {
  if (level === '必备') return 'lv-must'
  if (level === '重要') return 'lv-should'
  if (level === '加分') return 'lv-nice'
  return 'lv-lib'
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {})
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-top">
        <div>
          <p class="eyebrow">JD 共性 → 专项学习</p>
          <h1>🎯 练手项目看板</h1>
          <p class="desc">把岗位聚类里的共性技能，映射成可写进简历的练手项目</p>
        </div>
        <div class="hero-links">
          <a class="link" href="/">← 主分析页</a>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><div class="n">{{ stats.skills }}</div><div class="l">技能</div></div>
        <div class="stat"><div class="n">{{ stats.projects }}</div><div class="l">项目建议</div></div>
        <div class="stat"><div class="n">{{ stats.jobs || '—' }}</div><div class="l">分析岗位</div></div>
        <div class="stat wide"><div class="n small">{{ fmtDate(stats.updated) }}</div><div class="l">数据更新</div></div>
      </div>
    </header>

    <div v-if="loading" class="panel center">加载中…</div>
    <div v-else>
      <div v-if="error" class="banner">{{ error }}</div>
      <div v-if="data?.overall_summary" class="panel summary">
        {{ data.overall_summary }}
      </div>

      <div class="toolbar panel">
        <input v-model="q" class="search" placeholder="搜索技能或项目关键词…" />
        <div class="filters">
          <button
            v-for="f in ['all','必备','重要','加分']"
            :key="f"
            :class="['chip', { active: levelFilter === f }]"
            @click="levelFilter = f"
          >{{ f === 'all' ? '全部' : f }}</button>
          <button :class="['chip', { active: onlyPlanned }]" @click="onlyPlanned = !onlyPlanned">
            只看 P0/必备
          </button>
        </div>
      </div>

      <div v-if="rows.length === 0" class="panel center muted">没有匹配的技能/项目</div>

      <div class="grid">
        <article v-for="row in rows" :key="row.skill" class="card">
          <div class="card-head">
            <h2>{{ row.skill }}</h2>
            <div class="badges">
              <span :class="['lv', levelClass(row.level)]">{{ row.level }}</span>
              <span v-if="row.coverage != null" class="cov">{{ row.coverage }}%</span>
              <span v-if="row.count != null" class="cnt">{{ row.count }} 岗</span>
            </div>
          </div>

          <p v-if="row.action || row.path?.approach" class="action">
            {{ row.action || row.path?.approach }}
          </p>

          <ol class="projects">
            <li v-for="(p, i) in row.projects" :key="i">
              <div class="proj-text">{{ p }}</div>
              <button class="copy" title="复制" @click="copyText(p)">复制</button>
            </li>
          </ol>
        </article>
      </div>

      <section v-if="data?.learning_path?.length" class="panel path-sec">
        <h3>学习路线（含项目）</h3>
        <div v-for="item in data.learning_path" :key="item.topic" class="path-item">
          <span :class="['prio', 'p-' + (item.priority || 'P2')]">{{ item.priority || 'P2' }}</span>
          <div>
            <div class="path-title">{{ item.topic }}</div>
            <div class="path-why">{{ item.reason }}</div>
            <div class="path-how">{{ item.approach }}</div>
            <div class="path-tags">
              <span v-for="p in (item.projects || [])" :key="p" class="tag">{{ p }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <footer class="foot">
      本地页 · 数据来自 <code>skills/data.json</code> · 规则库兜底
      <code>PRACTICE_PROJECTS</code>
    </footer>
    <SpeedInsights />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", sans-serif;
  background: #0b1220;
  color: #e5eefc;
  line-height: 1.55;
  min-height: 100vh;
}
.page { max-width: 1100px; margin: 0 auto; padding: 24px 18px 48px; }
.hero {
  background: linear-gradient(135deg, #12203a, #1e3a5f 45%, #0f766e);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}
.hero-top { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.eyebrow { font-size: 12px; opacity: .75; margin-bottom: 6px; }
h1 { font-size: 28px; margin-bottom: 6px; letter-spacing: .2px; }
.desc { opacity: .85; font-size: 14px; }
.hero-links { display: flex; align-items: flex-start; }
.link {
  color: #dbeafe; text-decoration: none; font-size: 13px;
  border: 1px solid rgba(255,255,255,.2); padding: 8px 12px; border-radius: 8px;
}
.link:hover { background: rgba(255,255,255,.08); }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
.stat {
  background: rgba(0,0,0,.18); border-radius: 12px; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,.06);
}
.stat .n { font-size: 22px; font-weight: 700; }
.stat .n.small { font-size: 13px; font-weight: 600; line-height: 1.3; }
.stat .l { font-size: 12px; opacity: .7; margin-top: 2px; }
@media (max-width: 720px) {
  .stats { grid-template-columns: 1fr 1fr; }
  .stat.wide { grid-column: 1 / -1; }
}
.panel {
  background: #121a2b;
  border: 1px solid rgba(148,163,184,.18);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
}
.summary { font-size: 14px; color: #cbd5e1; }
.banner {
  background: #422006; color: #fde68a; border: 1px solid #92400e;
  border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; font-size: 13px;
}
.toolbar { display: flex; flex-direction: column; gap: 12px; }
.search {
  width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #334155;
  background: #0b1220; color: #e2e8f0; font-size: 14px; outline: none;
}
.search:focus { border-color: #38bdf8; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  border: 1px solid #334155; background: #0b1220; color: #94a3b8;
  border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer;
}
.chip.active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
.grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px; margin-bottom: 14px;
}
.card {
  background: #121a2b; border: 1px solid rgba(148,163,184,.16);
  border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 10px;
}
.card-head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.card-head h2 { font-size: 17px; font-weight: 650; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.lv, .cov, .cnt {
  font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600;
}
.lv-must { background: #7f1d1d; color: #fecaca; }
.lv-should { background: #7c2d12; color: #fed7aa; }
.lv-nice { background: #1e293b; color: #94a3b8; }
.lv-lib { background: #312e81; color: #c7d2fe; }
.cov { background: #164e63; color: #a5f3fc; }
.cnt { background: #1e293b; color: #94a3b8; }
.action { font-size: 12px; color: #94a3b8; }
.projects { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.projects li {
  display: flex; gap: 8px; align-items: flex-start;
  background: #0b1220; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;
}
.proj-text { flex: 1; font-size: 13px; color: #e2e8f0; }
.copy {
  flex-shrink: 0; border: none; background: #1e293b; color: #93c5fd;
  border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;
}
.copy:hover { background: #334155; }
.path-sec h3 { font-size: 15px; margin-bottom: 12px; }
.path-item {
  display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #1e293b;
}
.path-item:last-child { border-bottom: none; padding-bottom: 0; }
.prio {
  flex-shrink: 0; height: fit-content; font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 6px;
}
.p-P0 { background: #7f1d1d; color: #fecaca; }
.p-P1 { background: #7c2d12; color: #fed7aa; }
.p-P2 { background: #14532d; color: #bbf7d0; }
.path-title { font-weight: 650; margin-bottom: 2px; }
.path-why, .path-how { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.path-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.tag {
  font-size: 12px; background: #1e3a5f; color: #bfdbfe;
  border-radius: 6px; padding: 3px 8px;
}
.center { text-align: center; padding: 40px 16px; }
.muted { color: #64748b; }
.foot {
  margin-top: 18px; text-align: center; font-size: 12px; color: #64748b;
}
.foot code { color: #93c5fd; }
</style>
