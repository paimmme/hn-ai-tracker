<script setup>
defineProps({
  cluster: { type: Object, default: null },
})
</script>

<template>
  <div v-if="cluster" class="card">
    <div class="card-title">📊 JD 共性聚类</div>
    <div class="card-sub">
      基于 {{ cluster.total_jobs || 0 }} 个岗位的技能关键词覆盖率 · 用于专项学习聚焦
    </div>

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
        <ul class="samples">
          <li v-for="(j, i) in r.sample_jobs" :key="i">{{ j.company }} · {{ j.title }}</li>
        </ul>
      </div>
    </section>

    <section v-if="cluster.focus_plan?.length" class="block">
      <h3>专项学习计划</h3>
      <div v-for="(p, i) in cluster.focus_plan" :key="i" class="plan">
        <span :class="['prio', 'prio-' + p.priority]">{{ p.priority }}</span>
        <div>
          <div class="plan-title">{{ p.skill }}</div>
          <div class="plan-reason">{{ p.reason }}</div>
          <div class="plan-action">{{ p.action }}</div>
        </div>
      </div>
    </section>
  </div>
  <div v-else class="card">
    <div class="card-title">📊 JD 共性聚类</div>
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
.role { padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; }
.role-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
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
.plan-reason { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.plan-action { font-size: 13px; color: #334155; }
.empty { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; }
</style>
