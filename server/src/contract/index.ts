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
