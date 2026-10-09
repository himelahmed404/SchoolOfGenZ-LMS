/*
 * The database. Programs are what is sold, batches are the runs of a diploma program, and courses are
 * what is studied. Money is whole taka. Times are stored with their zone.
 *
 * After changing this file run `npm run db:generate`: it writes the next migration into ./drizzle.
 */
import { sql } from 'drizzle-orm';
import { bigserial, boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { Area, Block, Perm, PublishedLesson, QuizQ, Video } from '../contract/index.js';

const id = () => uuid('id').primaryKey().defaultRandom();
const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at('created_at').notNull().defaultNow();

/* ================= people ================= */

export const users = pgTable('users', {
  id: id(),
  kind: text('kind').$type<'student' | 'teacher' | 'staff'>().notNull(),
  name: text('name').notNull(),
  /** Students sign in with this. Stored as 11 digits, 01XXXXXXXXX. */
  phone: text('phone'),
  /** Teachers and staff sign in with this. Stored in lower case. */
  email: text('email'),
  /** Null until the person sets a password from their activation or invitation. */
  passwordHash: text('password_hash'),
  /** pending: enrolled but not approved yet · invited: staff or teacher who has not accepted. */
  status: text('status').$type<'pending' | 'active' | 'suspended' | 'invited' | 'inactive'>().notNull().default('pending'),
  /** Why the account is suspended. */
  note: text('note'),
  numerals: text('numerals').$type<'bn' | 'latin'>().notNull().default('bn'),
  semester: integer('semester'),
  institute: text('institute'),
  /** The student's own exam date, when it differs from the board's. */
  examDate: date('exam_date'),
  setupDone: boolean('setup_done').notNull().default(false),
  bio: text('bio'),
  /** Subjects a teacher lists on their profile. */
  subjects: jsonb('subjects').$type<string[]>(),
  createdAt: createdAt(),
  lastSeenAt: at('last_seen_at'),
}, (t) => [
  uniqueIndex('users_phone_key').on(t.phone),
  uniqueIndex('users_email_key').on(t.email),
  check('users_kind_check', sql`${t.kind} in ('student', 'teacher', 'staff')`),
  check('users_status_check', sql`${t.status} in ('pending', 'active', 'suspended', 'invited', 'inactive')`),
  check('users_login_check', sql`${t.phone} is not null or ${t.email} is not null`),
]);

/** A signed-in device. Only a hash of the token is kept, so a copy of this table signs nobody in. */
export const sessions = pgTable('sessions', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  /** The device this session belongs to; the device limit counts these. */
  deviceId: text('device_id'),
  deviceLabel: text('device_label'),
  createdAt: createdAt(),
  lastUsedAt: at('last_used_at').notNull().defaultNow(),
  expiresAt: at('expires_at').notNull(),
  revokedAt: at('revoked_at'),
}, (t) => [uniqueIndex('sessions_token_key').on(t.tokenHash), index('sessions_user_idx').on(t.userId)]);

/** A code or link that works once: activating an account, resetting a password, accepting an invitation. */
export const oneTimeCodes = pgTable('one_time_codes', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').$type<'activate' | 'reset' | 'invite'>().notNull(),
  secretHash: text('secret_hash').notNull(),
  expiresAt: at('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  usedAt: at('used_at'),
  createdAt: createdAt(),
}, (t) => [index('one_time_codes_user_idx').on(t.userId, t.purpose)]);

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  /** The super admin role: it can do everything and cannot be edited. */
  locked: boolean('locked').notNull().default(false),
  perms: jsonb('perms').$type<Partial<Record<Area, Perm>>>().notNull().default({}),
});

export const staff = pgTable('staff', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id),
});

/** Counters for rate limits. Kept here because a server on Vercel has no memory between requests. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').notNull(),
  windowStart: at('window_start').notNull(),
  count: integer('count').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.key, t.windowStart] })]);

/** What staff did, and why. Rows can be added and never changed: a trigger refuses updates and deletes. */
export const activityLog = pgTable('activity_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: at('at').notNull().defaultNow(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  /** Kept beside the id so the entry still reads right after a person leaves. */
  actorName: text('actor_name').notNull(),
  area: text('area').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull().default(''),
  reason: text('reason').notNull().default(''),
}, (t) => [index('activity_log_at_idx').on(t.at), index('activity_log_area_idx').on(t.area)]);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedAt: at('updated_at').notNull().defaultNow(),
});

/* ================= catalog ================= */

/** How a sales page describes a program. Every part is optional; the marketing site shows what is there. */
export interface SalesCopy {
  pitch?: string;
  tagline?: string;
  stats?: { icon: string; n: string; label: string }[];
  outcomes?: string[];
  forWhom?: { icon: string; title: string; desc: string }[];
}

/** What is sold. `diploma` is one semester of a department; `single` is one recorded course. */
export const programs = pgTable('programs', {
  id: id(),
  slug: text('slug').notNull(),
  kind: text('kind').$type<'diploma' | 'single'>().notNull(),
  /** Short code: CST, ENG, WEB. */
  code: text('code').notNull(),
  /** English, for the admin console. A diploma program's is its facts: "CST · 4th Semester". */
  title: text('title').notNull(),
  /** Bangla, for students and the marketing site. */
  titleBn: text('title_bn').notNull().default(''),
  department: text('department'),
  semester: integer('semester'),
  status: text('status').$type<'draft' | 'published' | 'archived'>().notNull().default('draft'),
  model: text('model').$type<'free' | 'one' | 'inst'>().notNull().default('one'),
  price: integer('price').notNull().default(0),
  /** A struck-through price on the sales page. */
  oldPrice: integer('old_price'),
  installments: integer('installments').notNull().default(2),
  earlyOn: boolean('early_on').notNull().default(false),
  earlyPrice: integer('early_price').notNull().default(0),
  earlyEnd: date('early_end'),
  /** A single course's suggested pace. */
  weeks: integer('weeks'),
  hasCertificate: boolean('has_certificate').notNull().default(false),
  sales: jsonb('sales').$type<SalesCopy>().notNull().default({}),
  coverUrl: text('cover_url'),
  promoVideo: text('promo_video'),
  createdAt: createdAt(),
  updatedAt: at('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('programs_slug_key').on(t.slug),
  check('programs_kind_check', sql`${t.kind} in ('diploma', 'single')`),
  check('programs_price_check', sql`${t.price} >= 0 and ${t.earlyPrice} >= 0`),
]);

/** One run of a diploma program. Single programs have none. */
export const batches = pgTable('batches', {
  id: id(),
  /** CST-04-B01: what staff and students call it. */
  code: text('code').notNull(),
  slug: text('slug').notNull(),
  programId: uuid('program_id').notNull().references(() => programs.id),
  no: integer('no').notNull(),
  startDate: date('start_date').notNull(),
  /** The board exam: the batch ends here. */
  examDate: date('exam_date').notNull(),
  enrollDeadline: date('enroll_deadline'),
  seats: integer('seats').notNull(),
  status: text('status').$type<'enrolling' | 'running' | 'closed' | 'finished'>().notNull().default('enrolling'),
  /** When this batch costs something other than its program's price. */
  price: integer('price'),
  liveLink: text('live_link'),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('batches_code_key').on(t.code),
  uniqueIndex('batches_slug_key').on(t.slug),
  index('batches_program_idx').on(t.programId),
  check('batches_seats_check', sql`${t.seats} > 0`),
]);

/** What is studied: a subject of a semester, or the content of a single course. */
export const courses = pgTable('courses', {
  id: id(),
  slug: text('slug').notNull(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  titleBn: text('title_bn').notNull().default(''),
  /** A diploma subject's board code. */
  bteb: text('bteb'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('courses_slug_key').on(t.slug)]);

/** The courses of a program, in order. A subject can belong to more than one diploma program. */
export const programCourses = pgTable('program_courses', {
  programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.programId, t.courseId] }), index('program_courses_course_idx').on(t.courseId)]);

export const courseTeachers = pgTable('course_teachers', {
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.courseId, t.userId] })]);

export const chapters = pgTable('chapters', {
  id: id(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  name: text('name').notNull(),
}, (t) => [index('chapters_course_idx').on(t.courseId, t.position)]);

export const lessons = pgTable('lessons', {
  id: id(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  durationSec: integer('duration_sec').notNull().default(0),
  /** Playable on the marketing site without signing in. */
  freePreview: boolean('free_preview').notNull().default(false),
  /** The version students see: the last one an admin approved. */
  published: jsonb('published').$type<PublishedLesson>(),
  publishedAt: at('published_at'),
}, (t) => [index('lessons_chapter_idx').on(t.chapterId, t.position)]);

/** The optional test at the end of a diploma chapter, as students get it. */
export const chapterTests = pgTable('chapter_tests', {
  chapterId: uuid('chapter_id').primaryKey().references(() => chapters.id, { onDelete: 'cascade' }),
  seconds: integer('seconds').notNull(),
  questions: jsonb('questions').$type<QuizQ[]>().notNull(),
  publishedAt: at('published_at').notNull().defaultNow(),
});

/** The project at the end of a single course's chapter, as students get it. */
export const assignments = pgTable('assignments', {
  id: id(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  brief: jsonb('brief').$type<Block[]>().notNull(),
  /** Whether the certificate waits for it. */
  required: boolean('required').notNull().default(true),
  publishedAt: at('published_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('assignments_chapter_key').on(t.chapterId)]);

/**
 * What a teacher is working on: a lesson, a chapter test or a project brief. An admin reviews it,
 * and publishing copies it to where students read it. One working row per target.
 */
export const revisions = pgTable('revisions', {
  id: id(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<'lesson' | 'test' | 'assignment'>().notNull(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  /** Null for a lesson that does not exist yet, and for tests and briefs. */
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  status: text('status').$type<'draft' | 'review' | 'returned' | 'published'>().notNull().default('draft'),
  /** An edit of something already published, as opposed to something new. */
  isUpdate: boolean('is_update').notNull().default(false),
  video: jsonb('video').$type<Video>().notNull().default({ state: 'none' }),
  blocks: jsonb('blocks').$type<Block[]>().notNull().default([]),
  quiz: jsonb('quiz').$type<QuizQ[]>().notNull().default([]),
  /** A chapter test's time limit. */
  seconds: integer('seconds'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  submittedAt: at('submitted_at'),
  /** Why it was sent back: a `contentReasons` code, and the admin's note on what to fix. */
  reasonCode: text('reason_code'),
  reasonNote: text('reason_note'),
  updatedAt: at('updated_at').notNull().defaultNow(),
}, (t) => [
  index('revisions_course_idx').on(t.courseId, t.status),
  check('revisions_status_check', sql`${t.status} in ('draft', 'review', 'returned', 'published')`),
]);

export const coupons = pgTable('coupons', {
  id: id(),
  code: text('code').notNull(),
  type: text('type').$type<'pct' | 'amt'>().notNull(),
  value: integer('value').notNull(),
  /** Null means every program. */
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
  used: integer('used').notNull().default(0),
  /** 0 means no limit. */
  usageLimit: integer('usage_limit').notNull().default(0),
  expires: date('expires').notNull(),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('coupons_code_key').on(t.code), check('coupons_value_check', sql`${t.value} > 0`)]);

/** A diploma batch's weekly live classes, as its sales page lists them. */
export const liveRoutine = pgTable('live_routine', {
  id: id(),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  /** 0 is Saturday, the first day of the week in Bangladesh. */
  weekday: integer('weekday').notNull(),
  time: text('time').notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  teacherId: uuid('teacher_id').references(() => users.id, { onDelete: 'set null' }),
}, (t) => [index('live_routine_batch_idx').on(t.batchId)]);

/* ================= selling ================= */

/** One student in one program; a diploma enrollment also names the batch. */
export const enrollments = pgTable('enrollments', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => programs.id),
  batchId: uuid('batch_id').references(() => batches.id),
  status: text('status').$type<'pending' | 'active' | 'suspended' | 'refunded' | 'finished'>().notNull().default('pending'),
  /** What this student agreed to pay, fixed when they enrolled: later price changes do not touch it. */
  price: integer('price').notNull(),
  couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  activatedAt: at('activated_at'),
}, (t) => [
  uniqueIndex('enrollments_user_program_key').on(t.userId, t.programId),
  index('enrollments_batch_idx').on(t.batchId),
  check('enrollments_status_check', sql`${t.status} in ('pending', 'active', 'suspended', 'refunded', 'finished')`),
]);

/** Money a student says they sent. An admin checks it against the bKash or Nagad statement. */
export const payments = pgTable('payments', {
  id: id(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method: text('method').$type<'bKash' | 'Nagad'>().notNull(),
  amount: integer('amount').notNull(),
  /** Upper case. A TrxID can be used once, ever: the unique index is what enforces it. */
  trxId: text('trx_id').notNull(),
  sender: text('sender').notNull().default(''),
  status: text('status').$type<'pending' | 'approved' | 'rejected'>().notNull().default('pending'),
  /** A `rejectReasons` code. */
  rejectReason: text('reject_reason'),
  /** Where it was submitted: the marketing site's form, or inside the LMS. */
  source: text('source').$type<'site' | 'lms'>().notNull().default('lms'),
  decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
  decidedAt: at('decided_at'),
  submittedAt: at('submitted_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('payments_trx_key').on(t.trxId),
  index('payments_status_idx').on(t.status, t.submittedAt),
  index('payments_enrollment_idx').on(t.enrollmentId),
  check('payments_status_check', sql`${t.status} in ('pending', 'approved', 'rejected')`),
  check('payments_amount_check', sql`${t.amount} > 0`),
]);

export const refunds = pgTable('refunds', {
  id: id(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paid: integer('paid').notNull(),
  method: text('method').notNull(),
  /** The number the money goes back to. */
  number: text('number').notNull(),
  why: text('why').notNull(),
  /** How much of the course the student had watched when they asked. */
  watchedPct: integer('watched_pct').notNull().default(0),
  status: text('status').$type<'open' | 'refunded' | 'denied'>().notNull().default('open'),
  amount: integer('amount'),
  reason: text('reason'),
  decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'set null' }),
  decidedAt: at('decided_at'),
  createdAt: createdAt(),
}, (t) => [index('refunds_status_idx').on(t.status)]);

/* ================= learning ================= */

export const lessonProgress = pgTable('lesson_progress', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  completedAt: at('completed_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

/** Where "Continue" takes the student. */
export const resumePoints = pgTable('resume_points', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  positionSec: integer('position_sec').notNull().default(0),
  updatedAt: at('updated_at').notNull().defaultNow(),
});

export const bookmarks = pgTable('bookmarks', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

/** A student's private note on a lesson. */
export const notes = pgTable('notes', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  updatedAt: at('updated_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

/** A student's answers to a lesson's practice quiz, by question index. */
export const practiceAnswers = pgTable('practice_answers', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').$type<Record<string, number>>().notNull().default({}),
  updatedAt: at('updated_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

/** One sitting of a chapter test. `submittedAt` is null while it is running. */
export const testAttempts = pgTable('test_attempts', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  startedAt: at('started_at').notNull().defaultNow(),
  submittedAt: at('submitted_at'),
  /** The questions as they were, so a later edit of the test cannot scramble the review. */
  questions: jsonb('questions').$type<QuizQ[]>().notNull(),
  answers: jsonb('answers').$type<Record<string, number>>().notNull().default({}),
  score: integer('score'),
  elapsedSec: integer('elapsed_sec'),
}, (t) => [index('test_attempts_user_idx').on(t.userId, t.chapterId)]);

/** A student's work for a project. They can send it again until it is accepted. */
export const submissions = pgTable('submissions', {
  id: id(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  link: text('link'),
  fileUrl: text('file_url'),
  note: text('note').notNull().default(''),
  status: text('status').$type<'submitted' | 'accepted' | 'changes'>().notNull().default('submitted'),
  feedback: text('feedback'),
  markedBy: uuid('marked_by').references(() => users.id, { onDelete: 'set null' }),
  markedAt: at('marked_at'),
  createdAt: createdAt(),
}, (t) => [index('submissions_assignment_idx').on(t.assignmentId, t.status), index('submissions_user_idx').on(t.userId)]);

/** A day the student studied. The streak is counted from these. */
export const activityDays = pgTable('activity_days', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.day] })]);

export const certificates = pgTable('certificates', {
  /** SGZ-WEB-2026-0141: printed on the certificate and typed into the public check. */
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  /** The name as printed, which stays even if the account's name changes. */
  name: text('name').notNull(),
  issuedAt: at('issued_at').notNull().defaultNow(),
  status: text('status').$type<'valid' | 'revoked'>().notNull().default('valid'),
  reason: text('reason'),
}, (t) => [uniqueIndex('certificates_user_course_key').on(t.userId, t.courseId)]);

/* ================= talk ================= */

/** A question on a lesson. In a diploma subject it belongs to the asker's batch; a single course has no batch. */
export const doubts = pgTable('doubts', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  createdAt: createdAt(),
}, (t) => [index('doubts_lesson_idx').on(t.lessonId), index('doubts_course_idx').on(t.courseId, t.createdAt)]);

export const doubtReplies = pgTable('doubt_replies', {
  doubtId: uuid('doubt_id').primaryKey().references(() => doubts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  createdAt: createdAt(),
});

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  icon: text('icon').notNull(),
  tone: text('tone').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  href: text('href').notNull().default('/'),
  createdAt: createdAt(),
  readAt: at('read_at'),
  clearedAt: at('cleared_at'),
}, (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]);

export const announcements = pgTable('announcements', {
  id: id(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').$type<'all' | 'program' | 'batch'>().notNull(),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'cascade' }),
  channels: jsonb('channels').$type<('app' | 'sms')[]>().notNull().default(['app']),
  status: text('status').$type<'draft' | 'scheduled' | 'sent'>().notNull().default('draft'),
  sendAt: at('send_at'),
  sentAt: at('sent_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('announcements_status_idx').on(t.status, t.sendAt)]);

/** Every SMS, written here before it is sent: nothing is lost if the gateway is down, and staff can see what went out. */
export const smsOutbox = pgTable('sms_outbox', {
  id: id(),
  toPhone: text('to_phone').notNull(),
  text: text('text').notNull(),
  purpose: text('purpose').notNull(),
  status: text('status').$type<'queued' | 'sent' | 'failed'>().notNull().default('queued'),
  providerRef: text('provider_ref'),
  error: text('error'),
  createdAt: createdAt(),
  sentAt: at('sent_at'),
}, (t) => [index('sms_outbox_status_idx').on(t.status, t.createdAt)]);

/* ================= site content ================= */

export const faqs = pgTable('faqs', {
  id: id(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  /** Where it shows: everywhere, on one track's pages, or on one program's page. */
  scope: text('scope').$type<'global' | 'diploma' | 'single' | 'program'>().notNull().default('global'),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(true),
}, (t) => [index('faqs_scope_idx').on(t.scope, t.position)]);

export const testimonials = pgTable('testimonials', {
  id: id(),
  name: text('name').notNull(),
  /** "Dhaka Polytechnic · CST 4th" */
  meta: text('meta').notNull().default(''),
  quote: text('quote').notNull(),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'set null' }),
  photoUrl: text('photo_url'),
  position: integer('position').notNull().default(0),
  published: boolean('published').notNull().default(true),
}, (t) => [index('testimonials_program_idx').on(t.programId)]);

export const blogPosts = pgTable('blog_posts', {
  id: id(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull().default(''),
  excerpt: text('excerpt').notNull().default(''),
  body: jsonb('body').$type<Block[]>().notNull().default([]),
  coverUrl: text('cover_url'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  readMinutes: integer('read_minutes').notNull().default(1),
  /** The program its closing call-to-action points at. */
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'set null' }),
  status: text('status').$type<'draft' | 'published'>().notNull().default('draft'),
  publishedAt: at('published_at'),
  createdAt: createdAt(),
  updatedAt: at('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('blog_posts_slug_key').on(t.slug), index('blog_posts_status_idx').on(t.status, t.publishedAt)]);
