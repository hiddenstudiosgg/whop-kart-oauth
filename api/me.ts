import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionJWT } from '../src/lib/session';
import { jsonError, jsonOK, extractBearerToken } from '../src/lib/http';
import { applyCors, handleCorsPreFlight } from '../src/lib/cors';

/**
 * GET /api/me
 * Returns user information from the session JWT
 * Requires Authorization: Bearer <session_token>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (handleCorsPreFlight(req, res)) {
    return;
  }

  // Apply CORS for actual request
  applyCors(req, res);

  if (req.method !== 'GET') {
    return jsonError(res, 405, 'Method not allowed');
  }

  try {
    // Extract Bearer token from Authorization header
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return jsonError(res, 401, 'Missing or invalid Authorization header');
    }

    // Verify JWT and extract user info
    const payload = verifySessionJWT(token);

    return jsonOK(res, {
      id: payload.uid,
      name: payload.name,
    });
  } catch (error: any) {
    console.error('Me endpoint error:', error);
    return jsonError(res, 401, 'Invalid or expired session token');
  }
}

