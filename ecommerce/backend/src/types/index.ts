// Shared TypeScript types for the e-commerce backend

/**
 * JWT payload shape attached to authenticated requests.
 */
export interface JwtPayload {
  id: number;
  email: string;
  role: 'customer' | 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Standard API response envelope.
 * All endpoints return this shape.
 */
export type ApiResponse<T = unknown> =
  | { success: true; data: T; pagination?: PaginationMeta }
  | { success: false; error: { message: string; fields?: string[] } };

/**
 * Pagination metadata included on paginated list responses.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Extends Express Request to carry the authenticated user payload.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
