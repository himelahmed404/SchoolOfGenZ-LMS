import type { AdminData } from './admin/types';
import { courses } from './data';
import type { CourseId, Doubt, LessonRevision, PayMethod, PayStatus, PublishedLesson, QuizQ } from './types';
import type { Numerals } from './format';

/**
 * Everything the prototype kept in one component, minus pure view state.
 * Persisted to localStorage for now; each slice maps to a server resource
 * (Progress, TestAttempt, Payment, LessonRevision, Doubt, Notification, Profile) once the API exists.
 * Bump `version` when a slice changes shape: saved state from an older version is dropped.
 * New top-level slices merge in on load, so adding one does not need a version bump.
 */
/** Result of a chapter test: the latest attempt, plus the best score so far. */
export interface TestResult {
  score: number;
  total: number;
  best: number;
  tries: number;
  /** Seconds the latest attempt took. */
  elapsed: number;
  /** When the latest attempt was submitted (ms); 0 for seeded results. */
  at: number;
  /** The questions as they were at that attempt, so a later edit of the test cannot scramble the review. */
  qs: QuizQ[];
  /** Answers of the latest attempt, by question index. */
  ans: Record<number, number>;
}

export interface AppState {
  version: 3;
  prefs: {
    numerals: Numerals;
    name: string;
    sem: number;
    examDate: string | null;
    setupDone: boolean;
  };
  /** Lessons completed in this session, keyed `cid:ci:li` (seed data marks earlier ones done). */
  progress: Record<string, true>;
  /** Where "চালিয়ে যাও" resumes; `t` is the playback position in seconds. */
  last: { courseId: CourseId; ch: number; li: number; t: number };
  practiceAns: Record<string, Record<number, number>>;
  /** The chapter test in progress, if any; `key` is `cid:ci`. One attempt runs at a time. */
  test: { key: string | null; startedAt: number | null; ans: Record<number, number>; q: number };
  /** Results per chapter test, keyed `cid:ci`. The best score feeds the leaderboard. */
  testResults: Record<string, TestResult>;
  payment: { method: PayMethod | null; trxId: string; sender: string; status: 'none' | PayStatus; reason?: string };
  /** Admin decisions on seed payments. */
  decided: Record<string, { status: PayStatus; reason?: string }>;
  myDoubts: Doubt[];
  replies: Record<string, { text: string; by: string }>;
  tItems: Record<string, LessonRevision>;
  published: Record<string, PublishedLesson>;
  /** Content items the admin decided on this session. */
  aDecided: Record<string, 'published' | 'returned'>;
  upload: { key: string; pct: number } | null;
  /** Notification ids the viewer has read or cleared (both roles share the id space: s1…, t1…). */
  notifs: { read: Record<string, true>; gone: Record<string, true> };
  /** Saved lessons, keyed `cid:ci:li`. */
  bookmarks: Record<string, true>;
  /** Private per-lesson notes, keyed `cid:ci:li`. */
  myNotes: Record<string, string>;
  profile: { email: string; inst: string };
  tProfile: { email: string; bio: string; subjects: string[] };
  /** Admin console data; seeded the first time the console opens. */
  admin: AdminData | null;
}

export const initialState: AppState = {
  version: 3,
  prefs: { numerals: 'bn', name: '', sem: 4, examDate: null, setupDone: false },
  progress: {},
  last: { courseId: 'cst', ch: 2, li: 4, t: 372 },
  practiceAns: {},
  test: { key: null, startedAt: null, ans: {}, q: 0 },
  // The student already took the first chapter's test (4 of 5).
  testResults: { 'cst:0': { score: 4, total: 5, best: 4, tries: 1, elapsed: 212, at: 0, qs: courses.cst.chapters[0].test!.qs, ans: { 0: 0, 1: 0, 2: 2, 3: 0, 4: 0 } } },
  payment: { method: null, trxId: '', sender: '', status: 'none' },
  decided: {},
  myDoubts: [],
  replies: {},
  tItems: {},
  published: {},
  aDecided: {},
  upload: null,
  notifs: { read: { s4: true, s5: true, t3: true }, gone: {} },
  bookmarks: { 'cst:2:4': true, 'cst:1:1': true },
  myNotes: { 'cst:2:4': 'push আর pop দুটোই O(1) — পরীক্ষায় প্রায়ই আসে!' },
  profile: { email: 'mahmud.cst@gmail.com', inst: 'Dhaka Polytechnic Institute' },
  tProfile: {
    email: 'shahriar@schoolofgenz.com',
    bio: '১০ বছর ধরে ডিপ্লোমা শিক্ষার্থীদের প্রোগ্রামিং পড়াচ্ছি। কঠিন জিনিস সহজ উদাহরণে বোঝাতে ভালোবাসি।',
    subjects: ['Data Structure', 'C Programming', 'Algorithm'],
  },
  admin: null,
};
