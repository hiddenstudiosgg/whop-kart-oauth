import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionJWT } from '../../src/lib/session.js';
import { checkExperienceAccess } from '../../src/lib/whop.js';
import { jsonError, jsonOK, extractBearerToken } from '../../src/lib/http.js';
import { applyCors, handleCorsPreFlight } from '../../src/lib/cors.js';

/**
 * GET/POST /api/access/check
 * Checks if the authenticated user has access to a specific Whop experience
 * 
 * Required: Authorization: Bearer <session_token>
 * Required: experienceId (from query params for GET, or body for POST)
 * 
 * Returns: { hasAccess, accessLevel, userId, experienceId }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (handleCorsPreFlight(req, res)) {
    return;
  }

  // Apply CORS for actual request
  applyCors(req, res);

  // Support both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use GET or POST.');
  }

  try {
    // Extract Bearer token from Authorization header
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return jsonError(res, 401, 'Missing or invalid Authorization header');
    }

    // Verify JWT and extract user info
    const payload = verifySessionJWT(token);
    const userId = payload.uid;

    console.log('🔐 Authenticated user:', { userId, name: payload.name });

    // Extract experienceId from query params (GET) or body (POST)
    let experienceId: string | undefined;

    if (req.method === 'GET') {
      experienceId = req.query.experienceId as string | undefined;
    } else if (req.method === 'POST') {
      // Handle both JSON body and query params for POST
      experienceId = req.body?.experienceId || (req.query.experienceId as string | undefined);
    }

    // Validate experienceId
    if (!experienceId || typeof experienceId !== 'string') {
      return jsonError(
        res,
        400,
        'Missing required parameter: experienceId',
        {
          hint: 'For GET: /api/access/check?experienceId=exp_XXX',
          hint2: 'For POST: {"experienceId": "exp_XXX"}',
        }
      );
    }

    // Basic format validation for experienceId
    if (!experienceId.startsWith('exp_')) {
      return jsonError(
        res,
        400,
        'Invalid experienceId format. Must start with "exp_"',
        { provided: experienceId }
      );
    }

    console.log('📋 Access check request:', { userId, experienceId });

    // Check access using Whop SDK
    const accessResult = await checkExperienceAccess(userId, experienceId);

    // Return successful response
    return jsonOK(res, {
      hasAccess: accessResult.hasAccess,
      accessLevel: accessResult.accessLevel,
      userId,
      experienceId,
    });
  } catch (error: any) {
    console.error('Access check endpoint error:', error);

    // Handle JWT verification errors
    if (error.message?.includes('Invalid or expired session token')) {
      return jsonError(res, 401, 'Invalid or expired session token');
    }

    // Handle Whop API errors
    if (error.message?.includes('Whop access check failed')) {
      return jsonError(
        res,
        502,
        'Failed to verify access with Whop',
        { detail: error.message }
      );
    }

    // Generic error
    return jsonError(
      res,
      500,
      'Failed to check experience access',
      { detail: error.message }
    );
  }
}

