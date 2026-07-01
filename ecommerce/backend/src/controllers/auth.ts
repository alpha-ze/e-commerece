import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, forgotPassword, resetPassword } from '../services/auth';
import type { ApiResponse } from '../types';

/**
 * Zod schema for POST /api/auth/register.
 * - name:     non-empty string
 * - email:    valid e-mail format
 * - password: at least 8 characters
 */
const registerSchema = z.object({
  name: z.string({ required_error: 'name is required' }).min(1, 'name must not be empty'),
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address'),
  password: z
    .string({ required_error: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
});

/**
 * Zod schema for POST /api/auth/login.
 * - email:    valid e-mail format
 * - password: required, non-empty
 */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address'),
  password: z
    .string({ required_error: 'password is required' })
    .min(1, 'password is required'),
});

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email + password.
 * Returns 200 with a JWT and public user data on success.
 * Returns 401 for invalid credentials (same message for missing email or wrong password).
 * Returns 403 for deactivated accounts.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await loginUser({ email, password });

    const body: ApiResponse<{ token: string; user: typeof result.user }> = {
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
    };

    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate input — ZodError bubbles up to the global error handler as 400
    const { name, email, password } = registerSchema.parse(req.body);

    const result = await registerUser({ name, email, password });

    const body: ApiResponse<{ token: string; user: typeof result.user }> = {
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
    };

    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * Zod schema for POST /api/auth/forgot-password
 */
const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .email('email must be a valid email address'),
});

/**
 * Zod schema for POST /api/auth/reset-password/:token
 */
const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
});

/**
 * POST /api/auth/forgot-password
 *
 * Initiates a password-reset flow. Always returns 200 OK — the response body
 * never reveals whether the submitted email is registered (requirement 3.4).
 */
export async function forgotPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    await forgotPassword(email);

    const body: ApiResponse<{ message: string }> = {
      success: true,
      data: {
        message:
          'If that email is registered you will receive a password reset link shortly.',
      },
    };

    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password/:token
 *
 * Completes the password-reset flow.
 * Returns 400 if the token is invalid or expired.
 * Returns 200 on success.
 */
export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params;

    const { password } = resetPasswordSchema.parse(req.body);

    await resetPassword(token, password);

    const body: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Password has been reset successfully.' },
    };

    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}
