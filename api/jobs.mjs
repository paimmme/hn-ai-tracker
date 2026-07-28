import { fetchAndScoreJobs, cleanJob, clusterJobsBySkills } from './_lib.mjs';
import { allowCors } from '../lib/auth.mjs';
import { cached } from '../lib/cache.mjs';

// 10 分钟内存缓存，降低国聘 API 刷取压力
const JOBS_TTL_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  allowCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = await cached('jobs:scored', JOBS_TTL_MS, async () => {
      const jobs = await fetchAndScoreJobs();
      const cleaned = jobs.map(cleanJob);
      const cluster = clusterJobsBySkills(cleaned);
      return {
        jobs: cleaned,
        total: cleaned.length,
        cluster,
        cached_at: new Date().toISOString(),
        ttl_seconds: JOBS_TTL_MS / 1000,
      };
    });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=60');
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
