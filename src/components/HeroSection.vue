<script setup>
defineProps({ data: Object, loading: Boolean, refreshing: Boolean, error: String })
defineEmits(['refresh'])

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <header class="hero">
    <div class="hero-text">
      <h1>🔧 AI 技能分析报告</h1>
      <p class="hero-desc">基于国企校招岗位的能力需求分析 · 管科/信管求职指南</p>
      <div class="hero-meta">
        <span v-if="data?.total_jobs">📦 {{ data.total_jobs }} 个岗位</span>
        <span v-if="data?.last_updated">🕐 {{ fmtDate(data.last_updated) }}</span>
        <span v-if="data?.skill_tree?.length">🌳 {{ data.skill_tree.length }} 个能力维度</span>
      </div>
    </div>
    <div class="hero-actions">
      <button class="btn btn-primary" :disabled="refreshing" @click="$emit('refresh')">
        <span v-if="refreshing" class="spinner-sm"></span>
        <span v-else>🔄</span>
        {{ refreshing ? '分析中...' : '刷新分析' }}
      </button>
    </div>
  </header>

  <div v-if="error" class="error-banner">{{ error }}</div>
</template>

<style scoped>
.hero {
  background: linear-gradient(135deg, #1e3a5f, #1e40af, #059669);
  color: #fff; border-radius: 12px; padding: 32px; margin-bottom: 20px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
}
.hero-text { flex: 1; }
.hero h1 { font-size: 26px; margin-bottom: 6px; }
.hero-desc { font-size: 14px; opacity: .85; margin-bottom: 10px; }
.hero-meta { display: flex; gap: 16px; font-size: 12px; opacity: .7; flex-wrap: wrap; }
.hero-actions { flex-shrink: 0; }
.spinner-sm {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-banner {
  background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
  padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;
}
</style>
