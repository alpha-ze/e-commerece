import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

/**
 * verifyJWT middleware
 *
 * Extracts a Bearer token from the Authorization header, verifies it with
 * JWT_SECRET, and attaches the decoded payload to `req.user`.
 *
 * Responds with 401 and never calls next() if:
 *   - The Authorization header is missing or not a Bearer token
 *   - The token is invalid (bad signature, malformed, etc.)
 *   - The token is expired
 *
 * Validates: Requirements 4.1, 4.4
 */
export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Please provide a valid token.' },
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Please provide a valid token.' },
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    // Covers TokenExpiredError, JsonWebTokenError, NotBeforeError, etc.
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token. Please log in again.' },
    });
  }
}

/**
 * requireRole middleware factory
 *
 * Returns an Express middleware that enforces role-based access control.
 * Must be used AFTER verifyJWT (req.user must already be set).
 *
 * - If req.user is missing (verifyJWT was skipped): responds 401
 * - If req.user.role is not in the allowed roles: responds 403
 * - Otherwise: calls next()
 *
 * @param roles - One or more roles permitted to access the route
 *
 * Validates: Requirements 4.2, 4.3
 */
export function requireRole(...roles: Array<'customer' | 'admin'>) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required. Please provide a valid token.' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { message: 'You do not have permission to access this resource.' },
      });
      return;
    }

    next();
  };
}
