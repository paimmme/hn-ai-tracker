import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(process.cwd(), 'skills', 'data.json');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
