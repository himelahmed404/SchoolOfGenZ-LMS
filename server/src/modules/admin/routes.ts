import { z } from 'zod';
import { InviteStaffBody, RoleBody, StaffPatchBody } from '../../contract/index.js';
import type { Db } from '../../db/index.js';
import { adminRouter } from '../../http/adminRouter.js';
import { parse } from '../../http/validate.js';
import { createRole, inviteStaff, patchStaff, rolesAndStaff, saveRole, staffLink } from './staff.js';

const Id = z.uuid();

/** Everything under /v1/admin. Each route names its area and whether it views or edits. */
export function adminRoutes(db: Db) {
  const admin = adminRouter();

  admin.get('/roles', 'roles', 'view', async (_req, res) => { res.json(await rolesAndStaff(db)); });
  admin.post('/roles', 'roles', 'edit', async (req, res) => { res.status(201).json(await createRole(db, req.auth!.user, parse(RoleBody, req.body))); });
  admin.put('/roles/:id', 'roles', 'edit', async (req, res) => { res.json(await saveRole(db, req.auth!.user, String(req.params.id), parse(RoleBody, req.body))); });
  admin.post('/staff', 'roles', 'edit', async (req, res) => { res.status(201).json(await inviteStaff(db, req.auth!.user, parse(InviteStaffBody, req.body))); });
  admin.patch('/staff/:id', 'roles', 'edit', async (req, res) => {
    await patchStaff(db, req.auth!.user, parse(Id, req.params.id), parse(StaffPatchBody, req.body));
    res.status(204).end();
  });
  admin.post('/staff/:id/link', 'roles', 'edit', async (req, res) => { res.json(await staffLink(db, req.auth!.user, parse(Id, req.params.id))); });

  return admin;
}
