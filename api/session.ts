import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionJWT, getTokenExpiry } from '../src/lib/session.js';
import { jsonError, jsonOK, extractBearerToken } from '../src/lib/http.js';
import { applyCors, handleCorsPreFlight } from '../src/lib/cors.js';

/**
 * GET /api/session
 * Validates session token and returns expiry information
 * Useful for Unity to verify cached tokens
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

    // Verify JWT (will throw if invalid/expired)
    const payload = verifySessionJWT(token);
    
    // Get remaining time until expiry
    const expiresIn = getTokenExpiry(token);

    return jsonOK(res, {
      ok: true,
      valid: true,
      user: {
        id: payload.uid,
        name: payload.name,
      },
      expires_in: expiresIn, // seconds remaining
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    return jsonError(res, 401, 'Invalid or expired session token');
  }
}

