import jwt from 'jsonwebtoken';

if (!process.env.SESSION_JWT_SECRET) {
  throw new Error('SESSION_JWT_SECRET is required');
}

const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET;
const SESSION_EXPIRY = '2h';

export interface SessionPayload {
  uid: string;
  name: string;
}

/**
 * Issue a short-lived session JWT for Unity clients
 */
export function issueSessionJWT(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_JWT_SECRET, {
    expiresIn: SESSION_EXPIRY,
    issuer: 'whop-unity-oauth',
  });
}

/**
 * Verify and decode session JWT
 * Throws on invalid/expired token
 */
export function verifySessionJWT(token: string): SessionPayload {
  try {
    const decoded = jwt.verify(token, SESSION_JWT_SECRET, {
      issuer: 'whop-unity-oauth',
    }) as SessionPayload;
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired session token');
  }
}

/**
 * Get token expiry time (in seconds from now)
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return decoded.exp - Math.floor(Date.now() / 1000);
    }
    return null;
  } catch {
    return null;
  }
}

