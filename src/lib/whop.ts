import { WhopServerSdk } from '@whop/api';

export const whopSdk = WhopServerSdk({
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID ?? "fallback",
  appApiKey: process.env.WHOP_API_KEY ?? "fallback",
});

export const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || '';
const OAUTH_REDIRECT_URI_ORIGINAL = process.env.OAUTH_REDIRECT_URI;

/**
 * Get Whop OAuth authorization URL with state
 */
export async function getAuthorizationUrl() {
  const result = await whopSdk.oauth.getAuthorizationUrl({
    redirectUri: OAUTH_REDIRECT_URI,
    scope: ['read_user'],
  });
  
  return result;
}

/**
 * Exchange OAuth code for access tokens
 */
export async function exchangeCodeForTokens(code: string) {
  console.log('🔧 Calling whop.oauth.exchangeCode with:', {
    code: code.substring(0, 20) + '...',
    redirectUri: OAUTH_REDIRECT_URI,
  });
  
  const result = await whopSdk.oauth.exchangeCode({
    code,
    redirectUri: OAUTH_REDIRECT_URI,
  });
  
  console.log('📦 Exchange result ok?', result.ok);

  if (!result.ok) {
    console.error('❌ Token exchange failed:', {
      status: result.code,
    });
    throw new Error('Failed to exchange code for tokens');
  }

  console.log('✅ Token exchange successful');

  return result.tokens;
}

/**
 * Get user information from Whop using OAuth access token
 * This verifies the token and fetches the authenticated user's public profile.
 * 
 * IMPORTANT: We must use getUser() with the userId, NOT getCurrentUser()
 * - getCurrentUser() returns the app owner (agent) when using server SDK
 * - getUser() returns the actual OAuth-authenticated user's profile
 */
export async function getMe(accessToken: string) {
  // Step 1: Verify the OAuth access token and extract the user ID
  console.log('🔐 Verifying OAuth access token...');
  const payload = await whopSdk.verifyUserToken(accessToken);

  if (!payload?.userId) {
    throw new Error('Failed to verify Whop user token');
  }

  console.log('✅ Token verified, user ID:', payload.userId);
  console.log('🔐 Full token payload:', payload);

  // Step 2: Fetch the authenticated user's public profile using their ID
  // This uses the app's API key to query Whop's API for the user's public info
  console.log('📡 Fetching user profile for ID:', payload.userId);
  const user = await whopSdk.users.getUser({ userId: payload.userId });

  if (!user) {
    throw new Error('Failed to fetch user information from Whop');
  }
  
  // DEBUG: Log all user data from Whop
  console.log('🔍 RAW USER DATA FROM WHOP:');
  console.log('  ID:', user.id);
  console.log('  name:', user.name);
  console.log('  username:', user.username);
  console.log('  Full user object:', JSON.stringify(user, null, 2));
  
  return {
    id: user.id,
    name: user.name || user.username || 'Unknown',
  };
}

