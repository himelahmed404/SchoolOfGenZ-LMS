/* What the API sends, turned into the shapes the console draws. */
import type { Role as ApiRole, RolesAndStaff } from '@contract';
import { ago } from '../format';
import { AREAS } from './seed';
import type { Area, Fetched, Perm, Role, Staff } from './types';

/** A role with every area spelled out: the API leaves out the ones a role cannot see. */
export function roleFromApi(r: ApiRole): Role {
  const perms = {} as Record<Area, Perm>;
  AREAS.forEach(([k]) => { perms[k] = r.perms[k] || 'none'; });
  return { id: r.id, name: r.name, desc: r.description, locked: r.locked || undefined, perms };
}

/** A role that no longer exists, for a staff member still pointing at it: no access, and its id for a name. */
export function noRole(id: string): Role {
  return roleFromApi({ id, name: id, description: '', locked: false, perms: {} });
}

export function rolesFromApi(x: RolesAndStaff, now: Date): Pick<Fetched, 'roles' | 'staff'> {
  const staff: Staff[] = x.staff.map((s) => ({
    id: s.id, name: s.name, email: s.email, role: s.role, status: s.status,
    last: s.lastSeenAt ? ago((now.getTime() - Date.parse(s.lastSeenAt)) / 60000) : 'Never',
  }));
  return { roles: x.roles.map(roleFromApi), staff };
}

/** Nothing fetched yet. */
export const noFetched: Fetched = { roles: [], staff: [], rolesState: 'loading' };
