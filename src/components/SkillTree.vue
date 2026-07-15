<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ tree: { type: Array, default: () => [] } })

const impFilter = ref(null) // null = all, '必备', '重要', '推荐'

const categories = computed(() => {
  if (!impFilter.value) return props.tree
  return props.tree.map(cat => ({
    ...cat,
    items: (cat.items || []).filter(s => s.importance === impFilter.value),
  })).filter(cat => cat.items.length > 0)
})
</script>

<template>
  <div class="card">
    <div class="card-title">🌳 能力树</div>
    <div class="card-sub">岗位共同要求的能力维度，按类别展开。点击标签筛选优先级。</div>

    <div class="filters">
      <span
        :class="['filter-chip', { active: impFilter === null }]"
        @click="impFilter = null"
      >全部</span>
      <span
        :class="['filter-chip', 'chip-required', { active: impFilter === '必备' }]"
        @click="impFilter = '必备'"
      >必备</span>
      <span
        :class="['filter-chip', 'chip-important', { active: impFilter === '重要' }]"
        @click="impFilter = '重要'"
      >重要</span>
      <span
        :class="['filter-chip', 'chip-recommended', { active: impFilter === '推荐' }]"
        @click="impFilter = '推荐'"
      >推荐</span>
    </div>

    <div v-for="cat in categories" :key="cat.category" class="cat">
      <h3 class="cat-title">{{ cat.category }}</h3>
      <p class="cat-desc">{{ cat.description }}</p>
      <div class="skills">
        <span
          v-for="s in cat.items"
          :key="s.skill"
          :class="['tag', s.importance === '必备' ? 'tag-required' : s.importance === '重要' ? 'tag-important' : 'tag-recommended']"
          :title="s.reason"
        >
          {{ s.skill }}
          <small>{{ s.importance }}</small>
        </span>
      </div>
    </div>

    <div v-if="categories.length === 0" class="empty">暂无匹配的能力项</div>
  </div>
</template>

<style scoped>
.filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-chip {
  padding: 4px 14px; border-radius: 20px; font-size: 13px; cursor: pointer;
  border: 1px solid #e2e8f0; transition: all .2s; user-select: none;
}
.filter-chip:hover { border-color: #94a3b8; }
.filter-chip.active { border-color: #1e40af; background: #dbeafe; color: #1e40af; font-weight: 600; }
.chip-required.active { border-color: #991b1b; background: #fef2f2; color: #991b1b; }
.chip-important.active { border-color: #9a3412; background: #fff7ed; color: #9a3412; }
.chip-recommended.active { border-color: #065f46; background: #f0fdf4; color: #065f46; }

.cat { margin-bottom: 20px; }
.cat:last-child { margin-bottom: 0; }
.cat-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; color: #1e293b; }
.cat-desc { font-size: 13px; color: #64748b; margin-bottom: 8px; }
.skills { display: flex; flex-wrap: wrap; gap: 2px; }
.tag small { margin-left: 4px; opacity: .7; font-weight: 400; }
.empty { text-align: center; padding: 20px; color: #94a3b8; font-size: 14px; }
</style>
