// Re-export shared job utilities for Vercel serverless functions
export {
  fetchAndScoreJobs,
  cleanJob,
  clusterJobsBySkills,
  getProjectsForSkill,
  PRACTICE_PROJECTS,
} from '../lib/jobs.mjs';
