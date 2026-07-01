import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

/**
 * Shared PostgreSQL connection pool.
 * All queries should go through this pool instance.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep reasonable defaults; tune in production via env vars
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export default pool;
