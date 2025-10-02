import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jsonOK } from '../src/lib/http.js';

/**
 * GET /api/health
 * Simple health check endpoint for monitoring and uptime checks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return jsonOK(res, {
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

