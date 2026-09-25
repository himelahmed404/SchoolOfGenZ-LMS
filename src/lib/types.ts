export type CourseId = 'cst' | 'eng';

export interface Lesson {
  n: string;
  t: string;
  d: string;
  done?: boolean;
}

export interface Chapter {
  n: string;
  name: string;
  lessons: Lesson[];
}

export interface Course {
  id: CourseId;
  track: 'batch' | 'skill';
  kicker: string;
  title: string;
  instructor: string;
  meta: string;
  chapters: Chapter[];
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

/** A lesson revision as the teacher edits it. Key format: `cid|lesson:ci:li` or `cid|new:ci:id`. */
export interface LessonRevision {
  kind: 'lesson';
  ch: number;
  li?: number;
  isNew?: boolean;
  title: string;
  status: RevisionStatus;
  update?: boolean;
  video: Video;
  blocks: Block[];
  quiz: QuizQ[];
  by?: string;
  subAt?: string;
  reason?: string;
  live?: boolean;
}

/** What students see — kept separate from pending revisions. */
export interface PublishedLesson {
  title: string;
  video: Video;
  blocks: Block[];
  quiz: QuizQ[];
}

export type PayMethod = 'bKash' | 'Nagad';
export type PayStatus = 'pending' | 'approved' | 'rejected';

export interface Payment {
  id: string;
  name: string;
  phone: string;
  course: string;
  batch: string;
  method: PayMethod;
  amount: number;
  due: number;
  trx: string;
  sender: string;
  at: string;
  status: PayStatus;
  dup?: boolean;
  live?: boolean;
  rejectReason?: string;
}

export interface Doubt {
  id: string;
  batch: string;
  course: CourseId;
  ch: number;
  li: number;
  who: string;
  q: string;
  h: number;
  ago: string;
  reply?: string;
  by?: string;
  replyAgo?: string;
  mine?: boolean;
}

export interface Confusion {
  q: string;
  a: string;
}
