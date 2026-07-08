import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ApiResponse } from './types';
import { errorHandler } from './middleware';
import authRouter from './routes/auth';
import productRouter from './routes/product';
import cartRouter from './routes/cart';
import wishlistRouter from './routes/wishlist';
import profileRouter from './routes/profile';
import orderRouter from './routes/order';
import adminRouter from './routes/admin';
import categoriesRouter from './routes/categories';

const app = express();

// ── Core middleware ──────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS — allow only the configured frontend origin
// Validates: Requirements 19.1
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

// Parse JSON request bodies
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  const body: ApiResponse<{ status: string }> = {
    success: true,
    data: { status: 'ok' },
  };
  res.json(body);
});

// Lightweight ping — use this for keep-alive cron jobs (no DB, no middleware overhead)
app.get('/ping', (_req: Request, res: Response) => {
  res.status(200).send('pong');
});

// Auth routes (rate limiter is applied per-route inside authRouter)
app.use('/api/auth', authRouter);

// Product routes (public with optional JWT for admin differentiation)
app.use('/api/products', productRouter);

// Cart routes (Customer JWT required)
app.use('/api/cart', cartRouter);

// Wishlist routes (Customer JWT required)
app.use('/api/wishlist', wishlistRouter);

// Profile + address routes (Customer JWT required)
app.use('/api/profile', profileRouter);

// Order routes (Customer JWT required)
app.use('/api/orders', orderRouter);

// Admin routes (Admin JWT required)
app.use('/api/admin', adminRouter);

// Category routes (public GET, Admin-only write)
app.use('/api/categories', categoriesRouter);

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

export default app;
