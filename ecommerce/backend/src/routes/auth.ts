import { Router } from 'express';
import { authRateLimiter } from '../middleware';
import { register, login, forgotPasswordHandler, resetPasswordHandler } from '../controllers/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Rate-limited to 100 req / 15 min / IP (authRateLimiter).
 */
router.post('/register', authRateLimiter, register);

/**
 * POST /api/auth/login
 * Rate-limited to 100 req / 15 min / IP (authRateLimiter).
 */
router.post('/login', authRateLimiter, login);

/**
 * POST /api/auth/forgot-password
 * Rate-limited. Always returns 200 — never reveals whether email is registered.
 */
router.post('/forgot-password', authRateLimiter, forgotPasswordHandler);

/**
 * POST /api/auth/reset-password/:token
 * Rate-limited. Returns 400 for invalid/expired token, 200 on success.
 */
router.post('/reset-password/:token', authRateLimiter, resetPasswordHandler);

export default router;
