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
    // Capture loopback parameters from query
    const mode = req.query.mode as string | undefined;
    const port = req.query.port as string | undefined;
    
    console.log('📥 Loopback params:', { mode, port });
    
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
    const cookies = [
      serialize('w_state', ourState, {
        httpOnly: true,
        secure: false, // Allow in local HTTP
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes
      })
    ];
    
    // Store loopback params in cookies if provided
    if (mode) {
      cookies.push(serialize('w_mode', mode, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      }));
    }
    
    if (port) {
      cookies.push(serialize('w_port', port, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      }));
    }
    
    console.log('🔐 Setting CSRF state cookie:', ourState);
    console.log('📍 Redirecting to:', finalUrl);
    
    res.setHeader('Set-Cookie', cookies);
    res.setHeader('Location', finalUrl);
    return res.status(302).end();
  } catch (error: any) {
    console.error('OAuth init error:', error);
    return jsonError(res, 500, 'Failed to initialize OAuth', error.message);
  }
}

