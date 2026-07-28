import { ref } from 'vue'

const API_BASE = '/api'

function authHeaders() {
  const key = import.meta.env.VITE_ANALYZE_API_KEY || ''
  const headers = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`
  return headers
}

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
        headers: authHeaders(),
        body: JSON.stringify({ jobCount: 30 }),
      })
      const json = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
      if (json.ok) {
        data.value = {
          ...json.analysis,
          cluster: json.cluster,
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
