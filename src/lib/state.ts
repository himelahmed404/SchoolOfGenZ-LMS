import type { CourseId, Doubt, LessonRevision, PayMethod, PayStatus, PublishedLesson } from './types';
import type { Numerals } from './format';

/**
 * Everything the prototype kept in one component, minus pure view state.
 * Persisted to localStorage for now; each slice maps to a server resource
 * (Progress, TestAttempt, Payment, LessonRevision, Doubt) once the API exists.
 */
export interface AppState {
  version: 1;
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
  /** Where "চালিয়ে যাও" resumes. */
  last: { courseId: CourseId; ch: number; li: number };
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
}

export const initialState: AppState = {
  version: 1,
  prefs: { theme: null, numerals: 'bn', name: '', sem: 4, examDate: null, setupDone: false },
  progress: {},
  last: { courseId: 'cst', ch: 2, li: 4 },
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
};
