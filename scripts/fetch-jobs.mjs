// Re-export shared job fetcher for CLI / Actions scripts
export {
  fetchJobs,
  fetchAndScoreJobs,
  cleanJob,
  clusterJobsBySkills,
  getProjectsForSkill,
  PRACTICE_PROJECTS,
} from '../lib/jobs.mjs';
