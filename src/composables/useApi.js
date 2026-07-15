import { ref } from 'vue'

const API_BASE = '/api'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)
  const refreshing = ref(false)

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const r = await fetch(`${API_BASE}/data`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      data.value = json.data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function refreshAnalysis() {
    refreshing.value = true
    error.value = null
    try {
      const r = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobCount: 30 }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const json = await r.json()
      if (json.ok) {
        data.value = {
          ...json.analysis,
          analyzed_jobs: json.jobs,
          total_jobs: json.total_jobs,
          last_updated: new Date().toISOString(),
        }
      } else {
        throw new Error(json.error || '分析失败')
      }
    } catch (e) {
      error.value = e.message
    } finally {
      refreshing.value = false
    }
  }

  return { loading, error, data, refreshing, fetchData, refreshAnalysis }
}
