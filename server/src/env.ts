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
  /** Sites allowed to send requests that change something: the LMS and the marketing site. Separated by commas. */
  ORIGINS: z.string().default('http://localhost:3000'),
  /** Where the LMS is, for the links put in SMS and invitations. */
  LMS_URL: z.string().default('http://localhost:3000'),
  /** Keys the hashes of one-time codes. Changing it makes every unused code and link stop working. */
  SECRET: z.string().min(32).optional(),
  /** "1" allows signing in as a demo account without a password. Never in production. */
  DEV_LOGIN: z.string().optional(),
});

export type Env = z.infer<typeof Env>;

/** Read and check the environment once. A production server without a real database is refused, not started on an empty one. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = Env.parse(source);
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  if (env.NODE_ENV === 'production' && !env.SECRET) throw new Error('SECRET is required in production');
  if (env.NODE_ENV === 'production' && env.DEV_LOGIN === '1') throw new Error('DEV_LOGIN must not be set in production');
  return env;
}

export const env = readEnv();

/** The secret, with a fixed stand-in for development and tests so nothing needs configuring there. */
export const secret = () => env.SECRET || 'development-only-secret-not-for-production-use';
/** Whether the passwordless demo sign-in is on: only outside production, and on by default in development. */
export const devLogin = () => env.NODE_ENV !== 'production' && env.DEV_LOGIN !== '0';
/** The sites whose pages may send requests that change something. */
export const origins = () => env.ORIGINS.split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean);
