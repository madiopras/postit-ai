import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so nothing has loaded .env for us yet.
// `loadEnvFile` is built into Node (>= 20.12) — no dotenv dependency needed.
// It does not overwrite variables already present in the environment, so CI can
// still pass DATABASE_URL in directly.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file (e.g. CI): fall back to whatever is already in the environment.
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
