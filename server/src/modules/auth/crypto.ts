/*
 * Passwords, session tokens and one-time codes. Nothing here is stored or logged as it was typed:
 * a password becomes an argon2id hash, a token or code becomes a keyed hash.
 */
import { argon2, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { latinDigits } from '../../contract/index.js';
import { secret } from '../../env.js';

/** argon2id at the cost OWASP gives as its minimum: 19 MiB, 2 passes, 1 lane. About 30 ms on a server. */
const COST = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 } as const;

const derive = (password: string, salt: Buffer, cost: { memory: number; passes: number; parallelism: number; tagLength: number }) =>
  new Promise<Buffer>((resolve, reject) => {
    argon2('argon2id', { message: Buffer.from(password, 'utf8'), nonce: salt, ...cost }, (err, key) => (err ? reject(err) : resolve(key)));
  });

const b64 = (b: Buffer) => b.toString('base64').replace(/=+$/, '');

/** `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`: the cost travels with the hash, so it can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST);
  return `$argon2id$v=19$m=${COST.memory},t=${COST.passes},p=${COST.parallelism}$${b64(salt)}$${b64(key)}`;
}

/** A hash of nothing anyone knows, compared against when there is no account, so a miss takes as long as a wrong password. */
let decoy: Promise<string> | undefined;

/** Whether `password` is the one behind `stored`. With no stored hash it still does the work, and says no. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const real = !!stored;
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(stored || (await (decoy ??= hashPassword(randomBytes(24).toString('hex')))));
  if (!m) return false;
  const want = Buffer.from(m[5]!, 'base64');
  const got = await derive(password, Buffer.from(m[4]!, 'base64'), { memory: +m[1]!, passes: +m[2]!, parallelism: +m[3]!, tagLength: want.length });
  return timingSafeEqual(got, want) && real;
}

/** What is wrong with a new password, as a code, or null. The LMS shows the same rules while typing. */
export function passwordProblem(password: string): 'too_short' | 'too_long' | 'needs_digit' | null {
  if (password.length < 8) return 'too_short';
  if (password.length > 200) return 'too_long';
  if (!/\d/.test(password)) return 'needs_digit';
  return null;
}

/** A session token or invitation link: 256 random bits. The person holds it; the database holds only `keyed(token)`. */
export const newToken = () => randomBytes(32).toString('base64url');

/** Letters and digits that cannot be mistaken for each other when read off an SMS. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** An 8-character code for an SMS: short enough to type, and with five tries nobody guesses one in a million million. */
export function newCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** What a person types as their code, tidied: no spaces or dashes, upper case, and Bangla digits read as digits. */
export const tidyCode = (typed: string) => latinDigits(typed).replace(/[\s-]/g, '').toUpperCase();

/** The keyed hash kept in place of a token or code. Without the server's secret, a copy of the database verifies nothing. */
export const keyed = (value: string) => createHmac('sha256', secret()).update(value).digest('hex');
