/* Roles & staff: who works in the admin console, and what each role may see and change. */
import { and, eq, ne, sql } from 'drizzle-orm';
import type { InviteStaffBody, OneTimeLink, Role, RoleBody, RolesAndStaff, StaffPatchBody } from '../../contract/index.js';
import type { Db, Tx } from '../../db/index.js';
import { roles, staff, users } from '../../db/schema.js';
import { badRequest, conflict, notFound } from '../../http/errors.js';
import { endSessions, linkFor, type User } from '../auth/service.js';
import { logActivity } from './activity.js';

const roleRow = { id: roles.id, name: roles.name, description: roles.description, locked: roles.locked, perms: roles.perms };

export async function rolesAndStaff(db: Tx): Promise<RolesAndStaff> {
  const allRoles: Role[] = await db.select(roleRow).from(roles).orderBy(sql`${roles.locked} desc`, roles.name);
  const people = await db.select({ id: users.id, name: users.name, email: users.email, status: users.status, lastSeenAt: users.lastSeenAt, role: staff.roleId })
    .from(staff).innerJoin(users, eq(users.id, staff.userId)).orderBy(users.name);
  return {
    roles: allRoles,
    staff: people.map((p) => ({ id: p.id, name: p.name, email: p.email || '', role: p.role, status: p.status === 'active' || p.status === 'invited' ? p.status : 'inactive', lastSeenAt: p.lastSeenAt ? p.lastSeenAt.toISOString() : null })),
  };
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'role';

export async function createRole(db: Db, actor: User, body: RoleBody): Promise<Role> {
  const id = slug(body.name);
  return db.transaction(async (tx) => {
    const made = await tx.insert(roles).values({ id, name: body.name, description: body.description, perms: body.perms }).onConflictDoNothing().returning(roleRow);
    if (!made.length) throw conflict('role_exists', 'A role with this name already exists');
    await logActivity(tx, actor, 'roles', 'Created role', body.name, body.reason);
    return made[0]!;
  });
}

/** Change what a role may do. The locked role always does everything, so it cannot be edited. */
export async function saveRole(db: Db, actor: User, id: string, body: RoleBody): Promise<Role> {
  if (!body.reason) throw badRequest('reason_needed', 'Say why the role is changing', { reason: 'required' });
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(roles).where(eq(roles.id, id));
    if (!cur) throw notFound('no_role');
    if (cur.locked) throw conflict('role_locked', 'This role cannot be changed');
    const [saved] = await tx.update(roles).set({ name: body.name, description: body.description, perms: body.perms }).where(eq(roles.id, id)).returning(roleRow);
    await logActivity(tx, actor, 'roles', 'Changed role permissions', body.name, body.reason);
    return saved!;
  });
}

/** Remove a role nobody holds. The locked role stays, and so does any role that still has members. */
export async function deleteRole(db: Db, actor: User, id: string, reason: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [cur] = await tx.select().from(roles).where(eq(roles.id, id));
    if (!cur) throw notFound('no_role');
    if (cur.locked) throw conflict('role_locked', 'This role cannot be removed');
    const [held] = await tx.select({ n: sql<number>`count(*)::int` }).from(staff).where(eq(staff.roleId, id));
    if (held && held.n > 0) throw conflict('role_in_use', 'Move its members to another role first');
    await tx.delete(roles).where(eq(roles.id, id));
    await logActivity(tx, actor, 'roles', 'Deleted role', cur.name, reason);
  });
}

/** Add a staff member. They get no email from here: the admin copies the link and sends it. */
export async function inviteStaff(db: Db, actor: User, body: InviteStaffBody): Promise<OneTimeLink & { id: string }> {
  return db.transaction(async (tx) => {
    const [role] = await tx.select().from(roles).where(eq(roles.id, body.role));
    if (!role) throw badRequest('no_role', 'That role does not exist', { role: 'unknown' });
    const made = await tx.insert(users).values({ kind: 'staff', name: body.name, email: body.email, status: 'invited' }).onConflictDoNothing().returning({ id: users.id });
    if (!made.length) throw conflict('email_taken', 'Someone already uses this email');
    await tx.insert(staff).values({ userId: made[0]!.id, roleId: role.id });
    const link = await linkFor(tx, made[0]!.id);
    await logActivity(tx, actor, 'roles', 'Invited staff', body.name + ' · ' + role.name);
    return { id: made[0]!.id, link: link.link, expiresAt: link.expiresAt.toISOString() };
  });
}

async function staffMember(tx: Tx, id: string) {
  const [row] = await tx.select({ user: users, roleId: staff.roleId, locked: roles.locked, roleName: roles.name })
    .from(staff).innerJoin(users, eq(users.id, staff.userId)).innerJoin(roles, eq(roles.id, staff.roleId)).where(eq(staff.userId, id));
  if (!row) throw notFound('no_staff');
  return row;
}

/** Whether anyone else who is active holds the locked role. Without one, nobody could manage roles again. */
async function anotherSuper(tx: Tx, except: string): Promise<boolean> {
  const [row] = await tx.select({ n: sql<number>`count(*)::int` }).from(staff).innerJoin(users, eq(users.id, staff.userId)).innerJoin(roles, eq(roles.id, staff.roleId))
    .where(and(eq(roles.locked, true), eq(users.status, 'active'), ne(users.id, except)));
  return !!row && row.n > 0;
}

/** Change a staff member's role, or switch their access off and on. Nobody does this to themselves. */
export async function patchStaff(db: Db, actor: User, id: string, body: StaffPatchBody): Promise<void> {
  if (id === actor.id) throw conflict('not_yourself', 'Ask another admin to change your own access');
  await db.transaction(async (tx) => {
    const cur = await staffMember(tx, id);
    const losesSuper = cur.locked && ((body.role !== undefined && body.role !== cur.roleId) || body.active === false);
    if (losesSuper && !(await anotherSuper(tx, id))) throw conflict('last_super', 'At least one super admin must remain');
    if (body.role !== undefined && body.role !== cur.roleId) {
      const [next] = await tx.select().from(roles).where(eq(roles.id, body.role));
      if (!next) throw badRequest('no_role', 'That role does not exist', { role: 'unknown' });
      await tx.update(staff).set({ roleId: next.id }).where(eq(staff.userId, id));
      await logActivity(tx, actor, 'roles', 'Changed staff role', cur.user.name + ' · ' + cur.roleName + ' → ' + next.name, body.reason);
    }
    if (body.active === false && cur.user.status !== 'inactive') {
      await tx.update(users).set({ status: 'inactive' }).where(eq(users.id, id));
      await endSessions(tx, id);
      await logActivity(tx, actor, 'roles', 'Removed staff access', cur.user.name, body.reason);
    }
    if (body.active === true && cur.user.status === 'inactive') {
      // Back to how they were: with a password they can sign in again, without one they still need their link.
      await tx.update(users).set({ status: cur.user.passwordHash ? 'active' : 'invited' }).where(eq(users.id, id));
      await logActivity(tx, actor, 'roles', 'Restored staff access', cur.user.name, body.reason);
    }
  });
}

/** A fresh link for a staff member: to accept their invitation, or because they forgot their password. */
export async function staffLink(db: Db, actor: User, id: string): Promise<OneTimeLink> {
  return db.transaction(async (tx) => {
    const cur = await staffMember(tx, id);
    if (cur.user.status === 'inactive') throw conflict('inactive', 'Restore their access first');
    const link = await linkFor(tx, id);
    await logActivity(tx, actor, 'roles', cur.user.status === 'invited' ? 'Made a new invitation link' : 'Made a password reset link', cur.user.name);
    return { link: link.link, expiresAt: link.expiresAt.toISOString() };
  });
}
