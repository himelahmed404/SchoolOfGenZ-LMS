import { describe, expect, it } from 'vitest';
import {
  askDoubt, chooseProgram, clearNotifs, completeLesson, createDraft, decideContent, decidePayments, markRead, newLessonKey, patchItem,
  resetPayment, savePosition, saveStudentProfile, setMyNote, startTest, startUpload, submitForReview, submitPayment, submitTest,
  testElapsed, toggleBookmark, trxTaken, withdraw,
} from './actions';
import { allQueue, chapterTest, counts, item, myCourses, myPrograms, offers, testRevKey, testStatus } from './selectors';
import { initialState, type AppState } from './state';

const s0 = initialState;
const courses = s0.catalog.courses;

describe('completing lessons', () => {
  it('marks the lesson done and moves the resume point to the next one', () => {
    const r = completeLesson(s0, 'dsa', 2, 4);
    expect(r.s.progress['dsa:2:4']).toBe(true);
    expect(r.next).toEqual([2, 5]);
    expect(r.s.last).toEqual({ courseId: 'dsa', ch: 2, li: 5, t: 0 });
    expect(r.courseDone).toBe(false);
  });

  it('reports the course as done on its last lesson', () => {
    let s: AppState = s0;
    courses.dsa.chapters.forEach((ch, ci) => ch.lessons.forEach((_, li) => { s = completeLesson(s, 'dsa', ci, li).s; }));
    const c = counts(s, 'dsa');
    expect(c.done).toBe(c.total);
    const last = completeLesson(s, 'dsa', 5, 4);
    expect(last.courseDone).toBe(true);
    expect(last.next).toBeNull();
  });

  it('saves the playback position only for the resume lesson', () => {
    expect(savePosition(s0, 'dsa', 2, 4, 90).last.t).toBe(90);
    expect(savePosition(s0, 'dsa', 0, 0, 90)).toBe(s0);
    expect(savePosition(s0, 'dsa', 2, 4, s0.last.t)).toBe(s0);
  });
});

describe('chapter tests', () => {
  const key = 'dsa:1';
  const right = courses.dsa.chapters[1].test!.qs.map((q) => q.a as number);
  const answer = (s: AppState, ans: number[]): AppState => ({ ...s, test: { ...s.test, ans: Object.fromEntries(ans.map((a, i) => [i, a])) } });

  it('opens one attempt at a time', () => {
    const s = startTest(s0, key, 1000);
    expect(s.test).toEqual({ key, startedAt: 1000, ans: {}, q: 0 });
    expect(startTest(answer(s, [1]), 'dsa:0', 2000).test).toEqual({ key: 'dsa:0', startedAt: 2000, ans: {}, q: 0 });
  });

  it('counts elapsed seconds up to the time limit', () => {
    const s = startTest(s0, key, 1000);
    expect(testElapsed(s, 61_000, 480)).toBe(60);
    expect(testElapsed(s, 9_999_000, 480)).toBe(480);
    expect(testElapsed(s0, 61_000, 480)).toBe(0);
  });

  it('scores the attempt, closes it and keeps the questions it was answered against', () => {
    const s = submitTest(answer(startTest(s0, key, 1000), right), 91_000);
    expect(s.test.key).toBeNull();
    expect(s.testResults[key]).toMatchObject({ score: 5, total: 5, best: 5, tries: 1, elapsed: 90, at: 91_000 });
    expect(s.testResults[key].qs).toHaveLength(5);
    expect(testStatus(s, 'dsa', 1)).toBe('done');
  });

  it('keeps the best score when a retake goes worse', () => {
    const first = submitTest(answer(startTest(s0, key, 1000), right), 2000);
    const second = submitTest(answer(startTest(first, key, 3000), [right[0]]), 4000);
    expect(second.testResults[key]).toMatchObject({ score: 1, best: 5, tries: 2 });
  });

  it('does nothing when no test is running', () => {
    expect(submitTest(s0, 5000)).toBe(s0);
  });
});

describe('bookmarks and notes', () => {
  it('toggles a bookmark', () => {
    const on = toggleBookmark(s0, 'dsa:0:0');
    expect(on.bookmarks['dsa:0:0']).toBe(true);
    expect(toggleBookmark(on, 'dsa:0:0').bookmarks['dsa:0:0']).toBeUndefined();
  });

  it('stores a private note per lesson', () => {
    expect(setMyNote(s0, 'dsa:0:0', 'মনে রাখো').myNotes['dsa:0:0']).toBe('মনে রাখো');
  });
});

describe('payments', () => {
  it('knows a TrxID that is already in the queue, whatever its case', () => {
    expect(trxTaken(s0, ' bkx9t4lm20 ')).toBe(true);
    expect(trxTaken(s0, 'NEW0000001')).toBe(false);
  });

  it('counts the student\'s own earlier submission as taken', () => {
    const s = submitPayment({ ...s0, payment: { program: 'web', method: 'bKash', trxId: 'OWN0000001', sender: '', status: 'none' } });
    expect(s.payment.status).toBe('pending');
    expect(trxTaken(s, 'own0000001')).toBe(true);
  });

  it('applies an admin decision to the live payment and to seed rows', () => {
    const pending = submitPayment({ ...s0, payment: { program: 'web', method: 'Nagad', trxId: 'OWN0000001', sender: '', status: 'none' } });
    const s = decidePayments(pending, ['live', 'q1'], 'rejected', 'wrong_trx');
    expect(s.payment).toMatchObject({ status: 'rejected', reason: 'wrong_trx' });
    expect(allQueue(s).find((r) => r.id === 'q1')?.status).toBe('rejected');
    expect(s.enrollments).toEqual(s0.enrollments);
    // Sending it again is for the same program.
    expect(resetPayment(s).payment).toMatchObject({ status: 'none', program: 'web', trxId: '' });
  });

  it('pays for one program at a time', () => {
    const picked = chooseProgram(s0, 'web');
    expect(picked.payment).toMatchObject({ program: 'web', status: 'none' });
    expect(submitPayment(s0)).toBe(s0);
    const pending = submitPayment({ ...picked, payment: { ...picked.payment, method: 'bKash', trxId: 'OWN0000002' } });
    expect(chooseProgram(pending, 'cst5')).toBe(pending);
    const done = decidePayments(pending, ['live'], 'approved');
    expect(chooseProgram(done, 'cst5').payment).toMatchObject({ program: 'cst5', status: 'none', trxId: '' });
  });

  it('enrolls the student in a single course when its payment is approved, with no batch', () => {
    const pending = submitPayment({ ...chooseProgram(s0, 'web'), payment: { program: 'web', method: 'bKash', trxId: 'OWN0000003', sender: '', status: 'none' } });
    const s = decidePayments(pending, ['live'], 'approved');
    expect(s.enrollments[s.enrollments.length - 1]).toEqual({ program: 'web' });
    expect(myCourses(s).some((c) => c.id === 'web')).toBe(true);
    expect(offers(s).some((o) => o.program.id === 'web')).toBe(false);
    // Approving again does not enroll twice.
    expect(decidePayments(s, ['live'], 'approved').enrollments).toHaveLength(s.enrollments.length);
  });

  it('enrolls the student in the batch that is taking students when a diploma payment is approved', () => {
    const pending = submitPayment({ ...s0, payment: { program: 'cst5', method: 'Nagad', trxId: 'OWN0000004', sender: '', status: 'none' } });
    const s = decidePayments(pending, ['live'], 'approved');
    expect(s.enrollments[s.enrollments.length - 1]).toEqual({ program: 'cst5', batch: 'CST-05-B01' });
    const sem = myPrograms(s).find((m) => m.program.id === 'cst5')!;
    expect(sem.courses.map((c) => c.id)).toEqual(['os', 'net', 'java', 'se']);
  });
});

describe('doubts', () => {
  it('files a question under the student\'s batch in a diploma subject, and under no batch in a single course', () => {
    const s = askDoubt(s0, 'dsa', 2, 4, 'কেন?');
    expect(s.myDoubts[0]).toMatchObject({ batch: 'CST-04-B01', course: 'dsa', ch: 2, li: 4, q: 'কেন?' });
    expect(askDoubt(s0, 'math4', 0, 0, 'কেন?').myDoubts[0].batch).toBe('CST-04-B01');
    expect('batch' in askDoubt(s0, 'eng', 0, 0, 'Why?').myDoubts[0]).toBe(false);
  });
});

describe('teacher revisions', () => {
  const k = 'dsa|lesson:0:0';

  it('turns an edited published lesson into a draft update', () => {
    const s = patchItem(s0, k, { title: 'নতুন নাম' });
    expect(item(s, k)).toMatchObject({ title: 'নতুন নাম', status: 'draft', update: true });
  });

  it('refuses edits while the revision is in review', () => {
    const inReview = submitForReview(patchItem(s0, k, { title: 'ক' }), k, 'T');
    expect(item(inReview, k).status).toBe('review');
    expect(patchItem(inReview, k, { title: 'খ' })).toBe(inReview);
    expect(item(withdraw(inReview, k), k).status).toBe('draft');
  });

  it('creates a blank draft for a new lesson', () => {
    const nk = newLessonKey('dsa', 3);
    expect(nk.startsWith('dsa|new:3:')).toBe(true);
    expect(item(createDraft(s0, nk), nk)).toMatchObject({ isNew: true, status: 'draft', ch: 3, title: '' });
  });

  it('creates an empty test draft for a chapter that has none', () => {
    const tk = testRevKey('dsa', 4);
    expect(item(createDraft(s0, tk), tk)).toMatchObject({ kind: 'test', isNew: true, status: 'draft', ch: 4, quiz: [], seconds: 600 });
  });

  it('starts a video upload unless the revision is locked', () => {
    const s = startUpload(s0, k);
    expect(s.upload).toEqual({ key: k, pct: 0 });
    expect(item(s, k).video.state).toBe('uploading');
    const locked = submitForReview(s0, k, 'T');
    expect(startUpload(locked, k)).toBe(locked);
  });
});

describe('admin content review', () => {
  it('publishes an update to students', () => {
    const k = 'dsa|lesson:5:4';
    const s = decideContent(s0, k, 'published');
    expect(item(s, k)).toMatchObject({ status: 'published', update: false });
    expect(s.published[k].quiz).toHaveLength(2);
    expect(s.aDecided[k]).toBe('published');
  });

  it('does not give a brand-new lesson a student slot yet', () => {
    const k = 'dsa|new:3:0';
    const s = decideContent(s0, k, 'published');
    expect(item(s, k).status).toBe('published');
    expect(s.published[k]).toBeUndefined();
  });

  it('publishes a new chapter test, so the chapter gains a test for students', () => {
    const k = testRevKey('dsa', 3);
    expect(chapterTest(s0, 'dsa', 3)).toBeNull();
    const s = decideContent(s0, k, 'published');
    expect(item(s, k)).toMatchObject({ status: 'published', isNew: false });
    expect(chapterTest(s, 'dsa', 3)).toMatchObject({ seconds: 600 });
    expect(chapterTest(s, 'dsa', 3)!.qs).toHaveLength(5);
  });

  it('returns a revision with the reason', () => {
    const k = 'dsa|lesson:5:4';
    expect(item(decideContent(s0, k, 'returned', 'wrong_answer', 'question 2'), k)).toMatchObject({ status: 'returned', reason: 'wrong_answer', reasonNote: 'question 2' });
    expect(item(submitForReview(decideContent(s0, k, 'returned', 'wrong_answer', 'question 2'), k, 'T'), k)).toMatchObject({ status: 'review', reason: '', reasonNote: '' });
  });
});

describe('notifications and profile', () => {
  it('marks notifications read and clears them', () => {
    expect(markRead(s0, ['s1']).notifs.read.s1).toBe(true);
    expect(clearNotifs(s0, ['s1', 's2']).notifs.gone).toEqual({ s1: true, s2: true });
  });

  it('drops the manual exam date when the semester changes', () => {
    const s = { ...s0, prefs: { ...s0.prefs, examDate: '2026-12-20' } };
    const same = saveStudentProfile(s, { name: 'ক', email: 'a@b.c', inst: 'X', sem: s.prefs.sem });
    expect(same.prefs.examDate).toBe('2026-12-20');
    const moved = saveStudentProfile(s, { name: 'ক', email: 'a@b.c', inst: 'X', sem: 5 });
    expect(moved.prefs).toMatchObject({ sem: 5, examDate: null, name: 'ক' });
    expect(moved.profile).toMatchObject({ email: 'a@b.c', inst: 'X' });
  });
});
