<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ jobs: { type: Array, default: () => [] } })

const search = ref('')
const sortKey = ref('score')
const sortDir = ref(-1)

const filtered = computed(() => {
  let list = [...(props.jobs || [])]
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(j => (j.company || '').toLowerCase().includes(q) || (j.title || '').toLowerCase().includes(q))
  }
  list.sort((a, b) => {
    const va = a[sortKey.value] ?? ''
    const vb = b[sortKey.value] ?? ''
    if (typeof va === 'string') return sortDir.value * va.localeCompare(vb, 'zh')
    return sortDir.value * (va - vb)
  })
  return list
})

function toggleSort(key) {
  if (sortKey.value === key) sortDir.value *= -1
  else { sortKey.value = key; sortDir.value = -1 }
}
</script>

<template>
  <div class="card">
    <div class="card-title">📋 岗位探索</div>
    <div class="card-sub">{{ jobs.length }} 个岗位，支持搜索和排序</div>

    <input v-model="search" class="search" placeholder="搜索公司或岗位名称..." />

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:30%">公司</th>
            <th style="width:30%">岗位</th>
            <th style="width:15%">地点</th>
            <th style="width:15%">学历</th>
            <th style="width:10%">匹配</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in filtered" :key="j.job_id + '-' + j.title">
            <td>{{ j.company }}</td>
            <td>
              <div class="job-title">{{ j.title }}</div>
              <div v-if="j.advantage_notes?.length" class="adv-badge">
                ⭐ {{ j.advantage_notes[0] }}
              </div>
            </td>
            <td class="cell-sub">{{ j.location }}</td>
            <td class="cell-sub">{{ j.education }}</td>
            <td>
              <span :class="['score', j.score >= 80 ? 'score-high' : j.score >= 60 ? 'score-mid' : 'score-low']">
                {{ j.score ?? '-' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="filtered.length === 0" class="empty">无匹配岗位</div>
  </div>
</template>

<style scoped>
.search {
  width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; margin-bottom: 16px; outline: none; transition: border .2s;
}
.search:focus { border-color: #1e40af; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; padding: 8px 6px; background: #f8fafc; font-weight: 600; border-bottom: 2px solid #e2e8f0; white-space: nowrap; cursor: pointer; user-select: none; }
.table th:hover { color: #1e40af; }
.table td { padding: 10px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.table tr:hover td { background: #f8fafc; }
.job-title { font-weight: 500; }
.cell-sub { color: #64748b; font-size: 12px; }
.adv-badge { font-size: 11px; color: #b45309; margin-top: 2px; }
.score { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
.score-high { background: #d1fae5; color: #065f46; }
.score-mid { background: #fef3c7; color: #92400e; }
.score-low { background: #f1f5f9; color: #64748b; }
.empty { text-align: center; padding: 20px; color: #94a3b8; }
</style>
