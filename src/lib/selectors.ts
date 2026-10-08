import {
  batches, boardExam, courses, defaultStudent, doubtSeed, firstNames, itemSeeds, lastNames,
  merchants, newCourse, notifSeed, practiceQs, queueSeed, stackBlocks, streakSeed, teacher, weekDayShort,
} from './data';
import { dateRangeEn, digits, pad2, plural, semLabel, taka, type Numerals } from './format';
import type { AppState } from './state';
import type { Block, Course, CourseId, Doubt, LessonRevision, PayMethod, Payment, PublishedLesson } from './types';

export const studentName = (s: AppState) => s.prefs.name.trim() || defaultStudent.name;
export const suggestedExam = (sem: number) => (sem % 2 === 0 ? boardExam.even : boardExam.odd);
export const examISO = (s: AppState) => s.prefs.examDate || suggestedExam(s.prefs.sem);

/* ---------- course facts (English) ---------- */

export const lessonCount = (c: Course) => c.chapters.reduce((a, ch) => a + ch.lessons.length, 0);
export const batchLabel = (n: number) => 'Batch ' + pad2(n);

/** Line above a course title: "CST · 4th Semester", or "Skill course". */
export const courseKicker = (c: Course) => (c.track === 'batch' && c.sem ? c.code + ' · ' + semLabel(c.sem) : 'Skill course');

/** Details line: "4th Semester · Batch 01 · 1 Aug – 28 Dec 2026", or "18 lessons · 8 weeks · Lifetime access". */
export function courseMeta(c: Course): string {
  const parts: string[] = [];
  if (c.track === 'batch') {
    if (c.sem) parts.push(semLabel(c.sem));
    if (c.batchNo) parts.push(batchLabel(c.batchNo));
    if (c.start && c.end) parts.push(dateRangeEn(c.start, c.end));
  } else {
    parts.push(plural(lessonCount(c), 'lesson'));
    if (c.weeks) parts.push(plural(c.weeks, 'week'));
    if (c.access === 'lifetime') parts.push('Lifetime access');
  }
  return parts.join(' · ');
}

/** "Chapter 03 · Lesson 05" from zero-based positions. */
export const lessonRef = (ci: number, li: number) => 'Chapter ' + pad2(ci + 1) + ' · Lesson ' + pad2(li + 1);

/* ---------- progress ---------- */

export const lessonKey = (cid: CourseId, ci: number, li: number) => cid + ':' + ci + ':' + li;

export function isDone(s: AppState, cid: CourseId, ci: number, li: number) {
  return !!(s.progress[lessonKey(cid, ci, li)] || courses[cid].chapters[ci].lessons[li].done);
}

export function counts(s: AppState, cid: CourseId) {
  let total = 0, done = 0;
  courses[cid].chapters.forEach((ch, ci) => ch.lessons.forEach((_, li) => { total++; if (isDone(s, cid, ci, li)) done++; }));
  return { total, done, pct: Math.round((done / total) * 100) };
}

export function frontier(s: AppState, cid: CourseId): [number, number] {
  const c = courses[cid];
  for (let ci = 0; ci < c.chapters.length; ci++)
    for (let li = 0; li < c.chapters[ci].lessons.length; li++)
      if (!isDone(s, cid, ci, li)) return [ci, li];
  const last = c.chapters.length - 1;
  return [last, c.chapters[last].lessons.length - 1];
}

export function isLocked(s: AppState, cid: CourseId, ci: number, li: number) {
  if (isDone(s, cid, ci, li)) return false;
  const f = frontier(s, cid);
  return ci > f[0] || (ci === f[0] && li > f[1]);
}

export function step(cid: CourseId, ci: number, li: number, dir: 1 | -1): [number, number] | null {
  const c = courses[cid];
  let nci = ci, nli = li + dir;
  if (nli < 0) { nci--; if (nci < 0) return null; nli = c.chapters[nci].lessons.length - 1; }
  if (nli >= c.chapters[nci].lessons.length) { nci++; if (nci >= c.chapters.length) return null; nli = 0; }
  return [nci, nli];
}

/** Chapters fully complete, counted from the start (stops at the first incomplete one). */
export function doneChapters(s: AppState, cid: CourseId) {
  const c = courses[cid];
  let n = 0;
  for (let ci = 0; ci < c.chapters.length; ci++) {
    if (c.chapters[ci].lessons.every((_, li) => isDone(s, cid, ci, li))) n++; else break;
  }
  return n;
}

/* ---------- batch roster & leaderboard ---------- */

export interface RosterRow { name: string; done: number; live?: boolean }

export function roster(s: AppState, bid: string): RosterRow[] {
  const b = batches[bid];
  if (!b || !b.size) return [];
  const total = courses[b.course].chapters.length;
  let seed = b.seed, guard = 0;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const out: RosterRow[] = [], seen: Record<string, boolean> = {};
  while (out.length < b.size && guard++ < 800) {
    const name = firstNames[Math.floor(rnd() * firstNames.length)] + ' ' + lastNames[Math.floor(rnd() * lastNames.length)];
    if (seen[name]) continue;
    seen[name] = true;
    const r = rnd();
    const done = b.course === 'eng'
      ? (r < 0.15 ? 0 : r < 0.6 ? 1 : r < 0.9 ? 2 : 3)
      : (r < 0.06 ? 0 : r < 0.2 ? 1 : r < 0.5 ? 2 : r < 0.82 ? 3 : r < 0.95 ? 4 : 5);
    out.push({ name, done: Math.min(total, done) });
  }
  if (bid === defaultStudent.batch) out.push({ name: studentName(s), done: doneChapters(s, 'cst'), live: true });
  return out;
}

export interface BoardRow { name: string; pts: number; rank: number; live?: boolean }

/**
 * points = 10 × lessons completed + 5 × correct model-test answers. Ties share a rank.
 * Server note: return only the ±5 window to clients, never the full ranking.
 */
export function boardRows(s: AppState, weekly: boolean): BoardRow[] {
  const c = courses.cst, per = c.chapters.map((ch) => ch.lessons.length);
  const hash = (x: string) => { let h = 7; for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) % 100003; return h; };
  const mine = counts(s, 'cst').done;
  const gained = Object.keys(s.progress).filter((k) => k.indexOf('cst:') === 0).length;
  const test = s.test.score || 0;
  const rows = roster(s, defaultStudent.batch).map((r) => {
    if (r.live) return { name: r.name, live: true, rank: 0, pts: weekly ? 30 + gained * 10 + test * 5 : mine * 10 + (19 + test) * 5 };
    const h = hash(r.name);
    let n = 0;
    for (let i = 0; i < r.done; i++) n += per[i];
    if (r.done < per.length) n += h % per[r.done];
    const right = Math.round(r.done * 4.5) + ((h >> 3) % 10);
    return { name: r.name, rank: 0, pts: weekly ? ((h >> 5) % 9) * 10 + ((h >> 2) % 6) * 5 : n * 10 + right * 5 };
  });
  rows.forEach((r) => { r.rank = 1 + rows.filter((x) => x.pts > r.pts).length; });
  return rows.sort((a, b) => a.rank - b.rank || (a.live ? -1 : b.live ? 1 : a.name.localeCompare(b.name)));
}

/* ---------- doubts ---------- */

export function doubtsFor(s: AppState, bid: string): Doubt[] {
  const withReply = (d: Doubt): Doubt => {
    const r = s.replies[d.id];
    return r ? { ...d, reply: r.text, by: r.by, replyAgoMin: 0 } : d;
  };
  const mine = s.myDoubts.filter((d) => d.batch === bid).map((d) => withReply({ ...d, who: studentName(s), agoMin: 0, mine: true }));
  return mine.concat(doubtSeed.filter((d) => d.batch === bid).map(withReply));
}

/* ---------- lesson revisions ---------- */

export function itemKeys(s: AppState): string[] {
  const k: Record<string, 1> = {};
  Object.keys(itemSeeds).forEach((x) => { k[x] = 1; });
  Object.keys(s.tItems).forEach((x) => { k[x] = 1; });
  return Object.keys(k);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function baseItem(k: string): LessonRevision {
  const [cid, rest] = k.split('|') as [CourseId, string];
  const r = rest.split(':'), c = courses[cid];
  if (r[0] === 'lesson') {
    const ci = +r[1], li = +r[2], l = c.chapters[ci].lessons[li];
    const feat = cid === 'cst' && ci === 2 && li === 4;
    return {
      kind: 'lesson', ch: ci, li, title: l.t, status: 'published',
      video: { state: 'done', name: 'lesson-' + pad2(ci + 1) + '-' + pad2(li + 1) + '.mp4', dur: l.d },
      blocks: feat ? clone(stackBlocks) : [{ t: 'h', x: l.t }, { t: 'p', x: '' }],
      quiz: feat ? clone(practiceQs) : [],
    };
  }
  return { kind: 'lesson', ch: +r[1], isNew: true, title: '', status: 'draft', video: { state: 'none' }, blocks: [{ t: 'h', x: '' }, { t: 'p', x: '' }], quiz: [] };
}

export function item(s: AppState, k: string): LessonRevision {
  if (s.tItems[k]) return s.tItems[k];
  const b = baseItem(k), seed = itemSeeds[k];
  return seed ? { ...b, ...clone(seed) } : b;
}

export const editorHref = (k: string) => '/teacher/content/' + encodeURIComponent(k);

export const keyCourse = (k: string) => k.split('|')[0] as CourseId;

export const blockHasContent = (b: Block) => (b.t === 'img' ? !!b.file : !!(b.x || '').trim());

/** The version students see: the last approved publish, else the original lesson. */
export function studentLesson(s: AppState, cid: CourseId, ci: number, li: number): PublishedLesson {
  const k = cid + '|lesson:' + ci + ':' + li;
  if (s.published[k]) return s.published[k];
  const b = baseItem(k);
  return { title: b.title, video: b.video, blocks: b.blocks, quiz: b.quiz };
}

export function issues(it: LessonRevision, numerals: Numerals): string[] {
  const out: string[] = [];
  if (!(it.title || '').trim()) out.push('লেসনের নাম দাওনি');
  if (!it.video || it.video.state !== 'done') out.push('ভিডিও আপলোড হয়নি');
  if (!it.blocks.some(blockHasContent)) out.push('নোটে কিছু লেখা নেই');
  it.quiz.forEach((q, i) => {
    const n = digits(i + 1, numerals) + ' নম্বর প্রশ্ন';
    if (!q.stem.trim()) out.push(n + 'টা ফাঁকা');
    else if (q.o.some((o) => !o.trim())) out.push(n + 'ের সব অপশন লেখা হয়নি');
    else if (q.a === null || q.a === undefined) out.push(n + 'ে সঠিক উত্তর বাছা হয়নি');
  });
  return out;
}

export function statusOf(it: LessonRevision): [string, string] {
  if (it.status === 'review') return ['● Pending', 'var(--warn)'];
  if (it.status === 'returned') return ['✗ Returned', 'var(--margin)'];
  if (it.status === 'draft') return [it.update ? 'Draft · Update' : 'Draft', 'var(--ink-2)'];
  return ['Published', 'var(--ink-3)'];
}

/* ---------- platform settings (admin console) ---------- */

/** Merchant numbers students send money to (Settings → Payment numbers). */
export const merchantNumbers = (s: AppState): Record<PayMethod, string> => ({
  bKash: s.admin?.settings.bkash || merchants.bKash,
  Nagad: s.admin?.settings.nagad || merchants.Nagad,
});

/** Settings → Content protection → Video watermark. */
export const watermarkOn = (s: AppState) => s.admin?.settings.watermark !== 'off';

/* ---------- payments ---------- */

export function liveRow(s: AppState): Payment {
  const p = s.payment;
  return {
    id: 'live', live: true, name: studentName(s), phone: defaultStudent.phone,
    course: newCourse.title, batch: newCourse.batch, method: p.method || 'bKash',
    amount: newCourse.price, due: newCourse.price, trx: p.trxId || '—',
    sender: p.sender || defaultStudent.phone, agoMin: 0,
    status: p.status === 'none' ? 'pending' : p.status, rejectReason: p.reason,
  };
}

export function allQueue(s: AppState): Payment[] {
  const out: Payment[] = [];
  if (s.payment.status !== 'none') out.push(liveRow(s));
  queueSeed.forEach((r) => {
    const d = s.decided[r.id];
    out.push(d ? { ...r, status: d.status, rejectReason: d.reason } : r);
  });
  return out;
}

export function rowFlags(r: Payment): string[] {
  const f: string[] = [];
  if (r.amount < r.due) f.push('টাকা কম — ' + taka(r.due - r.amount) + ' বাকি আছে');
  if (r.dup) f.push('এই TrxID আগেও একবার জমা পড়েছে');
  if (r.sender !== r.phone) f.push('অন্য নম্বর থেকে পেমেন্ট এসেছে');
  return f;
}

/* ---------- streak ---------- */

/** Saturday-first weekday index (the Bangladeshi week): Sat = 0 … Fri = 6. */
export const satIndex = (d: Date) => (d.getDay() + 1) % 7;

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** Whether `day` falls inside the current streak, which ends today. */
export function studiedOn(day: Date, today = new Date()) {
  const diff = Math.round((dayStart(today).getTime() - dayStart(day).getTime()) / 86400000);
  return diff >= 0 && diff < streakSeed.current;
}

/** This week's dots, Saturday to Friday. */
export function weekDots(today = new Date()) {
  const ti = satIndex(today);
  return weekDayShort.map((d, i) => {
    const day = new Date(today); day.setDate(today.getDate() - ti + i);
    return { d, studied: studiedOn(day, today), today: i === ti };
  });
}

/** The month grid (6 Sat-first weeks) for the streak calendar. */
export function monthCells(today = new Date()) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - satIndex(first));
  const t0 = dayStart(today).getTime();
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start); day.setDate(start.getDate() + i);
    const t = dayStart(day).getTime();
    return { n: day.getDate(), other: day.getMonth() !== today.getMonth(), studied: studiedOn(day, today), today: t === t0, future: t > t0 };
  });
}

/* ---------- notifications ---------- */

export type AppRole = 'student' | 'teacher';

export const notifsFor = (s: AppState, role: AppRole) => notifSeed[role].filter((x) => !s.notifs.gone[x.id]);
export const unreadCount = (s: AppState, role: AppRole) => notifsFor(s, role).filter((x) => !s.notifs.read[x.id]).length;

export { teacher };
