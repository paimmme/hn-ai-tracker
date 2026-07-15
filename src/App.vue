<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from './composables/useApi.js'
import HeroSection from './components/HeroSection.vue'
import SkillTree from './components/SkillTree.vue'
import SkillRadar from './components/SkillRadar.vue'
import JobExplorer from './components/JobExplorer.vue'
import AiCoverage from './components/AiCoverage.vue'
import LearningPath from './components/LearningPath.vue'

const { loading, error, data, refreshing, fetchData, refreshAnalysis } = useApi()
const activeTab = ref('skill')

onMounted(() => fetchData())

const hasData = computed(() => data.value && data.value.skill_tree?.length)
</script>

<template>
  <div class="app">
    <HeroSection
      :data="data"
      :loading="loading"
      :refreshing="refreshing"
      :error="error"
      @refresh="refreshAnalysis"
    />

    <div v-if="loading && !data" class="loading-state">
      <div class="spinner"></div>
      <p>加载分析数据...</p>
    </div>

    <div v-else-if="hasData" class="main">
      <!-- Nav tabs -->
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </nav>

      <div class="content">
        <SkillTree v-show="activeTab === 'skill'" :tree="data.skill_tree" />
        <SkillRadar v-show="activeTab === 'radar'" :tree="data.skill_tree" />
        <JobExplorer v-show="activeTab === 'job'" :jobs="data.analyzed_jobs" />
        <AiCoverage v-show="activeTab === 'ai'" :coverage="data.ai_coverage" />
        <LearningPath v-show="activeTab === 'learn'" :path="data.learning_path" />
      </div>
    </div>

    <div v-else-if="!loading && !error && !data" class="empty-state">
      <p>暂无分析数据。点击上方「刷新分析」按钮生成。</p>
    </div>

    <footer class="footer">
      <p>数据来源：国聘网 · 分析模型：DeepSeek v4-flash · 西交管科 秋招备战</p>
    </footer>
  </div>
</template>

<script>
export default {
  data() {
    return {
      tabs: [
        { id: 'skill', label: '🌳 能力树' },
        { id: 'radar', label: '📊 能力雷达' },
        { id: 'job', label: '📋 岗位探索' },
        { id: 'ai', label: '🤖 AI 赋能' },
        { id: 'learn', label: '🎯 学习路线' },
      ]
    }
  }
}
</script>

<style>
/* Reset & base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", sans-serif;
  background: #f0f4f8; color: #1e293b; line-height: 1.6;
}
.app { max-width: 1024px; margin: 0 auto; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; }

/* Tabs */
.tabs { display: flex; gap: 4px; margin-bottom: 20px; overflow-x: auto; }
.tab {
  flex-shrink: 0; padding: 10px 18px; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s;
  background: #e2e8f0; color: #64748b;
}
.tab:hover { background: #cbd5e1; }
.tab.active { background: #1e40af; color: #fff; }

/* Content area */
.content { flex: 1; }

/* Loading */
.loading-state { text-align: center; padding: 80px 20px; color: #64748b; }
.spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #1e40af; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.empty-state { text-align: center; padding: 80px 20px; color: #64748b; }

/* Footer */
.footer { text-align: center; padding: 24px 0 8px; font-size: 12px; color: #94a3b8; }

/* Global utility classes used by components */
.card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.card-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.card-sub { font-size: 13px; color: #64748b; margin-bottom: 16px; }

.tag {
  display: inline-block; padding: 3px 10px; margin: 0 4px 6px 0;
  font-size: 12px; border-radius: 6px;
}
.tag-required { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.tag-important { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; }
.tag-recommended { background: #f0fdf4; color: #065f46; border: 1px solid #bbf7d0; }

.badge {
  display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
}
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-green { background: #d1fae5; color: #065f46; }

.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all .2s;
}
.btn-primary { background: #1e40af; color: #fff; }
.btn-primary:hover { background: #1e3a8a; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
</style>
