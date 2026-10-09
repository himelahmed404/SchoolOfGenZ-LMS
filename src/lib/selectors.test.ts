import type { Me } from '@contract';
import { describe, expect, it } from 'vitest';
import { boardExam, contentReasons, defaultStudent, queueSeed, rejectReasons } from './data';
import {
  allQueue, batchLabel, batchOf, boardRows, chapterDone, chapterTest, counts, courseKicker, courseMeta, deviceLimit, doneChapters, doubtsFor, examISO, frontier, isDone, isLocked, isSingle, issues, item, itemKeys, lessonCount, lessonRef, liveRow, monthCells, myBatch, myCourses, myPayments, myPrograms, myQuestions, nextOpenTest, offers, offerView, payingOffer, programName, programOf, reasonText, refundPolicy, resumePoint, returnReason, revisionRef, roster, rowFlags, satIndex, savedItems, semesterOf, statusOf, step, studentLesson, studentName, studentPhone, subjectMeta, testFacts, testItem, testPoints, testStatus, unreadCount, weekDots,
} from './selectors';
import { initialState, type AppState } from './state';

const s0 = initialState;
const withState = (p: Partial<AppState>): AppState => ({ ...s0, ...p });
/** Someone signed in, as the API describes them. */
const person = (kind: Me['kind'], p: Partial<Me> = {}): Me => ({
  id: 'u1', kind, name: 'Riya Das', phone: kind === 'student' ? '01911000111' : null, email: null, numerals: 'bn', semester: null, institute: null,
  examDate: null, setupDone: true, bio: null, subjects: [], role: null, ...p,
});
const courses = s0.catalog.courses;
const BATCH = 'CST-04-B01';
/** Lessons the seeded student has finished across the seven subjects of their semester. */
const semesterDone = s0.catalog.programs.cst4.courses.reduce((a, id) => a + counts(s0, id).done, 0);

describe('course facts', () => {
  it('describes a diploma subject by its semester, batch and dates', () => {
    expect(courseKicker(s0, courses.dsa)).toBe('CST · 4th Semester');
    expect(courseMeta(s0, courses.dsa)).toBe('4th Semester · Batch 01 · 1 Aug – 28 Dec 2026');
    expect(subjectMeta(courses.dsa)).toBe('BTEB 25942 · 30 lessons');
  });

  it('describes a single course by size and access, with no batch', () => {
    expect(courseKicker(s0, courses.eng)).toBe('Skill course');
    expect(lessonCount(courses.eng)).toBe(18);
    expect(courseMeta(s0, courses.eng)).toBe('18 lessons · 8 weeks · Lifetime access');
  });

  it('numbers chapters and lessons from their position', () => {
    expect(lessonRef(2, 4)).toBe('Chapter 03 · Lesson 05');
    expect(batchLabel(3)).toBe('Batch 03');
  });

  it('keeps facts free of Bangla digits', () => {
    const facts = [courseKicker(s0, courses.dsa), courseMeta(s0, courses.dsa), courseMeta(s0, courses.eng), subjectMeta(courses.math4), courses.dsa.instructor, courses.eng.instructor];
    facts.forEach((f) => expect(f).not.toMatch(/[\u0980-\u09FF]/));
  });
});

describe('progress', () => {
  it('counts seeded lessons as done', () => {
    expect(counts(s0, 'dsa')).toEqual({ total: 30, done: 12, pct: 40 });
    expect(isDone(s0, 'dsa', 2, 3)).toBe(true);
    expect(isDone(s0, 'dsa', 2, 4)).toBe(false);
  });

  it('adds lessons completed in this session', () => {
    const s = withState({ progress: { 'dsa:2:4': true } });
    expect(counts(s, 'dsa').done).toBe(13);
    expect(frontier(s, 'dsa')).toEqual([2, 5]);
  });

  it('puts the frontier on the first unfinished lesson and locks everything after it', () => {
    expect(frontier(s0, 'dsa')).toEqual([2, 4]);
    expect(isLocked(s0, 'dsa', 2, 4)).toBe(false);
    expect(isLocked(s0, 'dsa', 2, 5)).toBe(true);
    expect(isLocked(s0, 'dsa', 3, 0)).toBe(true);
    expect(isLocked(s0, 'dsa', 0, 0)).toBe(false);
  });

  it('steps across chapter boundaries and stops at the ends', () => {
    expect(step(s0, 'dsa', 2, 5, 1)).toEqual([3, 0]);
    expect(step(s0, 'dsa', 3, 0, -1)).toEqual([2, 5]);
    expect(step(s0, 'dsa', 0, 0, -1)).toBeNull();
    expect(step(s0, 'dsa', 5, 4, 1)).toBeNull();
  });

  it('counts fully finished chapters from the start', () => {
    expect(doneChapters(s0, 'dsa')).toBe(2);
    expect(doneChapters(s0, 'eng')).toBe(1);
  });
});

describe('chapter tests', () => {
  it('gives a chapter a test only when one is published for it', () => {
    expect(chapterTest(s0, 'dsa', 0)!.qs).toHaveLength(5);
    expect(testFacts(chapterTest(s0, 'dsa', 0)!)).toBe('5 questions · 8 min');
    expect(chapterTest(s0, 'dsa', 3)).toBeNull();
    expect(chapterTest(s0, 'eng', 0)).toBeNull();
  });

  it('opens the test once the chapter is finished, and never for a chapter without one', () => {
    expect(chapterDone(s0, 'dsa', 1)).toBe(true);
    expect(chapterDone(s0, 'dsa', 2)).toBe(false);
    expect(testStatus(s0, 'dsa', 0)).toBe('done');
    expect(testStatus(s0, 'dsa', 1)).toBe('ready');
    expect(testStatus(s0, 'dsa', 2)).toBe('locked');
    expect(testStatus(s0, 'dsa', 3)).toBe('none');
    expect(testStatus(withState({ test: { key: 'dsa:1', startedAt: 1, ans: {}, q: 0 } }), 'dsa', 1)).toBe('running');
  });

  it('points the student to the first finished chapter with an untaken test', () => {
    expect(nextOpenTest(s0, 'dsa')).toBe(1);
    expect(nextOpenTest(s0, 'eng')).toBeNull();
  });

  it('counts the best score of each test, optionally only recent attempts', () => {
    expect(testPoints(s0, 'dsa')).toBe(4);
    expect(testPoints(s0, 'dsa', 1)).toBe(0);
    expect(testPoints(s0, 'eng')).toBe(0);
  });

  it('finds the revision a teacher edits for a chapter test', () => {
    expect(testItem(s0, 'dsa', 0)).toMatchObject({ kind: 'test', status: 'published', isNew: false, seconds: 480 });
    expect(testItem(s0, 'dsa', 3)).toMatchObject({ kind: 'test', status: 'review', isNew: true });
    expect(testItem(s0, 'dsa', 4)).toBeNull();
    expect(revisionRef(testItem(s0, 'dsa', 3)!)).toBe('Chapter 04 · Chapter test');
    expect(revisionRef(item(s0, 'dsa|lesson:2:4'))).toBe('Chapter 03 · Lesson 05');
    expect(revisionRef(item(s0, 'dsa|new:5:0'))).toBe('Chapter 06 · New lesson');
  });

  it('asks for five questions and a time limit before a test can be submitted', () => {
    const ok = testItem(s0, 'dsa', 0)!;
    expect(issues(ok, 'latin')).toEqual([]);
    expect(issues({ ...ok, quiz: ok.quiz.slice(0, 4) }, 'latin')).toHaveLength(1);
    expect(issues({ ...ok, seconds: 0 }, 'latin')).toHaveLength(1);
  });
});

describe('roster and leaderboard', () => {
  it('builds a stable roster of unique names plus the signed-in student', () => {
    const a = roster(s0, BATCH, 'dsa'), b = roster(s0, BATCH, 'dsa');
    expect(a).toEqual(b);
    expect(a).toHaveLength(31);
    expect(new Set(a.map((r) => r.name)).size).toBe(31);
    expect(a.filter((r) => r.live)).toHaveLength(1);
    expect(roster(s0, 'NO-SUCH-BATCH', 'dsa')).toEqual([]);
    expect(roster(s0, BATCH, 'no-such-course')).toEqual([]);
  });

  it('shows the same classmates in every subject, and the student only in their own batch', () => {
    const names = (cid: string) => roster(s0, BATCH, cid).map((r) => r.name);
    expect(names('math4')).toEqual(names('dsa'));
    // A subject with four chapters cannot show more than four finished.
    expect(Math.max(...roster(s0, BATCH, 'de2').map((r) => r.done))).toBeLessThanOrEqual(4);
    expect(roster(s0, 'CST-04-B02', 'dsa').some((r) => r.live)).toBe(false);
  });

  it('names the signed-in student, and the seeded one while a teacher or an admin is looking', () => {
    expect(studentName(s0)).toBe(defaultStudent.name);
    expect(studentName(withState({ me: person('student', { name: '  রিয়া  ' }) }))).toBe('রিয়া');
    expect(studentPhone(withState({ me: person('student') }))).toBe('01911000111');
    expect(studentName(withState({ me: person('teacher', { name: 'Tanvir Ahmed' }) }))).toBe(defaultStudent.name);
    expect(studentPhone(withState({ me: person('staff') }))).toBe(defaultStudent.phone);
  });

  it('takes the semester from the account, and otherwise from the diploma program the student is in', () => {
    expect(semesterOf(withState({ me: person('student', { semester: 6 }) }))).toBe(6);
    expect(semesterOf(withState({ me: person('student') }))).toBe(4);
    expect(semesterOf(withState({ me: person('student'), enrollments: [{ program: 'eng' }] }))).toBe(1);
  });

  it('uses the exam date the student set, and otherwise the board date for their semester', () => {
    expect(examISO(withState({ me: person('student', { semester: 5, examDate: '2026-12-20' }) }))).toBe('2026-12-20');
    expect(examISO(withState({ me: person('student', { semester: 5 }) }))).toBe(boardExam.odd);
    expect(examISO(withState({ me: person('student', { semester: 4 }) }))).toBe(boardExam.even);
  });

  it('shows the admin the payment under the student\'s own name and number', () => {
    const paying = withState({ me: person('student'), payment: { ...s0.payment, program: 'web', trxId: 'BKX1', status: 'pending' } });
    expect(liveRow(paying)).toMatchObject({ name: 'Riya Das', phone: '01911 000111', sender: '01911 000111' });
    expect(liveRow({ ...paying, me: person('staff') })).toMatchObject({ name: defaultStudent.name, phone: '01712 445589' });
  });

  it('ranks by points, with ties sharing a rank', () => {
    const rows = boardRows(s0, BATCH, false);
    expect(rows).toHaveLength(31);
    rows.forEach((r, i) => {
      expect(r.rank).toBe(1 + rows.filter((x) => x.pts > r.pts).length);
      if (i) expect(r.rank).toBeGreaterThanOrEqual(rows[i - 1].rank);
    });
    expect(rows.filter((r) => r.live)).toHaveLength(1);
  });

  it('gives 10 points per lesson, so finishing one moves the student up or keeps the rank', () => {
    const before = boardRows(s0, BATCH, false).find((r) => r.live)!;
    const after = boardRows(withState({ progress: { 'dsa:2:4': true } }), BATCH, false).find((r) => r.live)!;
    expect(before.pts).toBe(semesterDone * 10 + 4 * 5);
    expect(after.pts - before.pts).toBe(10);
    expect(after.rank).toBeLessThanOrEqual(before.rank);
  });

  it('counts every subject of the semester, not one', () => {
    expect(semesterDone).toBeGreaterThan(counts(s0, 'dsa').done);
    const before = boardRows(s0, BATCH, false).find((r) => r.live)!;
    // A lesson in another subject of the same batch counts; one in a single course does not.
    const [ci, li] = frontier(s0, 'math4');
    expect(boardRows(withState({ progress: { ['math4:' + ci + ':' + li]: true } }), BATCH, false).find((r) => r.live)!.pts - before.pts).toBe(10);
    const [ei, el] = frontier(s0, 'eng');
    expect(boardRows(withState({ progress: { ['eng:' + ei + ':' + el]: true } }), BATCH, false).find((r) => r.live)!.pts).toBe(before.pts);
  });

  it('has no leaderboard for a batch the student is not in, or for none', () => {
    expect(boardRows(s0, 'CST-04-B02', false).some((r) => r.live)).toBe(false);
    expect(boardRows(s0, 'NO-SUCH-BATCH', false)).toEqual([]);
    expect(myBatch(withState({ enrollments: [{ program: 'eng' }] }))).toBeUndefined();
  });

  it('gives 5 points per correct chapter-test answer, counting the best attempt', () => {
    const better = { ...s0.testResults['dsa:0'], score: 2, best: 5, tries: 2 };
    const after = boardRows(withState({ testResults: { 'dsa:0': better } }), BATCH, false).find((r) => r.live)!;
    expect(after.pts).toBe(semesterDone * 10 + 5 * 5);
  });
});

describe('doubts', () => {
  it('lists a subject\'s questions for one batch and puts the student\'s own first', () => {
    expect(doubtsFor(withState({ myDoubts: [] }), 'dsa', BATCH)).toHaveLength(6);
    const s = withState({ myDoubts: [{ id: 'm1', batch: BATCH, course: 'dsa', ch: 2, li: 4, q: 'কেন?', who: '', agoMin: 0 }] });
    const list = doubtsFor(s, 'dsa', BATCH);
    expect(list).toHaveLength(7);
    expect(list[0]).toMatchObject({ id: 'm1', mine: true, who: defaultStudent.name });
    expect(doubtsFor(s, 'dsa', 'CST-04-B02')).toEqual([]);
    expect(doubtsFor(s, 'math4', BATCH)).toEqual([]);
  });

  it('shares a single course\'s questions among everyone taking it', () => {
    const s = withState({ myDoubts: [{ id: 'm2', course: 'eng', ch: 0, li: 0, q: 'Why?', who: '', agoMin: 0 }] });
    expect(doubtsFor(s, 'eng')).toHaveLength(1);
    expect(doubtsFor(s, 'eng')[0].batch).toBeUndefined();
  });

  it('collects the student\'s own questions across courses, with replies', () => {
    expect(myQuestions(s0)).toHaveLength(1);
    expect(myQuestions(s0)[0]).toMatchObject({ id: 'm0', mine: true, by: 'Shahriar Hossain', replyAgoMin: 12 });
    const asked = withState({ myDoubts: [{ id: 'm9', course: 'eng', ch: 0, li: 0, q: 'Why?', who: '', agoMin: 0 }], replies: { m9: { text: 'Because', by: 'T' } } });
    expect(myQuestions(asked)[0]).toMatchObject({ reply: 'Because', by: 'T', replyAgoMin: 0 });
  });

  it('merges a teacher reply into the doubt', () => {
    const s = withState({ replies: { d2: { text: 'উত্তর', by: 'T' } } });
    expect(doubtsFor(s, 'dsa', BATCH).find((d) => d.id === 'd2')).toMatchObject({ reply: 'উত্তর', by: 'T' });
  });
});

describe('saved lessons', () => {
  it('lists bookmarked lessons and lessons with a note, in course order', () => {
    const list = savedItems(s0);
    expect(list.map((x) => x.k)).toEqual(['dsa:1:1', 'dsa:2:4']);
    expect(list[1]).toMatchObject({ ref: 'DSA · Chapter 03 · Lesson 05', bookmarked: true, href: '/learn/dsa/2/4?tab=mine' });
    expect(list[0]).toMatchObject({ note: '', href: '/learn/dsa/1/1' });
  });

  it('includes a lesson that only has a note, and skips blank notes and unknown lessons', () => {
    const s = withState({ bookmarks: { 'dsa:9:9': true }, myNotes: { 'eng:0:1': 'note', 'dsa:0:0': '   ' } });
    expect(savedItems(s)).toEqual([expect.objectContaining({ k: 'eng:0:1', bookmarked: false, ref: 'ENG · Chapter 01 · Lesson 02' })]);
  });
});

describe('lesson revisions', () => {
  it('derives a published revision for an untouched lesson', () => {
    const it0 = item(s0, 'dsa|lesson:0:0');
    expect(it0).toMatchObject({ kind: 'lesson', status: 'published', ch: 0, li: 0 });
    expect(it0.video.state).toBe('done');
  });

  it('layers seed revisions and teacher edits over the base', () => {
    expect(item(s0, 'dsa|lesson:5:4').status).toBe('review');
    expect(item(s0, 'dsa|new:5:0')).toMatchObject({ status: 'draft', isNew: true });
    const edited = { ...item(s0, 'dsa|lesson:0:0'), title: 'বদলানো' };
    expect(item(withState({ tItems: { 'dsa|lesson:0:0': edited } }), 'dsa|lesson:0:0').title).toBe('বদলানো');
  });

  it('lists seed keys and teacher keys once each', () => {
    const keys = itemKeys(withState({ tItems: { 'dsa|lesson:5:4': item(s0, 'dsa|lesson:5:4'), 'dsa|new:1:9': item(s0, 'dsa|new:1:9') } }));
    expect(keys.filter((k) => k === 'dsa|lesson:5:4')).toHaveLength(1);
    expect(keys).toContain('dsa|new:1:9');
    expect(keys).toContain('dsa|test:3');
  });

  it('shows students the last published version, not the pending one', () => {
    expect(studentLesson(s0, 'dsa', 2, 4).quiz).toHaveLength(7);
    const pub = { title: 'নতুন', video: { state: 'done' as const }, blocks: [], quiz: [] };
    expect(studentLesson(withState({ published: { 'dsa|lesson:2:4': pub } }), 'dsa', 2, 4).title).toBe('নতুন');
  });

  it('reports what blocks a submission', () => {
    expect(issues(item(s0, 'dsa|new:9:9'), 'latin')).toHaveLength(3);
    const ok = item(s0, 'dsa|lesson:2:4');
    expect(issues(ok, 'latin')).toEqual([]);
    const badQuiz = { ...ok, quiz: [{ stem: 'প্রশ্ন', o: ['ক', 'খ', 'গ', 'ঘ'], a: null }] };
    expect(issues(badQuiz, 'latin')).toHaveLength(1);
  });

  it('explains a return with the picked reason and the admin\'s note, per audience', () => {
    const it0 = item(s0, 'dsa|lesson:4:3');
    expect(returnReason(it0, 'en')).toBe('Video sound or picture unclear — 4:10 to 6:00');
    expect(returnReason(it0, 'bn')).toBe(contentReasons[0].bn + ' — 4:10 to 6:00');
    expect(returnReason(item(s0, 'dsa|lesson:0:0'), 'en')).toBe('');
  });

  it('labels each status', () => {
    expect(statusOf(item(s0, 'dsa|lesson:5:4'))[0]).toBe('● Pending');
    expect(statusOf(item(s0, 'dsa|lesson:4:3'))[0]).toBe('✗ Returned');
    expect(statusOf(item(s0, 'dsa|lesson:0:0'))[0]).toBe('Published');
  });
});

describe('payment queue', () => {
  it('shows the seed queue, with the student\'s own payment first once submitted', () => {
    expect(allQueue(s0)).toHaveLength(queueSeed.length);
    const s = withState({ payment: { program: 'web', method: 'bKash', trxId: 'BKX7M2QP41', sender: '', status: 'pending' } });
    const q = allQueue(s);
    expect(q).toHaveLength(queueSeed.length + 1);
    expect(q[0]).toMatchObject({ id: 'live', live: true, trx: 'BKX7M2QP41', status: 'pending' });
  });

  it('applies admin decisions to seed rows', () => {
    const s = withState({ decided: { q1: { status: 'rejected', reason: 'wrong_trx' } } });
    expect(allQueue(s).find((r) => r.id === 'q1')).toMatchObject({ status: 'rejected', rejectReason: 'wrong_trx' });
  });

  it('flags short payments, reused TrxIDs and a different sender', () => {
    const by = (id: string) => rowFlags(queueSeed.find((r) => r.id === id)!);
    expect(by('q1')).toEqual([]);
    expect(by('q2')).toHaveLength(1);
    expect(by('q3')).toHaveLength(1);
    expect(by('q6')).toHaveLength(1);
    expect(by('q2')[0]).toBe('Short by ৳500');
  });

  it('labels a picked reason for the admin in English and for the student in Bangla', () => {
    expect(reasonText(rejectReasons, 'wrong_trx', 'en')).toBe('Wrong TrxID');
    expect(reasonText(rejectReasons, 'wrong_trx', 'bn')).toBe('ভুল TrxID');
    expect(reasonText(rejectReasons, 'typed by hand', 'bn')).toBe('typed by hand');
    expect(reasonText(rejectReasons, undefined, 'en')).toBe('');
  });
});

describe('the student\'s own payments and policies', () => {
  it('shows earlier payments, with the one being checked first', () => {
    expect(myPayments(s0).map((r) => r.id)).toEqual(['p2', 'p1']);
    expect(myPayments(s0)[1]).toMatchObject({ code: 'CST', amount: 3000, when: '2 Aug 2026', status: 'approved' });
    const s = withState({ payment: { program: 'web', method: 'Nagad', trxId: 'NGD0000001', sender: '', status: 'rejected', reason: 'ভুল TrxID' } });
    expect(myPayments(s)[0]).toMatchObject({ id: 'live', code: 'WEB', status: 'rejected', href: '/enroll/pending' });
  });

  it('reads the refund policy and device limit from the admin settings, with defaults', () => {
    expect(refundPolicy(s0)).toEqual({ days: 7, watch: 20 });
    expect(deviceLimit(s0)).toBe(2);
  });
});

describe('streak calendar', () => {
  // Thursday 8 Oct 2026; the seeded streak is 12 days ending today.
  const today = new Date(2026, 9, 8);

  it('starts the week on Saturday', () => {
    expect(satIndex(new Date(2026, 9, 3))).toBe(0);
    expect(satIndex(today)).toBe(5);
  });

  it('marks studied days up to today and none after', () => {
    const dots = weekDots(today);
    expect(dots).toHaveLength(7);
    expect(dots.map((d) => d.studied)).toEqual([true, true, true, true, true, true, false]);
    expect(dots.findIndex((d) => d.today)).toBe(5);
  });

  it('lays the month out as six Saturday-first weeks', () => {
    const cells = monthCells(today);
    expect(cells).toHaveLength(42);
    expect(cells.filter((c) => c.today)).toHaveLength(1);
    expect(cells.filter((c) => c.studied)).toHaveLength(12);
    expect(cells.some((c) => c.future && c.studied)).toBe(false);
  });
});

describe('notifications', () => {
  it('counts unread ones and ignores cleared ones', () => {
    expect(unreadCount(s0, 'student')).toBe(3);
    expect(unreadCount(s0, 'teacher')).toBe(2);
    const s = withState({ notifs: { read: {}, gone: { s1: true } } });
    expect(unreadCount(s, 'student')).toBe(4);
  });
});

describe('where Continue goes', () => {
  it('is the lesson the student stopped on, in the course they were last in', () => {
    expect(resumePoint(initialState, 'dsa')).toEqual([2, 4]);
  });
  it('is the first unfinished lesson of any other course', () => {
    expect(resumePoint(initialState, 'eng')).toEqual(frontier(initialState, 'eng'));
    expect(isDone(initialState, 'eng', ...resumePoint(initialState, 'eng'))).toBe(false);
  });
});

describe('programs, batches and courses', () => {
  it('lists what the student is in: a semester with its subjects, then a single course', () => {
    const mine = myPrograms(s0);
    expect(mine.map((m) => m.program.id)).toEqual(['cst4', 'eng']);
    expect(mine[0].batch).toMatchObject({ id: BATCH, no: 1 });
    expect(mine[0].courses.map((c) => c.id)).toEqual(['math4', 'dsa', 'dbms', 'wdd', 'de2', 'mp', 'soc']);
    expect(mine[1].batch).toBeUndefined();
    expect(mine[1].courses.map((c) => c.id)).toEqual(['eng']);
    expect(myCourses(s0)).toHaveLength(8);
    expect(myBatch(s0)!.id).toBe(BATCH);
  });

  it('finds the program and batch a course is studied in', () => {
    expect(programOf(s0, 'dbms')).toMatchObject({ id: 'cst4', kind: 'diploma' });
    expect(batchOf(s0, 'dbms')!.id).toBe(BATCH);
    expect(isSingle(s0, 'dbms')).toBe(false);
    expect(programOf(s0, 'web')!.id).toBe('web');
    expect(batchOf(s0, 'eng')).toBeUndefined();
    expect(isSingle(s0, 'eng')).toBe(true);
  });

  it('names a diploma program by its facts and a single course by its title', () => {
    const P = s0.catalog.programs;
    expect(programName(s0, P.cst4)).toBe('CST · 4th Semester');
    expect(programName(s0, P.cst4, 'bn')).toBe('CST · 4th Semester');
    expect(programName(s0, P.web)).toBe('Web Development Basics');
    expect(programName(s0, P.web, 'bn')).toBe(courses.web.title);
  });

  it('offers every single course, and a diploma program only while a batch is enrolling', () => {
    const open = offers(s0);
    expect(open.map((o) => o.program.id)).toEqual(['cst5', 'web']);
    expect(open[0].batch).toMatchObject({ id: 'CST-05-B01', status: 'enrolling' });
    expect(open[1].batch).toBeUndefined();
    // The semester the student is in has two running batches and none enrolling, and they are in it anyway.
    expect(open.some((o) => o.program.id === 'cst4')).toBe(false);
    expect(offers(withState({ enrollments: [] })).map((o) => o.program.id)).toEqual(['cst5', 'eng', 'web']);
  });

  it('reads a diploma batch by its dates and subjects, and a single course as recorded and kept for life', () => {
    const [sem, web] = offers(s0);
    expect(offerView(s0, sem)).toMatchObject({ code: 'CST', kicker: 'Diploma batch', title: 'CST · 5th Semester', who: '', facts: 'Batch 01 · 10 Jan – 20 Jun 2027 · 4 subjects', price: 3200, terms: 'One-time · For the semester' });
    expect(offerView(s0, web)).toMatchObject({ code: 'WEB', kicker: 'Skill course', title: courses.web.title, who: 'Tanvir Ahmed', facts: '24 lessons · 10 weeks · Recorded', price: 2500, terms: 'One-time · Lifetime access' });
  });

  it('knows what the student is paying for, and the batch it is for', () => {
    expect(payingOffer(s0)).toBeUndefined();
    const pay = (program: string) => withState({ payment: { program, method: 'bKash', trxId: 'BKX0000001', sender: '', status: 'pending' } });
    expect(payingOffer(pay('cst5'))).toMatchObject({ program: { id: 'cst5' }, batch: { id: 'CST-05-B01' } });
    expect(payingOffer(pay('web'))!.batch).toBeUndefined();
    expect(liveRow(pay('cst5'))).toMatchObject({ course: 'CST · 5th Semester', batch: 'CST-05-B01', amount: 3200, due: 3200 });
    expect(liveRow(pay('web'))).toMatchObject({ course: 'Web Development Basics', amount: 2500 });
    expect(liveRow(pay('web')).batch).toBeUndefined();
  });

  it('gives chapter tests to diploma subjects only', () => {
    Object.values(s0.catalog.programs).filter((p) => p.kind === 'single').forEach((p) => p.courses.forEach((id) => {
      courses[id].chapters.forEach((_, ci) => expect(chapterTest(s0, id, ci)).toBeNull());
    }));
  });
});
