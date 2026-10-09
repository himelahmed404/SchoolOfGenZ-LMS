import type { z } from 'zod';
import { badRequest } from './errors.js';

/**
 * Check a body, query or params object against its contract. What comes back has only the fields
 * the contract names, so nothing else a client sends can reach a service.
 */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    // The first problem with a field is the one worth showing.
    if (!(key in fields)) fields[key] = issue.code;
  }
  throw badRequest('invalid_input', 'The request is not in the expected shape', fields);
}
