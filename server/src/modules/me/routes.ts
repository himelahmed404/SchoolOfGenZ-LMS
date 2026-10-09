import { Router } from 'express';
import { ProfileBody } from '../../contract/index.js';
import type { Db } from '../../db/index.js';
import { requireUser } from '../../http/auth.js';
import { parse } from '../../http/validate.js';
import { toMe } from '../auth/service.js';
import { saveProfile } from './service.js';

/** What the signed-in person does for themselves. */
export function meRoutes(db: Db) {
  const r = Router();
  r.use(requireUser());

  r.patch('/profile', async (req, res) => {
    const user = await saveProfile(db, req.auth!, parse(ProfileBody, req.body));
    res.json(toMe(user, req.auth!.role));
  });

  return r;
}
