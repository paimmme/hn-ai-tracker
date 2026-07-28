import { readFileSync } from 'fs';
import { join } from 'path';
import { allowCors } from '../lib/auth.mjs';

const DATA_PATH = join(process.cwd(), 'skills', 'data.json');

export default async function handler(req, res) {
  allowCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const raw = readFileSync(DATA_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(200).json({ ok: true, data: null, notice: 'No cached data yet. Run analysis first.' });
  }
}
