import type { CourseId, Doubt, LessonRevision, PayMethod, PayStatus, PublishedLesson } from './types';
import type { Numerals } from './format';

/**
 * Everything the prototype kept in one component, minus pure view state.
 * Persisted to localStorage for now; each slice maps to a server resource
 * (Progress, TestAttempt, Payment, LessonRevision, Doubt, Notification, Profile) once the API exists.
 * New top-level slices merge in on load, so adding one does not need a version bump.
 */
export interface AppState {
  version: 2;
  prefs: {
    theme: 'light' | 'dark' | null;
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
  test: {
    on: boolean;
    startedAt: number | null;
    ans: Record<number, number>;
    q: number;
    elapsed: number;
    /** Correct answers in the last submitted attempt (feeds the leaderboard). */
    score: number | null;
  };
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
}

export const initialState: AppState = {
  version: 2,
  prefs: { theme: null, numerals: 'bn', name: '', sem: 4, examDate: null, setupDone: false },
  progress: {},
  last: { courseId: 'cst', ch: 2, li: 4, t: 372 },
  practiceAns: {},
  test: { on: false, startedAt: null, ans: {}, q: 0, elapsed: 0, score: null },
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
  profile: { email: 'mahmud.cst@gmail.com', inst: 'ঢাকা পলিটেকনিক ইনস্টিটিউট' },
  tProfile: {
    email: 'shahriar@schoolofgenz.com',
    bio: '১০ বছর ধরে ডিপ্লোমা শিক্ষার্থীদের প্রোগ্রামিং পড়াচ্ছি। কঠিন জিনিস সহজ উদাহরণে বোঝাতে ভালোবাসি।',
    subjects: ['Data Structure', 'C Programming', 'Algorithm'],
  },
};
