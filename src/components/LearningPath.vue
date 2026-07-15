<script setup>
defineProps({ path: { type: Array, default: () => [] } })

function prioClass(p) {
  if (!p) return 'p2'
  const s = p.toLowerCase()
  if (s === 'p0') return 'p0'
  if (s === 'p1') return 'p1'
  return 'p2'
}
</script>

<template>
  <div class="card">
    <div class="card-title">🎯 学习路线</div>
    <div class="card-sub">按优先级排序的补强计划</div>

    <div v-for="item in path" :key="item.topic" :class="['path-item', prioClass(item.priority)]">
      <div class="prio-badge">{{ item.priority }}</div>
      <div class="path-body">
        <h4>{{ item.topic }}</h4>
        <p class="path-why">{{ item.reason }}</p>
        <p class="path-how">{{ item.approach }}</p>
        <div v-if="item.projects?.length" class="projects">
          <span v-for="p in item.projects" :key="p" class="project-tag">{{ p }}</span>
        </div>
      </div>
    </div>

    <div v-if="path.length === 0" class="empty">暂无数据</div>
  </div>
</template>

<style scoped>
.path-item {
  display: flex; gap: 16px; padding: 16px; border-radius: 8px;
  margin-bottom: 12px; align-items: flex-start;
}
.path-item.p0 { background: linear-gradient(135deg, #fef2f2, #fff); border: 1px solid #fecaca; }
.path-item.p1 { background: linear-gradient(135deg, #fff7ed, #fff); border: 1px solid #fed7aa; }
.path-item.p2 { background: linear-gradient(135deg, #f0fdf4, #fff); border: 1px solid #bbf7d0; }
.path-item:last-child { margin-bottom: 0; }

.prio-badge {
  flex-shrink: 0; width: 44px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
}
.p0 .prio-badge { background: #e11d48; }
.p1 .prio-badge { background: #d97706; }
.p2 .prio-badge { background: #059669; }

.path-body { flex: 1; min-width: 0; }
.path-body h4 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.path-why { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.path-how { font-size: 13px; color: #334155; margin-bottom: 6px; }
.projects { display: flex; flex-wrap: wrap; gap: 6px; }
.project-tag {
  font-size: 12px; padding: 3px 10px; border-radius: 4px;
  background: #dbeafe; color: #1e40af;
}
.empty { text-align: center; padding: 20px; color: #94a3b8; }
</style>
