/** A course id. Courses come from the catalog, so this is any string. */
export type CourseId = string;

/** Lesson and chapter numbers come from their position in the list. */
export interface Lesson {
  t: string;
  d: string;
  done?: boolean;
}

/** Optional test at the end of a chapter. A chapter without one shows no test option. */
export interface ChapterTest {
  /** Time limit. */
  seconds: number;
  qs: QuizQ[];
}

export interface Chapter {
  name: string;
  lessons: Lesson[];
  test?: ChapterTest;
}

/** What a student studies: a subject of a diploma semester, or the content of a single course. */
export interface Course {
  id: CourseId;
  /** Short code shown on covers and in details lines: DSA, ENG. */
  code: string;
  /** Bangla title, shown to students. */
  title: string;
  /** English title, for the admin console. */
  titleEn: string;
  instructor: string;
  /** Diploma subjects carry their board code. */
  bteb?: string;
  chapters: Chapter[];
}

/**
 * What is sold. A diploma program is one semester of a department, with several subjects and dated batches.
 * A single program is one recorded course: no batch, open all the time, kept for life.
 */
export interface Program {
  id: string;
  kind: 'diploma' | 'single';
  /** Short code: CST, ENG, WEB. */
  code: string;
  /** Diploma: the semester it covers. */
  sem?: number;
  /** Single: a suggested pace. */
  weeks?: number;
  price: number;
  /** In order: the subjects of the semester, or the one course of a single program. */
  courses: CourseId[];
}

/** One run of a diploma program. Single courses have none. */
export interface Batch {
  id: string;
  program: string;
  no: number;
  start: string;
  end: string;
  status: 'enrolling' | 'running' | 'finished';
}

export interface Catalog {
  programs: Record<string, Program>;
  batches: Record<string, Batch>;
  courses: Record<CourseId, Course>;
}

/** A student in a program; a diploma enrollment also names the batch. */
export interface Enrollment {
  program: string;
  batch?: string;
}

export interface QuizQ {
  stem: string;
  o: string[];
  a: number | null;
  why?: string;
}

export type BlockType = 'h' | 'p' | 'list' | 'code' | 'img' | 'fx';

export interface Block {
  t: BlockType;
  x?: string;
  file?: string;
  cap?: string;
}

export interface Video {
  state: 'none' | 'uploading' | 'done';
  name?: string;
  dur?: string;
}

export type RevisionStatus = 'draft' | 'review' | 'returned' | 'published';

/** A reason an admin picks from a list. The admin sees `en`; the student or teacher it goes to sees `bn`. */
export interface Reason { code: string; en: string; bn: string }

/**
 * A revision as the teacher edits it, reviewed by an admin before students see it.
 * Keys: a lesson is `cid|lesson:ci:li` (existing) or `cid|new:ci:id` (new); a chapter test is `cid|test:ci`.
 */
export interface LessonRevision {
  kind: 'lesson' | 'test';
  ch: number;
  li?: number;
  isNew?: boolean;
  title: string;
  status: RevisionStatus;
  update?: boolean;
  video: Video;
  blocks: Block[];
  /** Lesson practice quiz, or the questions of a chapter test. */
  quiz: QuizQ[];
  /** Chapter tests: time limit. */
  seconds?: number;
  by?: string;
  /** Minutes since it was submitted for review. */
  subAgoMin?: number;
  /** When returned: the code of the reason the admin picked, and their note on what to fix. */
  reason?: string;
  reasonNote?: string;
  live?: boolean;
}

/** What students see — kept separate from pending revisions. */
export interface PublishedLesson {
  title: string;
  video: Video;
  blocks: Block[];
  quiz: QuizQ[];
  seconds?: number;
}

export type PayMethod = 'bKash' | 'Nagad';
export type PayStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  id: string;
  name: string;
  phone: string;
  /** English name of what was bought: "CST · 4th Semester", or a single course's title. */
  course: string;
  /** Diploma only. */
  batch?: string;
  method: PayMethod;
  amount: number;
  due: number;
  trx: string;
  sender: string;
  /** Minutes since it was submitted. */
  agoMin: number;
  status: PayStatus;
  dup?: boolean;
  live?: boolean;
  /** Code of the reason it was rejected for. */
  rejectReason?: string;
}

export interface Doubt {
  id: string;
  /** The asker's batch. A single course has none, so everyone taking it shares its questions. */
  batch?: string;
  course: CourseId;
  ch: number;
  li: number;
  who: string;
  q: string;
  /** Minutes since it was asked. */
  agoMin: number;
  reply?: string;
  by?: string;
  replyAgoMin?: number;
  mine?: boolean;
}

export interface Confusion {
  q: string;
  a: string;
}

export type Tone = 'brand' | 'ok' | 'warn' | 'sun' | 'pink';

export interface Notif {
  id: string;
  /** Material Symbols icon name. */
  icon: string;
  tone: Tone;
  title: string;
  body: string;
  agoMin: number;
  /** Route the notification opens. */
  href: string;
}
