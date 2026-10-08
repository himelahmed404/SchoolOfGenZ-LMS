/**
 * Domain mutations as pure (state) => state functions.
 * Each one is the seam where a server call goes once there is an API.
 */
import { courses, defaultStudent, queueSeed, testMeta, testQs } from './data';
import { allQueue, baseItem, counts, item, lessonKey, step } from './selectors';
import type { AppState } from './state';
import type { CourseId, LessonRevision, PayStatus } from './types';

/* ---------- student ---------- */

export function completeLesson(s: AppState, cid: CourseId, ci: number, li: number): { s: AppState; next: [number, number] | null; courseDone: boolean } {
  const progress = { ...s.progress, [lessonKey(cid, ci, li)]: true as const };
  let next = { ...s, progress };
  const c = counts(next, cid);
  const nx = step(cid, ci, li, 1);
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

export function startTest(s: AppState): AppState {
  return { ...s, test: { ...s.test, on: true, startedAt: Date.now(), ans: {}, q: 0, elapsed: 0 } };
}

export function testElapsed(s: AppState, now: number) {
  if (!s.test.on || !s.test.startedAt) return s.test.elapsed;
  return Math.min(testMeta.seconds, Math.floor((now - s.test.startedAt) / 1000));
}

export function submitTest(s: AppState, now: number): AppState {
  let score = 0;
  testQs.forEach((q, i) => { if (s.test.ans[i] === q.a) score++; });
  return { ...s, test: { ...s.test, on: false, elapsed: testElapsed(s, now), score } };
}

export function trxTaken(s: AppState, trx: string) {
  const t = trx.trim().toUpperCase();
  return queueSeed.some((r) => r.trx === t);
}

export function submitPayment(s: AppState): AppState {
  return { ...s, payment: { ...s.payment, status: 'pending', reason: undefined } };
}

export function resetPayment(s: AppState): AppState {
  return { ...s, payment: { method: null, trxId: '', sender: '', status: 'none' } };
}

export function askDoubt(s: AppState, cid: CourseId, ch: number, li: number, text: string): AppState {
  const batch = cid === 'cst' ? defaultStudent.batch : 'ENG-02-B07';
  return { ...s, myDoubts: [{ id: 'm' + Date.now(), batch, course: cid, ch, li, q: text, who: '', h: 0, ago: '' }, ...s.myDoubts] };
}

/* ---------- admin: payments ---------- */

export function decidePayments(s: AppState, ids: string[], status: PayStatus, reason?: string): AppState {
  const decided = { ...s.decided };
  let payment = s.payment;
  ids.forEach((id) => {
    if (id === 'live') payment = { ...payment, status, reason };
    else decided[id] = { status, reason };
  });
  return { ...s, decided, payment };
}

export const pendingCount = (s: AppState) => allQueue(s).filter((r) => r.status === 'pending').length;

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

export function createLesson(s: AppState, k: string): AppState {
  return { ...s, tItems: { ...s.tItems, [k]: baseItem(k) } };
}

export function submitForReview(s: AppState, k: string, by: string): AppState {
  const cur = item(s, k);
  return { ...s, tItems: { ...s.tItems, [k]: { ...cur, status: 'review', reason: '', live: true, subAt: 'এইমাত্র', by } } };
}

export function withdraw(s: AppState, k: string): AppState {
  return { ...s, tItems: { ...s.tItems, [k]: { ...item(s, k), status: 'draft' } } };
}

export function startUpload(s: AppState, k: string): AppState {
  const next = patchItem(s, k, { video: { state: 'uploading', name: 'VID_20260923_2140.mp4' } });
  return next === s ? s : { ...next, upload: { key: k, pct: 0 } };
}

/* ---------- admin: content review ---------- */

export function decideContent(s: AppState, k: string, status: 'published' | 'returned', reason?: string): AppState {
  const it = item(s, k);
  const aDecided = { ...s.aDecided, [k]: status };
  if (status === 'returned') {
    return { ...s, aDecided, tItems: { ...s.tItems, [k]: { ...it, status: 'returned', live: false, reason: reason || 'কারণ লেখা নেই' } } };
  }
  const published = { ...s.published };
  // Only existing lessons have a student-facing slot today; new lessons need course-structure support server-side.
  if (!it.isNew) published[k] = { title: it.title, video: it.video, blocks: it.blocks, quiz: it.quiz };
  return { ...s, aDecided, published, tItems: { ...s.tItems, [k]: { ...it, status: 'published', update: false, live: false, reason: '' } } };
}

export const courseTitle = (cid: CourseId) => courses[cid].title;

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
