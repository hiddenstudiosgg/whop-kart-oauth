import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse, serialize } from 'cookie';
import { exchangeCodeForTokens, getMe } from '../../src/lib/whop.js';
import { issueSessionJWT } from '../../src/lib/session.js';
import { jsonError, jsonOK } from '../../src/lib/http.js';
import { generateLoopbackHTML } from '../../src/lib/html.js';

/**
 * GET /api/oauth/callback?code=...&state=...
 * Handles OAuth callback from Whop, exchanges code for tokens, and issues session JWT
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return jsonError(res, 405, 'Method not allowed');
  }

  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return jsonError(res, 400, 'Missing authorization code');
    }

    if (!state || typeof state !== 'string') {
      return jsonError(res, 400, 'Missing state parameter');
    }

    // Parse cookies and verify CSRF state
    console.log('🍪 Received cookies:', req.headers.cookie);
    const cookies = parse(req.headers.cookie || '');
    console.log('🔍 Parsed cookies:', cookies);
    const ourState = cookies.w_state;
    console.log('🔐 CSRF state from cookie:', ourState);
    console.log('📝 State from URL:', state);

    if (!ourState) {
      console.error('❌ Missing state cookie! All cookies:', cookies);
      return jsonError(res, 400, 'Missing state cookie (CSRF check failed)');
    }

    // Split combined state (whopState:ourState)
    const stateParts = state.split(':');
    if (stateParts.length !== 2) {
      return jsonError(res, 400, 'Invalid state format');
    }

    const [, receivedOurState] = stateParts;

    if (receivedOurState !== ourState) {
      return jsonError(res, 400, 'State mismatch (CSRF check failed)');
    }

    // Exchange code for access token
    console.log('🔄 Exchanging code for tokens...');
    console.log('📝 Code:', code.substring(0, 20) + '...');
    const tokens = await exchangeCodeForTokens(code);
    console.log('🎫 Received tokens:', {
      access_token: tokens.access_token?.substring(0, 20) + '...',
    });

    if (!tokens.access_token) {
      return jsonError(res, 500, 'Failed to obtain access token');
    }

    // Fetch user info from Whop
    console.log('👤 Fetching user info with access token...');
    const user = await getMe(tokens.access_token);
    console.log('✅ User fetched:', { id: user.id, name: user.name });

    // Issue our own short-lived session JWT (Unity will store this)
    const sessionToken = issueSessionJWT({
      uid: user.id,
      name: user.name,
    });

    // Clear the CSRF state cookie
    const clearCookie = serialize('w_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    res.setHeader('Set-Cookie', clearCookie);

    // Prepare response data
    const responseData = {
      session_token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
      },
    };

    // Check if loopback mode is requested (from query params OR cookies)
    let mode = req.query.mode as string | undefined;
    let port = req.query.port as string | undefined;
    
    // If not in query params, check cookies (from init)
    if (!mode) {
      mode = cookies.w_mode;
    }
    if (!port) {
      port = cookies.w_port;
    }
    
    console.log('🔍 Loopback check:', { mode, port });

    if (mode === 'loopback' && port) {
      console.log('🔄 Returning loopback HTML for Unity');
      // Clear all cookies
      const clearCookies = [
        clearCookie,
        serialize('w_mode', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        }),
        serialize('w_port', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0,
        }),
      ];
      res.setHeader('Set-Cookie', clearCookies);
      
      // Return HTML page that POSTs to Unity's local listener
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(generateLoopbackHTML(responseData, port));
    }

    // Default: return JSON response
    console.log('📄 Returning JSON response');
    return jsonOK(res, responseData);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return jsonError(res, 500, 'OAuth callback failed', error.message);
  }
}

