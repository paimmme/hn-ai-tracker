// Shared auth + CORS for serverless API routes

export function allowCors(res, methods = 'GET, POST, OPTIONS') {
  // Only set CORS when ALLOWED_ORIGIN is explicitly configured
  const origin = process.env.ALLOWED_ORIGIN || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
}

/**
 * Require API key via Authorization: Bearer <key> or X-Api-Key header.
 * Query-string keys are NOT accepted (avoid leaking via logs / Referer).
 */
export function requireApiKey(req, res) {
  const expected = process.env.ANALYZE_API_KEY || process.env.API_SECRET || '';

  if (!expected) {
    // Production: refuse open analyze endpoint
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'ANALYZE_API_KEY not configured — public analyze disabled' });
      return false;
    }
    // Local / preview without key: allow
    return true;
  }

  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const apiKey = req.headers?.['x-api-key'] || req.headers?.['X-Api-Key'] || '';
  const provided = bearer || apiKey || '';

  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
