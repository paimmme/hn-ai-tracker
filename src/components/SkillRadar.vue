<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({ tree: { type: Array, default: () => [] } })

const canvas = ref(null)
let chart = null

const chartData = computed(() => {
  const categories = props.tree || []
  return {
    labels: categories.map(c => c.category?.slice(0, 8) || ''),
    datasets: [{
      label: '必备',
      data: categories.map(c => (c.items || []).filter(s => s.importance === '必备').length),
      backgroundColor: 'rgba(153,27,27,.1)',
      borderColor: '#991b1b',
      borderWidth: 2,
      pointBackgroundColor: '#991b1b',
    }, {
      label: '重要',
      data: categories.map(c => (c.items || []).filter(s => s.importance === '重要').length),
      backgroundColor: 'rgba(154,52,18,.1)',
      borderColor: '#9a3412',
      borderWidth: 2,
      pointBackgroundColor: '#9a3412',
    }, {
      label: '推荐',
      data: categories.map(c => (c.items || []).filter(s => s.importance === '推荐').length),
      backgroundColor: 'rgba(6,95,70,.1)',
      borderColor: '#065f46',
      borderWidth: 2,
      pointBackgroundColor: '#065f46',
    }],
  }
})

function renderChart() {
  if (chart) { chart.destroy(); chart = null }
  if (!canvas.value) return
  chart = new Chart(canvas.value, {
    type: 'radar',
    data: chartData.value,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        r: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
          pointLabels: { font: { size: 12, weight: '500' } },
        },
      },
    },
  })
}

watch(() => props.tree, renderChart, { deep: true })
onMounted(renderChart)
onUnmounted(() => { if (chart) chart.destroy() })
</script>

<template>
  <div class="card">
    <div class="card-title">📊 能力雷达</div>
    <div class="card-sub">各维度不同重要程度的技能数量分布</div>
    <div class="chart-wrap">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
.chart-wrap {
  max-width: 480px; margin: 0 auto;
  display: flex; justify-content: center;
}
</style>
