<script setup>
defineProps({
  cluster: { type: Object, default: null },
})
</script>

<template>
  <div v-if="cluster" class="card">
    <div class="card-title">📊 JD 共性聚类 · 练手项目</div>
    <div class="card-sub">
      基于 {{ cluster.total_jobs || 0 }} 个岗位 · 共性技能 → 对应可写简历的练手项目
    </div>

    <!-- 核心：共性 → 项目对照表 -->
    <section v-if="cluster.skill_project_map?.length || cluster.focus_plan?.length" class="block">
      <h3>专项学习：技能 → 练手项目</h3>
      <div
        v-for="row in (cluster.skill_project_map?.length ? cluster.skill_project_map : cluster.focus_plan)"
        :key="'map-' + (row.skill || row.topic)"
        class="map-row"
      >
        <div class="map-head">
          <span class="map-skill">{{ row.skill }}</span>
          <span v-if="row.coverage != null" class="map-cov">{{ row.coverage }}%</span>
          <span v-if="row.level" class="map-level" :class="row.level === '必备' ? 'lv-must' : 'lv-should'">
            {{ row.level }}
          </span>
          <span v-else-if="row.priority" :class="['prio', 'prio-' + row.priority]">{{ row.priority }}</span>
        </div>
        <ol class="map-projects">
          <li v-for="(p, i) in (row.projects || []).slice(0, 2)" :key="i">{{ p }}</li>
        </ol>
      </div>
    </section>

    <section v-if="cluster.must_have?.length" class="block">
      <h3>必备共性 ≥ 35%</h3>
      <div class="chips">
        <span v-for="s in cluster.must_have" :key="'m-' + s.skill" class="chip chip-must">
          {{ s.skill }} <small>{{ s.coverage }}%</small>
        </span>
      </div>
    </section>

    <section v-if="cluster.should_have?.length" class="block">
      <h3>重要共性 20%–34%</h3>
      <div class="chips">
        <span v-for="s in cluster.should_have" :key="'s-' + s.skill" class="chip chip-should">
          {{ s.skill }} <small>{{ s.coverage }}%</small>
        </span>
      </div>
    </section>

    <section v-if="cluster.nice_to_have?.length" class="block">
      <h3>加分项</h3>
      <div class="chips">
        <span v-for="s in cluster.nice_to_have" :key="'n-' + s.skill" class="chip chip-nice">
          {{ s.skill }} <small>{{ s.coverage }}%</small>
        </span>
      </div>
    </section>

    <section v-if="cluster.role_clusters?.length" class="block">
      <h3>岗位角色簇</h3>
      <div v-for="r in cluster.role_clusters" :key="r.role" class="role">
        <div class="role-head">
          <strong>{{ r.role }}</strong>
          <span class="badge badge-blue">{{ r.count }} 岗 · {{ r.coverage }}%</span>
        </div>
        <div class="chips">
          <span v-for="s in r.top_skills" :key="r.role + s.skill" class="chip chip-role">
            {{ s.skill }} {{ s.coverage }}%
          </span>
        </div>
        <div v-if="r.projects?.length" class="role-projects">
          <div class="mini-label">推荐练手</div>
          <span v-for="(p, i) in r.projects" :key="i" class="project-tag">{{ p }}</span>
        </div>
        <ul class="samples">
          <li v-for="(j, i) in r.sample_jobs" :key="i">{{ j.company }} · {{ j.title }}</li>
        </ul>
      </div>
    </section>

    <section v-if="cluster.focus_plan?.length" class="block">
      <h3>本周聚焦（含项目）</h3>
      <div v-for="(p, i) in cluster.focus_plan" :key="i" class="plan">
        <span :class="['prio', 'prio-' + p.priority]">{{ p.priority }}</span>
        <div>
          <div class="plan-title">{{ p.skill }} <small v-if="p.coverage">· {{ p.coverage }}%</small></div>
          <div class="plan-reason">{{ p.reason }}</div>
          <div class="plan-action">{{ p.action }}</div>
          <div v-if="p.projects?.length" class="plan-projects">
            <span v-for="(proj, j) in p.projects" :key="j" class="project-tag">{{ proj }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="card">
    <div class="card-title">📊 JD 共性聚类 · 练手项目</div>
    <div class="empty">暂无聚类数据。可运行周更分析或点击「刷新分析」。</div>
  </div>
</template>

<style scoped>
.block { margin-bottom: 20px; }
.block h3 { font-size: 14px; margin-bottom: 8px; color: #334155; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px; font-size: 12px;
  background: #f1f5f9; color: #334155;
}
.chip small { opacity: .7; }
.chip-must { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.chip-should { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
.chip-nice { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
.chip-role { background: #f3e8ff; color: #6b21a8; }

.map-row {
  border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px 14px;
  margin-bottom: 10px; background: #faf5ff;
}
.map-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.map-skill { font-weight: 600; font-size: 14px; color: #1e293b; }
.map-cov { font-size: 12px; color: #7e22ce; font-weight: 600; }
.map-level { font-size: 11px; padding: 1px 8px; border-radius: 999px; }
.lv-must { background: #fee2e2; color: #991b1b; }
.lv-should { background: #ffedd5; color: #9a3412; }
.map-projects { margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.55; }
.map-projects li { margin-bottom: 4px; }

.role { padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; }
.role-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
.role-projects { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.mini-label { font-size: 11px; color: #64748b; margin-right: 4px; }
.samples { margin: 8px 0 0; padding-left: 18px; color: #64748b; font-size: 12px; }

.plan {
  display: flex; gap: 10px; padding: 12px; border: 1px solid #ede9fe;
  border-radius: 10px; margin-bottom: 8px; background: #faf5ff;
}
.prio {
  flex-shrink: 0; height: fit-content; padding: 2px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
}
.prio-P0 { background: #fee2e2; color: #991b1b; }
.prio-P1 { background: #ffedd5; color: #9a3412; }
.prio-P2 { background: #f1f5f9; color: #64748b; }
.plan-title { font-weight: 600; margin-bottom: 2px; }
.plan-title small { font-weight: 400; color: #64748b; }
.plan-reason { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.plan-action { font-size: 13px; color: #334155; margin-bottom: 6px; }
.plan-projects { display: flex; flex-wrap: wrap; gap: 6px; }

.project-tag {
  display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 6px;
  background: #dbeafe; color: #1e40af; max-width: 100%;
}
.empty { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; }
</style>
