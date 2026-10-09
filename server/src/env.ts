import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  /** Postgres. Without it the server uses an embedded database, which is for development and tests only. */
  DATABASE_URL: z.string().min(1).optional(),
  /** A direct (not pooled) connection, for migrations. Falls back to DATABASE_URL. */
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  /** Where the embedded development database keeps its files. */
  DATA_DIR: z.string().default('.data/pg'),
  /** Sites allowed to send requests that change something: the LMS and the marketing site. */
  ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof Env>;

/** Read and check the environment once. A production server without a real database is refused, not started on an empty one. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = Env.parse(source);
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  return env;
}

export const env = readEnv();
