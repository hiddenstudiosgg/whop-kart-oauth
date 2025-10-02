import type { VercelResponse } from '@vercel/node';

/**
 * Send JSON success response
 */
export function jsonOK(res: VercelResponse, data: any, statusCode = 200) {
  return res.status(statusCode).json(data);
}

/**
 * Send JSON error response
 */
export function jsonError(
  res: VercelResponse,
  statusCode: number,
  message: string,
  detail?: any
) {
  return res.status(statusCode).json({
    error: message,
    ...(detail && { detail }),
  });
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

