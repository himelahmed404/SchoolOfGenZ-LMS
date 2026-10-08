import { describe, expect, it } from 'vitest';
import { courses, defaultStudent, queueSeed } from './data';
import {
  allQueue, batchLabel, boardRows, chapterDone, chapterTest, counts, courseKicker, courseMeta, deviceLimit, doneChapters, doubtsFor, frontier,
  isDone, isLocked, issues, item, itemKeys, lessonCount, lessonRef, monthCells, myPayments, myQuestions, nextOpenTest, refundPolicy, revisionRef,
  roster, rowFlags, satIndex, savedItems, statusOf, step, studentLesson, studentName, testFacts, testItem, testPoints, testStatus, unreadCount, weekDots,
} from './selectors';
import { initialState, type AppState } from './state';

const s0 = initialState;
const withState = (p: Partial<AppState>): AppState => ({ ...s0, ...p });

describe('course facts', () => {
  it('describes a batch course by semester, batch and dates', () => {
    expect(courseKicker(courses.cst)).toBe('CST · 4th Semester');
    expect(courseMeta(courses.cst)).toBe('4th Semester · Batch 01 · 1 Aug – 28 Dec 2026');
  });

  it('describes a skill course by size and access', () => {
    expect(courseKicker(courses.eng)).toBe('Skill course');
    expect(lessonCount(courses.eng)).toBe(18);
    expect(courseMeta(courses.eng)).toBe('18 lessons · 8 weeks · Lifetime access');
  });

  it('numbers chapters and lessons from their position', () => {
    expect(lessonRef(2, 4)).toBe('Chapter 03 · Lesson 05');
    expect(batchLabel(3)).toBe('Batch 03');
  });

  it('keeps facts free of Bangla digits', () => {
    const facts = [courseKicker(courses.cst), courseMeta(courses.cst), courseMeta(courses.eng), courses.cst.instructor, courses.eng.instructor];
    facts.forEach((f) => expect(f).not.toMatch(/[\u0980-\u09FF]/));
  });
});

describe('progress', () => {
  it('counts seeded lessons as done', () => {
    expect(counts(s0, 'cst')).toEqual({ total: 30, done: 12, pct: 40 });
    expect(isDone(s0, 'cst', 2, 3)).toBe(true);
    expect(isDone(s0, 'cst', 2, 4)).toBe(false);
  });

  it('adds lessons completed in this session', () => {
    const s = withState({ progress: { 'cst:2:4': true } });
    expect(counts(s, 'cst').done).toBe(13);
    expect(frontier(s, 'cst')).toEqual([2, 5]);
  });

  it('puts the frontier on the first unfinished lesson and locks everything after it', () => {
    expect(frontier(s0, 'cst')).toEqual([2, 4]);
    expect(isLocked(s0, 'cst', 2, 4)).toBe(false);
    expect(isLocked(s0, 'cst', 2, 5)).toBe(true);
    expect(isLocked(s0, 'cst', 3, 0)).toBe(true);
    expect(isLocked(s0, 'cst', 0, 0)).toBe(false);
  });

  it('steps across chapter boundaries and stops at the ends', () => {
    expect(step('cst', 2, 5, 1)).toEqual([3, 0]);
    expect(step('cst', 3, 0, -1)).toEqual([2, 5]);
    expect(step('cst', 0, 0, -1)).toBeNull();
    expect(step('cst', 5, 4, 1)).toBeNull();
  });

  it('counts fully finished chapters from the start', () => {
    expect(doneChapters(s0, 'cst')).toBe(2);
    expect(doneChapters(s0, 'eng')).toBe(1);
  });
});

describe('chapter tests', () => {
  it('gives a chapter a test only when one is published for it', () => {
    expect(chapterTest(s0, 'cst', 0)!.qs).toHaveLength(5);
    expect(testFacts(chapterTest(s0, 'cst', 0)!)).toBe('5 questions · 8 min');
    expect(chapterTest(s0, 'cst', 3)).toBeNull();
    expect(chapterTest(s0, 'eng', 0)).toBeNull();
  });

  it('opens the test once the chapter is finished, and never for a chapter without one', () => {
    expect(chapterDone(s0, 'cst', 1)).toBe(true);
    expect(chapterDone(s0, 'cst', 2)).toBe(false);
    expect(testStatus(s0, 'cst', 0)).toBe('done');
    expect(testStatus(s0, 'cst', 1)).toBe('ready');
    expect(testStatus(s0, 'cst', 2)).toBe('locked');
    expect(testStatus(s0, 'cst', 3)).toBe('none');
    expect(testStatus(withState({ test: { key: 'cst:1', startedAt: 1, ans: {}, q: 0 } }), 'cst', 1)).toBe('running');
  });

  it('points the student to the first finished chapter with an untaken test', () => {
    expect(nextOpenTest(s0, 'cst')).toBe(1);
    expect(nextOpenTest(s0, 'eng')).toBeNull();
  });

  it('counts the best score of each test, optionally only recent attempts', () => {
    expect(testPoints(s0, 'cst')).toBe(4);
    expect(testPoints(s0, 'cst', 1)).toBe(0);
    expect(testPoints(s0, 'eng')).toBe(0);
  });

  it('finds the revision a teacher edits for a chapter test', () => {
    expect(testItem(s0, 'cst', 0)).toMatchObject({ kind: 'test', status: 'published', isNew: false, seconds: 480 });
    expect(testItem(s0, 'cst', 3)).toMatchObject({ kind: 'test', status: 'review', isNew: true });
    expect(testItem(s0, 'cst', 4)).toBeNull();
    expect(revisionRef(testItem(s0, 'cst', 3)!)).toBe('Chapter 04 · Chapter test');
    expect(revisionRef(item(s0, 'cst|lesson:2:4'))).toBe('Chapter 03 · Lesson 05');
    expect(revisionRef(item(s0, 'cst|new:5:0'))).toBe('Chapter 06 · New lesson');
  });

  it('asks for five questions and a time limit before a test can be submitted', () => {
    const ok = testItem(s0, 'cst', 0)!;
    expect(issues(ok, 'latin')).toEqual([]);
    expect(issues({ ...ok, quiz: ok.quiz.slice(0, 4) }, 'latin')).toHaveLength(1);
    expect(issues({ ...ok, seconds: 0 }, 'latin')).toHaveLength(1);
  });
});

describe('roster and leaderboard', () => {
  it('builds a stable roster of unique names plus the signed-in student', () => {
    const a = roster(s0, defaultStudent.batch), b = roster(s0, defaultStudent.batch);
    expect(a).toEqual(b);
    expect(a).toHaveLength(31);
    expect(new Set(a.map((r) => r.name)).size).toBe(31);
    expect(a.filter((r) => r.live)).toHaveLength(1);
    expect(roster(s0, 'NO-SUCH-BATCH')).toEqual([]);
  });

  it('uses the name from setup when there is one', () => {
    expect(studentName(s0)).toBe(defaultStudent.name);
    expect(studentName(withState({ prefs: { ...s0.prefs, name: '  রিয়া  ' } }))).toBe('রিয়া');
  });

  it('ranks by points, with ties sharing a rank', () => {
    const rows = boardRows(s0, false);
    expect(rows).toHaveLength(31);
    rows.forEach((r, i) => {
      expect(r.rank).toBe(1 + rows.filter((x) => x.pts > r.pts).length);
      if (i) expect(r.rank).toBeGreaterThanOrEqual(rows[i - 1].rank);
    });
    expect(rows.filter((r) => r.live)).toHaveLength(1);
  });

  it('gives 10 points per lesson, so finishing one moves the student up or keeps the rank', () => {
    const before = boardRows(s0, false).find((r) => r.live)!;
    const after = boardRows(withState({ progress: { 'cst:2:4': true } }), false).find((r) => r.live)!;
    expect(before.pts).toBe(12 * 10 + 4 * 5);
    expect(after.pts - before.pts).toBe(10);
    expect(after.rank).toBeLessThanOrEqual(before.rank);
  });

  it('gives 5 points per correct chapter-test answer, counting the best attempt', () => {
    const better = { ...s0.testResults['cst:0'], score: 2, best: 5, tries: 2 };
    const after = boardRows(withState({ testResults: { 'cst:0': better } }), false).find((r) => r.live)!;
    expect(after.pts).toBe(12 * 10 + 5 * 5);
  });
});

describe('doubts', () => {
  it('lists the batch seed doubts and puts the student\'s own first', () => {
    expect(doubtsFor(withState({ myDoubts: [] }), 'CST-04-B01')).toHaveLength(6);
    const s = withState({ myDoubts: [{ id: 'm1', batch: 'CST-04-B01', course: 'cst', ch: 2, li: 4, q: 'কেন?', who: '', agoMin: 0 }] });
    const list = doubtsFor(s, 'CST-04-B01');
    expect(list).toHaveLength(7);
    expect(list[0]).toMatchObject({ id: 'm1', mine: true, who: defaultStudent.name });
    expect(doubtsFor(s, 'ENG-02-B07').some((d) => d.mine)).toBe(false);
  });

  it('collects the student\'s own questions across courses, with replies', () => {
    expect(myQuestions(s0)).toHaveLength(1);
    expect(myQuestions(s0)[0]).toMatchObject({ id: 'm0', mine: true, by: 'Shahriar Hossain', replyAgoMin: 12 });
    const asked = withState({ myDoubts: [{ id: 'm9', batch: 'ENG-02-B07', course: 'eng', ch: 0, li: 0, q: 'Why?', who: '', agoMin: 0 }], replies: { m9: { text: 'Because', by: 'T' } } });
    expect(myQuestions(asked)[0]).toMatchObject({ reply: 'Because', by: 'T', replyAgoMin: 0 });
  });

  it('merges a teacher reply into the doubt', () => {
    const s = withState({ replies: { d2: { text: 'উত্তর', by: 'T' } } });
    expect(doubtsFor(s, 'CST-04-B01').find((d) => d.id === 'd2')).toMatchObject({ reply: 'উত্তর', by: 'T' });
  });
});

describe('saved lessons', () => {
  it('lists bookmarked lessons and lessons with a note, in course order', () => {
    const list = savedItems(s0);
    expect(list.map((x) => x.k)).toEqual(['cst:1:1', 'cst:2:4']);
    expect(list[1]).toMatchObject({ ref: 'CST · Chapter 03 · Lesson 05', bookmarked: true, href: '/learn/cst/2/4?tab=mine' });
    expect(list[0]).toMatchObject({ note: '', href: '/learn/cst/1/1' });
  });

  it('includes a lesson that only has a note, and skips blank notes and unknown lessons', () => {
    const s = withState({ bookmarks: { 'cst:9:9': true }, myNotes: { 'eng:0:1': 'note', 'cst:0:0': '   ' } });
    expect(savedItems(s)).toEqual([expect.objectContaining({ k: 'eng:0:1', bookmarked: false, ref: 'ENG · Chapter 01 · Lesson 02' })]);
  });
});

describe('lesson revisions', () => {
  it('derives a published revision for an untouched lesson', () => {
    const it0 = item(s0, 'cst|lesson:0:0');
    expect(it0).toMatchObject({ kind: 'lesson', status: 'published', ch: 0, li: 0 });
    expect(it0.video.state).toBe('done');
  });

  it('layers seed revisions and teacher edits over the base', () => {
    expect(item(s0, 'cst|lesson:5:4').status).toBe('review');
    expect(item(s0, 'cst|new:5:0')).toMatchObject({ status: 'draft', isNew: true });
    const edited = { ...item(s0, 'cst|lesson:0:0'), title: 'বদলানো' };
    expect(item(withState({ tItems: { 'cst|lesson:0:0': edited } }), 'cst|lesson:0:0').title).toBe('বদলানো');
  });

  it('lists seed keys and teacher keys once each', () => {
    const keys = itemKeys(withState({ tItems: { 'cst|lesson:5:4': item(s0, 'cst|lesson:5:4'), 'cst|new:1:9': item(s0, 'cst|new:1:9') } }));
    expect(keys.filter((k) => k === 'cst|lesson:5:4')).toHaveLength(1);
    expect(keys).toContain('cst|new:1:9');
    expect(keys).toContain('cst|test:3');
  });

  it('shows students the last published version, not the pending one', () => {
    expect(studentLesson(s0, 'cst', 2, 4).quiz).toHaveLength(7);
    const pub = { title: 'নতুন', video: { state: 'done' as const }, blocks: [], quiz: [] };
    expect(studentLesson(withState({ published: { 'cst|lesson:2:4': pub } }), 'cst', 2, 4).title).toBe('নতুন');
  });

  it('reports what blocks a submission', () => {
    expect(issues(item(s0, 'cst|new:9:9'), 'latin')).toHaveLength(3);
    const ok = item(s0, 'cst|lesson:2:4');
    expect(issues(ok, 'latin')).toEqual([]);
    const badQuiz = { ...ok, quiz: [{ stem: 'প্রশ্ন', o: ['ক', 'খ', 'গ', 'ঘ'], a: null }] };
    expect(issues(badQuiz, 'latin')).toHaveLength(1);
  });

  it('labels each status', () => {
    expect(statusOf(item(s0, 'cst|lesson:5:4'))[0]).toBe('● Pending');
    expect(statusOf(item(s0, 'cst|lesson:4:3'))[0]).toBe('✗ Returned');
    expect(statusOf(item(s0, 'cst|lesson:0:0'))[0]).toBe('Published');
  });
});

describe('payment queue', () => {
  it('shows the seed queue, with the student\'s own payment first once submitted', () => {
    expect(allQueue(s0)).toHaveLength(queueSeed.length);
    const s = withState({ payment: { method: 'bKash', trxId: 'BKX7M2QP41', sender: '', status: 'pending' } });
    const q = allQueue(s);
    expect(q).toHaveLength(queueSeed.length + 1);
    expect(q[0]).toMatchObject({ id: 'live', live: true, trx: 'BKX7M2QP41', status: 'pending' });
  });

  it('applies admin decisions to seed rows', () => {
    const s = withState({ decided: { q1: { status: 'rejected', reason: 'ভুল TrxID' } } });
    expect(allQueue(s).find((r) => r.id === 'q1')).toMatchObject({ status: 'rejected', rejectReason: 'ভুল TrxID' });
  });

  it('flags short payments, reused TrxIDs and a different sender', () => {
    const by = (id: string) => rowFlags(queueSeed.find((r) => r.id === id)!);
    expect(by('q1')).toEqual([]);
    expect(by('q2')).toHaveLength(1);
    expect(by('q3')).toHaveLength(1);
    expect(by('q6')).toHaveLength(1);
  });
});

describe('the student\'s own payments and policies', () => {
  it('shows earlier payments, with the one being checked first', () => {
    expect(myPayments(s0).map((r) => r.id)).toEqual(['p2', 'p1']);
    expect(myPayments(s0)[1]).toMatchObject({ code: 'CST', amount: 3000, when: '2 Aug 2026', status: 'approved' });
    const s = withState({ payment: { method: 'Nagad', trxId: 'NGD0000001', sender: '', status: 'rejected', reason: 'ভুল TrxID' } });
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
