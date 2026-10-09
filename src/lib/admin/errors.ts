/*
 * The API answers a refusal with a code. This is how the admin console says it, in English.
 * The student and teacher screens word the same codes in Bangla (src/lib/api/messages.ts).
 */

const SAY: Record<string, string> = {
  role_exists: 'A role with this name already exists.',
  role_locked: 'This role cannot be changed.',
  role_in_use: 'This role still has members. Move them to another role first.',
  reason_needed: 'Give a reason for this change.',
  email_taken: 'Someone already uses this email.',
  no_role: 'That role no longer exists. Reload and try again.',
  no_staff: 'That staff member no longer exists. Reload and try again.',
  not_yourself: 'You cannot change your own access. Ask another admin.',
  last_super: 'At least one Super admin must remain.',
  super_only: 'Only a Super admin can do this.',
  own_role: 'You cannot change the role you hold. Ask another admin.',
  inactive: 'Restore their access first.',
  no_permission: 'Your role does not allow this.',
  unauthorized: 'You have been signed out. Sign in again.',
  invalid_input: 'Something in the form is not valid. Check it and try again.',
  rate_limited: 'Too many tries. Wait a little and try again.',
  offline: 'Cannot reach the server. Check the connection and try again.',
};

const UNKNOWN = 'Something went wrong on our side. Try again in a moment.';

/** The codes this file has words for. */
export const ADMIN_CODES = Object.keys(SAY);

/** What to tell a staff member about a failed request. `e` is whatever the API client threw. */
export function sayAdmin(e: unknown): string {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  return SAY[code] || UNKNOWN;
}
