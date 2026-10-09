import {
  boardExam, contentReasons, DEFAULT_TEST_SECONDS, defaultStudent, doubtSeed, firstNames, itemSeeds, lastNames,
  merchants, MIN_TEST_QUESTIONS, notifSeed, paymentHistory, practiceQs, queueSeed, rosterSeed, stackBlocks, streakSeed, teacher, weekDayShort,
} from './data';
import { dateEn, dateRangeEn, digits, pad2, plural, semLabel, taka, type Numerals } from './format';
import type { AppState } from './state';
import type { Batch, Block, ChapterTest, Course, CourseId, Doubt, LessonRevision, PayMethod, PayStatus, Payment, Program, PublishedLesson, Reason } from './types';

export const studentName = (s: AppState) => s.prefs.name.trim() || defaultStudent.name;
export const suggestedExam = (sem: number) => (sem % 2 === 0 ? boardExam.even : boardExam.odd);
export const examISO = (s: AppState) => s.prefs.examDate || suggestedExam(s.prefs.sem);

/* ---------- catalog ---------- */

/** A course by id. Screens that take an id from the URL check `s.catalog.courses[id]` first. */
const C = (s: AppState, cid: CourseId): Course => s.catalog.courses[cid];

/** The program a course is studied in: one the student is enrolled in, when there is one. */
export function programOf(s: AppState, cid: CourseId): Program | undefined {
  const all = Object.values(s.catalog.programs).filter((p) => p.courses.includes(cid));
  return all.find((p) => s.enrollments.some((e) => e.program === p.id)) || all[0];
}

/** The student's batch in a course's program. A single course has none. */
export function batchOf(s: AppState, cid: CourseId): Batch | undefined {
  const p = programOf(s, cid), e = p && s.enrollments.find((x) => x.program === p.id);
  return e && e.batch ? s.catalog.batches[e.batch] : undefined;
}

/** Recorded, self-paced, no batch. A single course has projects where a diploma subject has quizzes and tests. */
export const isSingle = (s: AppState, cid: CourseId) => programOf(s, cid)?.kind === 'single';

export interface MyProgram { program: Program; batch?: Batch; courses: Course[] }

/** What the student is enrolled in, in the order they joined. */
export function myPrograms(s: AppState): MyProgram[] {
  return s.enrollments.flatMap((e) => {
    const program = s.catalog.programs[e.program];
    if (!program) return [];
    return [{ program, batch: e.batch ? s.catalog.batches[e.batch] : undefined, courses: program.courses.map((id) => s.catalog.courses[id]).filter(Boolean) }];
  });
}

export const myCourses = (s: AppState): Course[] => myPrograms(s).flatMap((x) => x.courses);

/** The diploma batch the student is in. The leaderboard and the rank belong to it; a student with only single courses has neither. */
export const myBatch = (s: AppState): Batch | undefined => myPrograms(s).find((x) => x.batch)?.batch;

/** The batch of a diploma program that is taking students now. */
export const enrollingBatch = (s: AppState, pid: string): Batch | undefined =>
  Object.values(s.catalog.batches).find((b) => b.program === pid && b.status === 'enrolling');

export interface Offer { program: Program; batch?: Batch }

/** What the student can still join: every single course, and each diploma program that has a batch enrolling. */
export function offers(s: AppState): Offer[] {
  return Object.values(s.catalog.programs).filter((p) => !s.enrollments.some((e) => e.program === p.id)).flatMap((program): Offer[] => {
    if (program.kind === 'single') return [{ program }];
    const batch = enrollingBatch(s, program.id);
    return batch ? [{ program, batch }] : [];
  });
}

/** A program's name: "CST · 4th Semester" (a fact, so always English), or a single course's title in the reader's language. */
export function programName(s: AppState, p: Program, lang: 'en' | 'bn' = 'en'): string {
  if (p.kind === 'diploma') return p.code + ' · ' + semLabel(p.sem || 1);
  const c = s.catalog.courses[p.courses[0]];
  return c ? (lang === 'bn' ? c.title : c.titleEn) : p.code;
}

/* ---------- course facts (English) ---------- */

export const lessonCount = (c: Course) => c.chapters.reduce((a, ch) => a + ch.lessons.length, 0);
export const batchLabel = (n: number) => 'Batch ' + pad2(n);

/** A batch in one line: "Batch 01 · 1 Aug – 28 Dec 2026". */
export const batchLine = (b: Batch) => batchLabel(b.no) + ' · ' + dateRangeEn(b.start, b.end);

/** Line above a course title: "CST · 4th Semester" for a diploma subject, or "Skill course". */
export function courseKicker(s: AppState, c: Course) {
  const p = programOf(s, c.id);
  return p && p.kind === 'diploma' ? programName(s, p) : 'Skill course';
}

/** Details line: "4th Semester · Batch 01 · 1 Aug – 28 Dec 2026", or "18 lessons · 8 weeks · Lifetime access". */
export function courseMeta(s: AppState, c: Course): string {
  const p = programOf(s, c.id), parts: string[] = [];
  if (p && p.kind === 'diploma') {
    const b = batchOf(s, c.id);
    if (p.sem) parts.push(semLabel(p.sem));
    if (b) parts.push(batchLine(b));
  } else {
    parts.push(plural(lessonCount(c), 'lesson'));
    if (p && p.weeks) parts.push(plural(p.weeks, 'week'));
    parts.push('Lifetime access');
  }
  return parts.join(' · ');
}

/** A subject inside its semester, where the semester is already named: "BTEB 25942 · 30 lessons". */
export const subjectMeta = (c: Course) => (c.bteb ? 'BTEB ' + c.bteb + ' · ' : '') + plural(lessonCount(c), 'lesson');

/* ---------- enrolling ---------- */

/** The program the student is paying for, with the batch it is for: the one they joined, or the one taking students. */
export function payingOffer(s: AppState): Offer | undefined {
  const p = s.payment.program ? s.catalog.programs[s.payment.program] : undefined;
  if (!p) return undefined;
  const e = s.enrollments.find((x) => x.program === p.id);
  const batch = e && e.batch ? s.catalog.batches[e.batch] : enrollingBatch(s, p.id);
  return { program: p, ...(batch ? { batch } : {}) };
}

export interface OfferView { code: string; kicker: string; title: string; who: string; facts: string; price: number; terms: string }

/**
 * How a program on sale reads on Explore and on its enroll page.
 * A diploma batch is named by its facts; a single course by its Bangla title and teacher.
 */
export function offerView(s: AppState, o: Offer): OfferView {
  const p = o.program, list = p.courses.map((id) => s.catalog.courses[id]).filter(Boolean);
  if (p.kind === 'diploma') {
    return { code: p.code, kicker: 'Diploma batch', title: programName(s, p), who: '', facts: (o.batch ? batchLine(o.batch) + ' · ' : '') + plural(list.length, 'subject'), price: p.price, terms: 'One-time · For the semester' };
  }
  const c = list[0];
  const facts = [c ? plural(lessonCount(c), 'lesson') : '', p.weeks ? plural(p.weeks, 'week') : '', 'Recorded'].filter(Boolean).join(' · ');
  return { code: p.code, kicker: 'Skill course', title: c ? c.title : p.code, who: c ? c.instructor : '', facts, price: p.price, terms: 'One-time · Lifetime access' };
}

/** "Chapter 03 · Lesson 05" from zero-based positions. */
export const lessonRef = (ci: number, li: number) => 'Chapter ' + pad2(ci + 1) + ' · Lesson ' + pad2(li + 1);

/* ---------- progress ---------- */

export const lessonKey = (cid: CourseId, ci: number, li: number) => cid + ':' + ci + ':' + li;

export function isDone(s: AppState, cid: CourseId, ci: number, li: number) {
  return !!(s.progress[lessonKey(cid, ci, li)] || C(s, cid).chapters[ci].lessons[li].done);
}

export function counts(s: AppState, cid: CourseId) {
  let total = 0, done = 0;
  C(s, cid).chapters.forEach((ch, ci) => ch.lessons.forEach((_, li) => { total++; if (isDone(s, cid, ci, li)) done++; }));
  return { total, done, pct: Math.round((done / total) * 100) };
}

export function frontier(s: AppState, cid: CourseId): [number, number] {
  const c = C(s, cid);
  for (let ci = 0; ci < c.chapters.length; ci++)
    for (let li = 0; li < c.chapters[ci].lessons.length; li++)
      if (!isDone(s, cid, ci, li)) return [ci, li];
  const last = c.chapters.length - 1;
  return [last, c.chapters[last].lessons.length - 1];
}

/** Where "Continue" takes a student in a course: the lesson they stopped on if it is this course, else its first unfinished lesson. */
export function resumePoint(s: AppState, cid: CourseId): [number, number] {
  return s.last.courseId === cid ? [s.last.ch, s.last.li] : frontier(s, cid);
}

export function isLocked(s: AppState, cid: CourseId, ci: number, li: number) {
  if (isDone(s, cid, ci, li)) return false;
  const f = frontier(s, cid);
  return ci > f[0] || (ci === f[0] && li > f[1]);
}

export function step(s: AppState, cid: CourseId, ci: number, li: number, dir: 1 | -1): [number, number] | null {
  const c = C(s, cid);
  let nci = ci, nli = li + dir;
  if (nli < 0) { nci--; if (nci < 0) return null; nli = c.chapters[nci].lessons.length - 1; }
  if (nli >= c.chapters[nci].lessons.length) { nci++; if (nci >= c.chapters.length) return null; nli = 0; }
  return [nci, nli];
}

export const chapterDone = (s: AppState, cid: CourseId, ci: number) => C(s, cid).chapters[ci].lessons.every((_, li) => isDone(s, cid, ci, li));

/** Chapters fully complete, counted from the start (stops at the first incomplete one). */
export function doneChapters(s: AppState, cid: CourseId) {
  const c = C(s, cid);
  let n = 0;
  for (let ci = 0; ci < c.chapters.length; ci++) {
    if (chapterDone(s, cid, ci)) n++; else break;
  }
  return n;
}

/* ---------- chapter tests ---------- */

/** Key of a chapter's test attempt and result: `cid:ci`. */
export const testKey = (cid: CourseId, ci: number) => cid + ':' + ci;
/** Key of the revision a teacher edits for a chapter's test: `cid|test:ci`. */
export const testRevKey = (cid: CourseId, ci: number) => cid + '|test:' + ci;

/** The test students get for a chapter: the last one an admin published, else the seeded one. Null when there is none. */
export function chapterTest(s: AppState, cid: CourseId, ci: number): ChapterTest | null {
  const pub = s.published[testRevKey(cid, ci)];
  if (pub) return { seconds: pub.seconds || DEFAULT_TEST_SECONDS, qs: pub.quiz };
  return C(s, cid)?.chapters[ci]?.test || null;
}

/** none: the chapter has no test · locked: lessons left · ready: can be taken · running: an attempt is open · done: taken, can be retaken. */
export type TestStatus = 'none' | 'locked' | 'ready' | 'running' | 'done';

export function testStatus(s: AppState, cid: CourseId, ci: number): TestStatus {
  if (!chapterTest(s, cid, ci)) return 'none';
  const k = testKey(cid, ci);
  if (s.test.key === k) return 'running';
  if (s.testResults[k]) return 'done';
  return chapterDone(s, cid, ci) ? 'ready' : 'locked';
}

/** Correct answers across a course's chapter tests, counting the best attempt of each; `since` limits it to recent attempts. */
export function testPoints(s: AppState, cid: CourseId, since = 0) {
  return Object.keys(s.testResults).filter((k) => k.indexOf(cid + ':') === 0 && s.testResults[k].at >= since)
    .reduce((a, k) => a + s.testResults[k].best, 0);
}

/** The first finished chapter whose test has not been taken yet. */
export function nextOpenTest(s: AppState, cid: CourseId): number | null {
  const i = C(s, cid).chapters.findIndex((_, ci) => testStatus(s, cid, ci) === 'ready');
  return i < 0 ? null : i;
}

/** "5 questions · 8 min" */
export const testFacts = (t: ChapterTest) => plural(t.qs.length, 'question') + ' · ' + Math.round(t.seconds / 60) + ' min';

/* ---------- batch roster & leaderboard ---------- */

/** Chapters a generated classmate has finished in any one subject: a batch moves through its subjects at about the same pace. */
const pace = (r: number) => (r < 0.06 ? 0 : r < 0.2 ? 1 : r < 0.5 ? 2 : r < 0.82 ? 3 : r < 0.95 ? 4 : 5);

/** A batch's generated classmates, the same on every call. Stands in for the real roster until it comes from the server. */
function classmates(bid: string): { name: string; pace: number }[] {
  const b = rosterSeed[bid];
  if (!b || !b.size) return [];
  let seed = b.seed, guard = 0;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const out: { name: string; pace: number }[] = [], seen: Record<string, boolean> = {};
  while (out.length < b.size && guard++ < 800) {
    const name = firstNames[Math.floor(rnd() * firstNames.length)] + ' ' + lastNames[Math.floor(rnd() * lastNames.length)];
    if (seen[name]) continue;
    seen[name] = true;
    out.push({ name, pace: pace(rnd()) });
  }
  return out;
}

export interface RosterRow { name: string; done: number; live?: boolean }

/** A batch's progress in one of its subjects, in chapters finished. The signed-in student is in it when it is their batch. */
export function roster(s: AppState, bid: string, cid: CourseId): RosterRow[] {
  const c = s.catalog.courses[cid], mates = classmates(bid);
  if (!c || !mates.length) return [];
  const out: RosterRow[] = mates.map((m) => ({ name: m.name, done: Math.min(c.chapters.length, m.pace) }));
  if (myBatch(s)?.id === bid) out.push({ name: studentName(s), done: doneChapters(s, cid), live: true });
  return out;
}

export interface BoardRow { name: string; pts: number; rank: number; live?: boolean }

/**
 * A batch's leaderboard across all of its subjects.
 * points = 10 × lessons completed + 5 × correct chapter-test answers (best attempt of each test). Ties share a rank.
 * Server note: return only the ±5 window to clients, never the full ranking.
 */
export function boardRows(s: AppState, bid: string, weekly: boolean, now = Date.now()): BoardRow[] {
  const batch = s.catalog.batches[bid], program = batch && s.catalog.programs[batch.program];
  if (!program) return [];
  const subjects = program.courses.map((id) => s.catalog.courses[id]).filter(Boolean);
  const hash = (x: string) => { let h = 7; for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) % 100003; return h; };
  const rows: BoardRow[] = classmates(bid).map((m) => {
    const h = hash(m.name);
    if (weekly) return { name: m.name, rank: 0, pts: ((h >> 5) % 9) * 10 + ((h >> 2) % 6) * 5 };
    let lessons = 0, right = 0;
    subjects.forEach((c, si) => {
      const per = c.chapters.map((ch) => ch.lessons.length), done = Math.min(per.length, m.pace);
      for (let i = 0; i < done; i++) {
        lessons += per[i];
        // 3 or more right on the test of each chapter they finished.
        const t = chapterTest(s, c.id, i);
        if (t) right += Math.min(t.qs.length, 3 + ((h >> (i + 1)) % 3));
      }
      // Part of the way into the next chapter.
      if (done < per.length) lessons += (h >> si) % per[done];
    });
    return { name: m.name, rank: 0, pts: lessons * 10 + right * 5 };
  });
  if (myBatch(s)?.id === bid) {
    const ids = subjects.map((c) => c.id);
    const tests = (since = 0) => ids.reduce((a, id) => a + testPoints(s, id, since), 0);
    const gained = Object.keys(s.progress).filter((k) => ids.includes(k.split(':')[0])).length;
    const done = ids.reduce((a, id) => a + counts(s, id).done, 0);
    rows.push({ name: studentName(s), live: true, rank: 0, pts: weekly ? 30 + gained * 10 + tests(now - 7 * 864e5) * 5 : done * 10 + tests() * 5 });
  }
  rows.forEach((r) => { r.rank = 1 + rows.filter((x) => x.pts > r.pts).length; });
  return rows.sort((a, b) => a.rank - b.rank || (a.live ? -1 : b.live ? 1 : a.name.localeCompare(b.name)));
}

/* ---------- doubts ---------- */

/** A doubt with the teacher's reply from this session, when there is one. */
function withReply(s: AppState, d: Doubt): Doubt {
  const r = s.replies[d.id];
  return r ? { ...d, reply: r.text, by: r.by, replyAgoMin: 0 } : d;
}

/** Every question the signed-in student asked, newest first, across their courses. */
export const myQuestions = (s: AppState): Doubt[] => s.myDoubts.map((d) => withReply(s, { ...d, who: studentName(s), mine: true }));

/**
 * Questions on a course: the student's own first, then everyone else's.
 * A diploma subject passes its batch, since each batch has its own; a single course is shared by everyone taking it.
 */
export function doubtsFor(s: AppState, cid: CourseId, bid?: string): Doubt[] {
  const here = (d: Doubt) => d.course === cid && (!bid || d.batch === bid);
  return myQuestions(s).filter(here).concat(doubtSeed.filter(here).map((d) => withReply(s, d)));
}

/* ---------- saved lessons ---------- */

export interface SavedItem { k: string; cid: CourseId; ci: number; li: number; title: string; ref: string; note: string; bookmarked: boolean; href: string }

/** Lessons the student bookmarked or wrote a note on, in course order. */
export function savedItems(s: AppState): SavedItem[] {
  const keys = new Set(Object.keys(s.bookmarks).concat(Object.keys(s.myNotes).filter((k) => s.myNotes[k].trim())));
  const order = Object.keys(s.catalog.courses);
  const out: SavedItem[] = [];
  keys.forEach((k) => {
    const [cid, ci, li] = k.split(':') as [CourseId, string, string];
    const c = s.catalog.courses[cid], l = c?.chapters[+ci]?.lessons[+li];
    if (!l) return;
    const note = (s.myNotes[k] || '').trim();
    out.push({
      k, cid, ci: +ci, li: +li, title: l.t, ref: c.code + ' · ' + lessonRef(+ci, +li), note, bookmarked: !!s.bookmarks[k],
      href: `/learn/${cid}/${ci}/${li}` + (note ? '?tab=mine' : ''),
    });
  });
  return out.sort((a, b) => order.indexOf(a.cid) - order.indexOf(b.cid) || a.ci - b.ci || a.li - b.li);
}

/* ---------- lesson revisions ---------- */

export function itemKeys(s: AppState): string[] {
  const k: Record<string, 1> = {};
  Object.keys(itemSeeds).forEach((x) => { k[x] = 1; });
  Object.keys(s.tItems).forEach((x) => { k[x] = 1; });
  return Object.keys(k);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function baseItem(s: AppState, k: string): LessonRevision {
  const [cid, rest] = k.split('|') as [CourseId, string];
  const r = rest.split(':'), c = C(s, cid);
  if (r[0] === 'test') {
    // A chapter that already has a test starts published; otherwise this is a new, empty draft.
    const ci = +r[1], t = c.chapters[ci]?.test;
    return {
      kind: 'test', ch: ci, isNew: !t, title: 'Chapter test', status: t ? 'published' : 'draft',
      video: { state: 'none' }, blocks: [], quiz: t ? clone(t.qs) : [], seconds: t ? t.seconds : DEFAULT_TEST_SECONDS,
    };
  }
  if (r[0] === 'lesson') {
    const ci = +r[1], li = +r[2], l = c.chapters[ci].lessons[li];
    const feat = cid === 'dsa' && ci === 2 && li === 4;
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
  const b = baseItem(s, k), seed = itemSeeds[k];
  return seed ? { ...b, ...clone(seed) } : b;
}

export const editorHref = (k: string) => '/teacher/content/' + encodeURIComponent(k);

/** The chapter-test revision the teacher works on, or null while the chapter has no test at all. */
export function testItem(s: AppState, cid: CourseId, ci: number): LessonRevision | null {
  const k = testRevKey(cid, ci);
  return s.tItems[k] || itemSeeds[k] || C(s, cid).chapters[ci]?.test ? item(s, k) : null;
}

/** Where a revision sits: "Chapter 03 · Lesson 05", "Chapter 03 · New lesson" or "Chapter 03 · Chapter test". */
export function revisionRef(it: LessonRevision) {
  const what = it.kind === 'test' ? 'Chapter test' : it.isNew ? 'New lesson' : 'Lesson ' + pad2((it.li as number) + 1);
  return 'Chapter ' + pad2(it.ch + 1) + ' · ' + what;
}

export const keyCourse = (k: string) => k.split('|')[0] as CourseId;

export const blockHasContent = (b: Block) => (b.t === 'img' ? !!b.file : !!(b.x || '').trim());

/** The version students see: the last approved publish, else the original lesson. */
export function studentLesson(s: AppState, cid: CourseId, ci: number, li: number): PublishedLesson {
  const k = cid + '|lesson:' + ci + ':' + li;
  if (s.published[k]) return s.published[k];
  const b = baseItem(s, k);
  return { title: b.title, video: b.video, blocks: b.blocks, quiz: b.quiz };
}

export function issues(it: LessonRevision, numerals: Numerals): string[] {
  const out: string[] = [];
  if (it.kind === 'test') {
    if (it.quiz.length < MIN_TEST_QUESTIONS) out.push('টেস্টে অন্তত ' + digits(MIN_TEST_QUESTIONS, numerals) + 'টা প্রশ্ন লাগবে');
    if (!it.seconds || it.seconds <= 0) out.push('সময়সীমা দাওনি');
  } else {
    if (!(it.title || '').trim()) out.push('লেসনের নাম দাওনি');
    if (!it.video || it.video.state !== 'done') out.push('ভিডিও আপলোড হয়নি');
    if (!it.blocks.some(blockHasContent)) out.push('নোটে কিছু লেখা নেই');
  }
  it.quiz.forEach((q, i) => {
    const n = digits(i + 1, numerals) + ' নম্বর প্রশ্ন';
    if (!q.stem.trim()) out.push(n + 'টা ফাঁকা');
    else if (q.o.some((o) => !o.trim())) out.push(n + 'ের সব অপশন লেখা হয়নি');
    else if (q.a === null || q.a === undefined) out.push(n + 'ে সঠিক উত্তর বাছা হয়নি');
  });
  return out;
}

/** A picked reason in the reader's language. An unknown code is shown as it is. */
export function reasonText(list: Reason[], code: string | undefined, lang: 'en' | 'bn'): string {
  const r = list.find((x) => x.code === code);
  return r ? r[lang] : code || '';
}

/** Why a revision was sent back: the picked reason, then the admin's note on what to fix. */
export const returnReason = (it: LessonRevision, lang: 'en' | 'bn') =>
  [reasonText(contentReasons, it.reason, lang), it.reasonNote].filter(Boolean).join(' — ');

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

/** Settings → Refund policy, as shown to students on the Help page. */
export const refundPolicy = (s: AppState) => ({
  days: Number(s.admin?.settings.refundDays ?? 7) || 7,
  watch: Number(s.admin?.settings.refundWatch ?? 20) || 20,
});

/** Settings → Content protection → Device limit. */
export const deviceLimit = (s: AppState) => s.admin?.settings.devices || 2;

/* ---------- payments ---------- */

export interface MyPayment { id: string; code: string; title: string; method: PayMethod; amount: number; trx: string; when: string; status: PayStatus; href?: string }

/** The signed-in student's payments, newest first: the one being checked now, then earlier ones. */
export function myPayments(s: AppState): MyPayment[] {
  const p = s.payment, now = p.program ? s.catalog.programs[p.program] : undefined;
  const live: MyPayment[] = p.status === 'none' || !now ? [] : [{
    id: 'live', code: now.code, title: programName(s, now, 'bn'), method: p.method || 'bKash', amount: now.price,
    trx: p.trxId || '—', when: 'just now', status: p.status, href: '/enroll/pending',
  }];
  return live.concat(paymentHistory.flatMap((h): MyPayment[] => {
    const hp = s.catalog.programs[h.program];
    return hp ? [{ id: h.id, code: hp.code, title: programName(s, hp, 'bn'), method: h.method, amount: h.amount, trx: h.trx, when: dateEn(h.date), status: h.status }] : [];
  }));
}

/** The student's own payment as the admin's queue shows it. */
export function liveRow(s: AppState): Payment {
  const p = s.payment, prog = p.program ? s.catalog.programs[p.program] : undefined;
  const batch = prog && prog.kind === 'diploma' ? enrollingBatch(s, prog.id) : undefined, price = prog ? prog.price : 0;
  return {
    id: 'live', live: true, name: studentName(s), phone: defaultStudent.phone,
    course: prog ? programName(s, prog) : '—', ...(batch ? { batch: batch.id } : {}), method: p.method || 'bKash',
    amount: price, due: price, trx: p.trxId || '—',
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
  if (r.amount < r.due) f.push('Short by ' + taka(r.due - r.amount));
  if (r.dup) f.push('This TrxID was submitted before');
  if (r.sender !== r.phone) f.push('Paid from a different number');
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
