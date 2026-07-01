import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Shape of errors that carry an explicit HTTP status code.
 */
interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Global Express error-handling middleware.
 * Must be registered LAST (after all routes).
 *
 * Behaviour:
 * - ZodError  → 400 with structured field errors
 * - HttpError → uses error.status / error.statusCode
 * - Anything else → 500
 * - Stack traces are only included in development
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV === 'development';

  // ── ZodError: validation failure ─────────────────────────────────────────
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        fields,
      },
    });
    return;
  }

  // ── Generic / HttpError ───────────────────────────────────────────────────
  const httpErr = err as HttpError;
  const status = httpErr?.status ?? httpErr?.statusCode ?? 500;
  const message = httpErr?.message ?? 'Internal server error';

  // Log to stderr (never log sensitive data in production)
  if (isDev) {
    console.error('[errorHandler]', err);
  } else {
    console.error('[errorHandler]', message);
  }

  const body: Record<string, unknown> = {
    success: false,
    error: {
      message,
      ...(isDev && httpErr?.stack ? { stack: httpErr.stack } : {}),
    },
  };

  res.status(status).json(body);
}
