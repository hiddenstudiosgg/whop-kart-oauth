import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serialize } from 'cookie';
import crypto from 'crypto';
import { getAuthorizationUrl } from '../../src/lib/whop.js';
import { jsonError } from '../../src/lib/http.js';

/**
 * GET /api/oauth/init
 * Initiates OAuth flow by redirecting to Whop with a combined state parameter
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return jsonError(res, 405, 'Method not allowed');
  }

  try {
    // Generate our own CSRF state
    const ourState = crypto.randomBytes(16).toString('hex');
    
    // Get Whop's authorization URL
    const { url, state: whopState } = await getAuthorizationUrl();
    
    // Combine both states: whopState:ourState
    const stateCombined = `${whopState}:${ourState}`;
    
    // Replace the state parameter in the URL
    const finalUrl = url.replace(
      /state=[^&]+/,
      `state=${encodeURIComponent(stateCombined)}`
    );
    
    // Set HttpOnly cookie with our state for CSRF protection
    const cookie = serialize('w_state', ourState, {
      httpOnly: true,
      secure: false, // Allow in local HTTP
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });
    
    console.log('🔐 Setting CSRF state cookie:', ourState);
    console.log('📍 Redirecting to:', finalUrl);
    
    res.setHeader('Set-Cookie', cookie);
    res.setHeader('Location', finalUrl);
    return res.status(302).end();
  } catch (error: any) {
    console.error('OAuth init error:', error);
    return jsonError(res, 500, 'Failed to initialize OAuth', error.message);
  }
}

