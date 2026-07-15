import { fetchAndScoreJobs, cleanJob } from './_lib.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const jobs = await fetchAndScoreJobs();
    const cleaned = jobs.map(cleanJob);
    return res.status(200).json({ jobs: cleaned, total: cleaned.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
