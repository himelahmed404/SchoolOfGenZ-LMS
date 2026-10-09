/*
 * The API's request and response shapes. The server checks every body against these, and the LMS
 * imports the types, so the two cannot drift apart. Keep this folder free of imports other than zod:
 * the LMS compiles it too.
 */
import { z } from 'zod';

/* ---------- content: lessons, revisions, project briefs, blog posts ---------- */

/** One piece of a note. `quote` and `pdf` are used by blog posts only. */
export const Block = z.object({
  t: z.enum(['h', 'p', 'list', 'code', 'img', 'fx', 'quote', 'pdf']),
  x: z.string().max(20_000).optional(),
  file: z.string().max(500).optional(),
  cap: z.string().max(300).optional(),
});
export type Block = z.infer<typeof Block>;

/** A multiple-choice question; `a` is the index of the right option, null until the teacher picks one. */
export const QuizQ = z.object({
  stem: z.string().max(2_000),
  o: z.array(z.string().max(500)).min(2).max(6),
  a: z.number().int().min(0).nullable(),
  why: z.string().max(2_000).optional(),
});
export type QuizQ = z.infer<typeof QuizQ>;

export const Video = z.object({
  state: z.enum(['none', 'uploading', 'done']),
  /** File name the teacher uploaded. */
  name: z.string().max(300).optional(),
  /** Length as mm:ss. */
  dur: z.string().max(10).optional(),
  /** The video host's id, once it has the file. */
  ref: z.string().max(200).optional(),
});
export type Video = z.infer<typeof Video>;

/** What students see of a lesson. */
export const PublishedLesson = z.object({ title: z.string(), video: Video, blocks: z.array(Block), quiz: z.array(QuizQ) });
export type PublishedLesson = z.infer<typeof PublishedLesson>;

/* ---------- admin ---------- */

/** The admin console's areas. A role gives each one none, view or edit. */
export const AREAS = ['payments', 'content', 'refunds', 'students', 'teachers', 'certificates', 'courses', 'batches', 'coupons', 'announcements', 'reports', 'activity', 'settings', 'roles'] as const;
export const Area = z.enum(AREAS);
export type Area = z.infer<typeof Area>;
export const Perm = z.enum(['none', 'view', 'edit']);
export type Perm = z.infer<typeof Perm>;

/* ---------- accounts ---------- */

/** Digits typed on a Bangla keyboard (০–৯), as 0–9. */
export const latinDigits = (v: string) => v.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

/** A Bangladeshi mobile number, kept as 11 digits: 01XXXXXXXXX. Spaces, dashes and a leading +88 are dropped, and Bangla digits are read. */
export const Phone = z.string().max(30).transform((v) => latinDigits(v).replace(/[\s-]/g, '').replace(/^\+?88(?=01)/, '')).pipe(z.string().regex(/^01[3-9]\d{8}$/));
export const Email = z.string().trim().toLowerCase().pipe(z.email().max(200));
/** Any password as typed. The rules for a new one (8 characters, a digit) are checked by the server and answered with a code. */
export const Password = z.string().min(1).max(200);
/** Names the browser or phone, so a student can see where they are signed in. */
const Device = z.string().trim().min(8).max(100).optional();

export const Role = z.object({
  id: z.string(), name: z.string(), description: z.string(),
  /** The super admin role: everything, and it cannot be edited. */
  locked: z.boolean(),
  perms: z.partialRecord(Area, Perm),
});
export type Role = z.infer<typeof Role>;

/** The signed-in person, as they see themselves. */
export const Me = z.object({
  id: z.string(),
  kind: z.enum(['student', 'teacher', 'staff']),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  numerals: z.enum(['bn', 'latin']),
  semester: z.number().int().nullable(),
  institute: z.string().nullable(),
  examDate: z.string().nullable(),
  setupDone: z.boolean(),
  bio: z.string().nullable(),
  subjects: z.array(z.string()),
  /** Staff only: what they may see and change in the admin console. */
  role: Role.nullable(),
});
export type Me = z.infer<typeof Me>;

/** `login` is a phone number for a student and an email for a teacher or staff member. */
export const SignInBody = z.object({ login: z.string().trim().min(3).max(200), password: Password, device: Device });
export type SignInBody = z.infer<typeof SignInBody>;
/** Answer to signing in. A mobile app asks for `token` (header `x-token-mode: bearer`); a browser gets a cookie instead. */
export const SignedIn = z.object({ user: Me, token: z.string().optional() });
export type SignedIn = z.infer<typeof SignedIn>;

/** Setting a first password with the code from the approval SMS. */
export const ActivateBody = z.object({ phone: Phone, code: z.string().min(6).max(20), password: Password, device: Device });
export type ActivateBody = z.infer<typeof ActivateBody>;
export const ForgotBody = z.object({ login: z.string().trim().min(3).max(200) });
export type ForgotBody = z.infer<typeof ForgotBody>;
export const ResetBody = z.object({ login: z.string().trim().min(3).max(200), code: z.string().min(6).max(20), password: Password, device: Device });
export type ResetBody = z.infer<typeof ResetBody>;
/** A teacher or staff member opening their invitation, or a reset link an admin made for them. */
export const AcceptInviteBody = z.object({ token: z.string().min(20).max(100), password: Password, device: Device });
export type AcceptInviteBody = z.infer<typeof AcceptInviteBody>;
export const InviteInfo = z.object({ name: z.string(), email: z.string(), kind: z.enum(['teacher', 'staff']) });
export type InviteInfo = z.infer<typeof InviteInfo>;
export const PasswordBody = z.object({ current: Password, next: Password });
export type PasswordBody = z.infer<typeof PasswordBody>;

/** What a person may change about themselves. Every field is optional: only what is sent is changed. */
export const ProfileBody = z.object({
  name: z.string().trim().min(1).max(80),
  email: Email.nullable(),
  institute: z.string().trim().max(120),
  semester: z.number().int().min(1).max(8),
  numerals: z.enum(['bn', 'latin']),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  setupDone: z.boolean(),
  bio: z.string().trim().max(600),
  subjects: z.array(z.string().trim().min(1).max(60)).max(12),
}).partial();
export type ProfileBody = z.infer<typeof ProfileBody>;

/** A device the person is signed in on. */
export const SessionRow = z.object({ id: z.string(), device: z.string(), current: z.boolean(), createdAt: z.string(), lastUsedAt: z.string() });
export type SessionRow = z.infer<typeof SessionRow>;

/* ---------- admin: roles and staff ---------- */

/** Money and destructive changes say why. The reason goes into the activity log. */
export const Reason = z.string().trim().min(3).max(300);

export const StaffRow = z.object({
  id: z.string(), name: z.string(), email: z.string(), role: z.string(),
  status: z.enum(['active', 'invited', 'inactive']),
  lastSeenAt: z.string().nullable(),
});
export type StaffRow = z.infer<typeof StaffRow>;
export const RolesAndStaff = z.object({ roles: z.array(Role), staff: z.array(StaffRow) });
export type RolesAndStaff = z.infer<typeof RolesAndStaff>;

export const RoleBody = z.object({ name: z.string().trim().min(2).max(40), description: z.string().trim().max(120).default(''), perms: z.partialRecord(Area, Perm), reason: Reason.optional() });
export type RoleBody = z.infer<typeof RoleBody>;
export const InviteStaffBody = z.object({ name: z.string().trim().min(2).max(80), email: Email, role: z.string().min(1).max(40) });
export type InviteStaffBody = z.infer<typeof InviteStaffBody>;
export const StaffPatchBody = z.object({ role: z.string().min(1).max(40).optional(), active: z.boolean().optional(), reason: Reason });
export type StaffPatchBody = z.infer<typeof StaffPatchBody>;
/** Removing something for good says why. */
export const DeleteBody = z.object({ reason: Reason });
export type DeleteBody = z.infer<typeof DeleteBody>;
/** A link that works once. The admin copies it and sends it however they like. */
export const OneTimeLink = z.object({ link: z.string(), expiresAt: z.string() });
export type OneTimeLink = z.infer<typeof OneTimeLink>;

/* ---------- system ---------- */

export const Health = z.object({
  ok: z.boolean(),
  /** Whether the database answered. */
  db: z.boolean(),
  at: z.string(),
});
export type Health = z.infer<typeof Health>;

/** The shape of every error response. */
export const ErrorBody = z.object({
  error: z.object({ code: z.string(), message: z.string(), fields: z.record(z.string(), z.string()).optional(), requestId: z.string() }),
});
export type ErrorBody = z.infer<typeof ErrorBody>;
