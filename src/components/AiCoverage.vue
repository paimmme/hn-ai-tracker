<script setup>
defineProps({ coverage: { type: Array, default: () => [] } })
</script>

<template>
  <div class="card">
    <div class="card-title">🤖 AI 赋能分析</div>
    <div class="card-sub">最新 AI 技术如何覆盖岗位能力需求</div>

    <div class="grid">
      <div v-for="item in coverage" :key="item.skill_needed" class="cov-item">
        <h4 class="cov-title">{{ item.skill_needed }}</h4>
        <div class="cov-row">
          <span class="cov-label">AI 覆盖</span>
          <span class="cov-val">{{ item.how_ai_covers }}</span>
        </div>
        <div class="cov-row">
          <span class="cov-label">学习</span>
          <span class="cov-val">{{ item.learn }}</span>
        </div>
        <div class="cov-row">
          <span class="cov-label">项目</span>
          <span class="cov-val">{{ item.project }}</span>
        </div>
      </div>
    </div>

    <div v-if="coverage.length === 0" class="empty">暂无数据</div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
.cov-item { padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
.cov-title { font-size: 14px; font-weight: 600; color: #1e40af; margin-bottom: 8px; }
.cov-row { margin-bottom: 6px; }
.cov-row:last-child { margin-bottom: 0; }
.cov-label { display: inline-block; font-size: 11px; font-weight: 600; color: #64748b; width: 40px; flex-shrink: 0; }
.cov-val { font-size: 13px; color: #334155; }
.empty { text-align: center; padding: 20px; color: #94a3b8; }
</style>
