/**
 * Domain mutations as pure (state) => state functions.
 * Each one is the seam where a server call goes once there is an API.
 */
import { allQueue, baseItem, batchOf, chapterTest, counts, enrollingBatch, item, lessonKey, step } from './selectors';
import type { AppState, TestResult } from './state';
import type { CourseId, LessonRevision, PayStatus } from './types';

/* ---------- student ---------- */

export function completeLesson(s: AppState, cid: CourseId, ci: number, li: number): { s: AppState; next: [number, number] | null; courseDone: boolean } {
  const progress = { ...s.progress, [lessonKey(cid, ci, li)]: true as const };
  let next = { ...s, progress };
  const c = counts(next, cid);
  const nx = step(s, cid, ci, li, 1);
  if (nx) next = { ...next, last: { courseId: cid, ch: nx[0], li: nx[1], t: 0 } };
  return { s: next, next: nx, courseDone: c.done >= c.total };
}

/** Remember where playback stopped, if this is the resume lesson. */
export function savePosition(s: AppState, cid: CourseId, ci: number, li: number, t: number): AppState {
  const l = s.last;
  if (l.courseId !== cid || l.ch !== ci || l.li !== li || l.t === t) return s;
  return { ...s, last: { ...l, t } };
}

export function toggleBookmark(s: AppState, k: string): AppState {
  const bookmarks = { ...s.bookmarks };
  if (bookmarks[k]) delete bookmarks[k]; else bookmarks[k] = true;
  return { ...s, bookmarks };
}

export function setMyNote(s: AppState, k: string, text: string): AppState {
  return { ...s, myNotes: { ...s.myNotes, [k]: text } };
}

/* ---------- student: chapter tests (`key` is `cid:ci`) ---------- */

const NO_TEST: AppState['test'] = { key: null, startedAt: null, ans: {}, q: 0 };

/** Open a fresh attempt. It replaces any attempt still running, so only one test is timed at a time. */
export function startTest(s: AppState, key: string, now = Date.now()): AppState {
  return { ...s, test: { key, startedAt: now, ans: {}, q: 0 } };
}

/** Seconds used so far in the running attempt, capped at the time limit. */
export function testElapsed(s: AppState, now: number, limit: number) {
  if (!s.test.startedAt) return 0;
  return Math.max(0, Math.min(limit, Math.floor((now - s.test.startedAt) / 1000)));
}

/** Score the running attempt against the test as it is now, and keep the best score for the chapter. */
export function submitTest(s: AppState, now: number): AppState {
  const key = s.test.key;
  if (!key) return s;
  const [cid, ci] = key.split(':') as [CourseId, string];
  const t = chapterTest(s, cid, +ci);
  if (!t) return { ...s, test: NO_TEST };
  const score = t.qs.reduce((a, q, i) => a + (s.test.ans[i] === q.a ? 1 : 0), 0);
  const prev = s.testResults[key];
  const result: TestResult = {
    score, total: t.qs.length, best: Math.max(prev ? prev.best : 0, score), tries: (prev ? prev.tries : 0) + 1,
    elapsed: testElapsed(s, now, t.seconds), at: now, qs: t.qs, ans: s.test.ans,
  };
  return { ...s, test: NO_TEST, testResults: { ...s.testResults, [key]: result } };
}

/** A TrxID already in the queue — including the student's own earlier (rejected) submission. */
export function trxTaken(s: AppState, trx: string) {
  const t = trx.trim().toUpperCase();
  return allQueue(s).some((r) => r.trx === t);
}

/**
 * Pick what to enroll in. One payment is made at a time, so this is refused while another is being checked or was sent back;
 * a finished (approved) one makes room for the next.
 */
export function chooseProgram(s: AppState, program: string): AppState {
  const p = s.payment;
  if (p.program === program) return s;
  if (p.status === 'pending' || p.status === 'rejected') return s;
  return { ...s, payment: { program, method: null, trxId: '', sender: '', status: 'none' } };
}

export function submitPayment(s: AppState): AppState {
  if (!s.payment.program) return s;
  return { ...s, payment: { ...s.payment, status: 'pending', reason: undefined } };
}

/** Clear the form to send the payment again, for the same program. */
export function resetPayment(s: AppState): AppState {
  return { ...s, payment: { program: s.payment.program, method: null, trxId: '', sender: '', status: 'none' } };
}

/** A question on a lesson. In a diploma subject it goes to the student's batch; a single course has no batch. */
export function askDoubt(s: AppState, cid: CourseId, ch: number, li: number, text: string): AppState {
  const b = batchOf(s, cid);
  return { ...s, myDoubts: [{ id: 'm' + Date.now(), ...(b ? { batch: b.id } : {}), course: cid, ch, li, q: text, who: '', agoMin: 0 }, ...s.myDoubts] };
}

/* ---------- admin: payments ---------- */

/**
 * `reason` is a `rejectReasons` code.
 * Approving the student's own payment enrolls them: in the batch that is taking students for a diploma program, with no batch for a single course.
 */
export function decidePayments(s: AppState, ids: string[], status: PayStatus, reason?: string): AppState {
  const decided = { ...s.decided };
  let payment = s.payment, enrollments = s.enrollments;
  ids.forEach((id) => {
    if (id !== 'live') { decided[id] = { status, reason }; return; }
    payment = { ...payment, status, reason };
    const program = payment.program;
    if (status !== 'approved' || !program || enrollments.some((e) => e.program === program)) return;
    const b = enrollingBatch(s, program);
    enrollments = enrollments.concat([{ program, ...(b ? { batch: b.id } : {}) }]);
  });
  return { ...s, decided, payment, enrollments };
}

/* ---------- teacher: revisions ---------- */

/** Edits are refused while in review; editing a published lesson turns it into a draft update. */
export function patchItem(s: AppState, k: string, patch: Partial<LessonRevision>): AppState {
  const cur = item(s, k);
  if (cur.status === 'review') return s;
  const next: LessonRevision = { ...cur, ...patch };
  if (cur.status === 'published') { next.status = 'draft'; next.update = true; }
  return { ...s, tItems: { ...s.tItems, [k]: next } };
}

export function newLessonKey(cid: CourseId, ci: number) {
  return cid + '|new:' + ci + ':' + Date.now();
}

/** Start a blank draft for a new lesson (`newLessonKey`) or a chapter's first test (`testRevKey`). */
export function createDraft(s: AppState, k: string): AppState {
  return { ...s, tItems: { ...s.tItems, [k]: baseItem(s, k) } };
}

export function submitForReview(s: AppState, k: string, by: string): AppState {
  const cur = item(s, k);
  return { ...s, tItems: { ...s.tItems, [k]: { ...cur, status: 'review', reason: '', reasonNote: '', live: true, subAgoMin: 0, by } } };
}

export function withdraw(s: AppState, k: string): AppState {
  return { ...s, tItems: { ...s.tItems, [k]: { ...item(s, k), status: 'draft' } } };
}

export function startUpload(s: AppState, k: string): AppState {
  const next = patchItem(s, k, { video: { state: 'uploading', name: 'VID_20260923_2140.mp4' } });
  return next === s ? s : { ...next, upload: { key: k, pct: 0 } };
}

/* ---------- admin: content review ---------- */

/** `reason` is a `contentReasons` code and `note` the admin's words on what to fix; both go to the teacher on a return. */
export function decideContent(s: AppState, k: string, status: 'published' | 'returned', reason?: string, note?: string): AppState {
  const it = item(s, k);
  const aDecided = { ...s.aDecided, [k]: status };
  if (status === 'returned') {
    return { ...s, aDecided, tItems: { ...s.tItems, [k]: { ...it, status: 'returned', live: false, reason: reason || '', reasonNote: note || '' } } };
  }
  const published = { ...s.published };
  const isTest = it.kind === 'test';
  // Chapter tests and existing lessons have a student-facing slot. Brand-new lessons need course-structure support server-side.
  if (isTest || !it.isNew) published[k] = { title: it.title, video: it.video, blocks: it.blocks, quiz: it.quiz, ...(isTest ? { seconds: it.seconds } : {}) };
  const next: LessonRevision = { ...it, status: 'published', update: false, live: false, reason: '', reasonNote: '', ...(isTest ? { isNew: false } : {}) };
  return { ...s, aDecided, published, tItems: { ...s.tItems, [k]: next } };
}

/* ---------- notifications ---------- */

export function markRead(s: AppState, ids: string[]): AppState {
  const read = { ...s.notifs.read };
  ids.forEach((id) => { read[id] = true; });
  return { ...s, notifs: { ...s.notifs, read } };
}

export function clearNotifs(s: AppState, ids: string[]): AppState {
  const gone = { ...s.notifs.gone };
  ids.forEach((id) => { gone[id] = true; });
  return { ...s, notifs: { ...s.notifs, gone } };
}
