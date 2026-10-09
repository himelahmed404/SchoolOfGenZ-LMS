import { Router, type RequestHandler } from 'express';
import type { Area } from '../contract/index.js';
import { requirePerm } from './auth.js';

export interface AdminRoute { method: 'get' | 'post' | 'put' | 'patch' | 'delete'; path: string; area: Area; level: 'view' | 'edit' }

/**
 * The router for /v1/admin. A route cannot be added to it without saying which area of the console it
 * belongs to and whether it views or edits; the check runs before the handler. The list of what was
 * added is kept, and a test goes through it to prove none can be reached without the permission.
 */
export function adminRouter() {
  const router = Router();
  const routes: AdminRoute[] = [];
  const add = (method: AdminRoute['method']) => (path: string, area: Area, level: 'view' | 'edit', handler: RequestHandler) => {
    routes.push({ method, path, area, level });
    router[method](path, requirePerm(area, level), handler);
  };
  return { router, routes, get: add('get'), post: add('post'), put: add('put'), patch: add('patch'), delete: add('delete') };
}

export type AdminRouter = ReturnType<typeof adminRouter>;
