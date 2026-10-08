import { describe, expect, it } from 'vitest';
import {
  askDoubt, clearNotifs, completeLesson, createLesson, decideContent, decidePayments, markRead, newLessonKey, patchItem,
  resetPayment, savePosition, saveStudentProfile, setMyNote, startUpload, submitForReview, submitPayment, toggleBookmark,
  trxTaken, withdraw,
} from './actions';
import { courses } from './data';
import { allQueue, counts, item } from './selectors';
import { initialState, type AppState } from './state';

const s0 = initialState;

describe('completing lessons', () => {
  it('marks the lesson done and moves the resume point to the next one', () => {
    const r = completeLesson(s0, 'cst', 2, 4);
    expect(r.s.progress['cst:2:4']).toBe(true);
    expect(r.next).toEqual([2, 5]);
    expect(r.s.last).toEqual({ courseId: 'cst', ch: 2, li: 5, t: 0 });
    expect(r.courseDone).toBe(false);
  });

  it('reports the course as done on its last lesson', () => {
    let s: AppState = s0;
    courses.cst.chapters.forEach((ch, ci) => ch.lessons.forEach((_, li) => { s = completeLesson(s, 'cst', ci, li).s; }));
    const c = counts(s, 'cst');
    expect(c.done).toBe(c.total);
    const last = completeLesson(s, 'cst', 5, 4);
    expect(last.courseDone).toBe(true);
    expect(last.next).toBeNull();
  });

  it('saves the playback position only for the resume lesson', () => {
    expect(savePosition(s0, 'cst', 2, 4, 90).last.t).toBe(90);
    expect(savePosition(s0, 'cst', 0, 0, 90)).toBe(s0);
    expect(savePosition(s0, 'cst', 2, 4, s0.last.t)).toBe(s0);
  });
});

describe('bookmarks and notes', () => {
  it('toggles a bookmark', () => {
    const on = toggleBookmark(s0, 'cst:0:0');
    expect(on.bookmarks['cst:0:0']).toBe(true);
    expect(toggleBookmark(on, 'cst:0:0').bookmarks['cst:0:0']).toBeUndefined();
  });

  it('stores a private note per lesson', () => {
    expect(setMyNote(s0, 'cst:0:0', 'মনে রাখো').myNotes['cst:0:0']).toBe('মনে রাখো');
  });
});

describe('payments', () => {
  it('knows a TrxID that is already in the queue, whatever its case', () => {
    expect(trxTaken(s0, ' bkx9t4lm20 ')).toBe(true);
    expect(trxTaken(s0, 'NEW0000001')).toBe(false);
  });

  it('counts the student\'s own earlier submission as taken', () => {
    const s = submitPayment({ ...s0, payment: { method: 'bKash', trxId: 'OWN0000001', sender: '', status: 'none' } });
    expect(s.payment.status).toBe('pending');
    expect(trxTaken(s, 'own0000001')).toBe(true);
  });

  it('applies an admin decision to the live payment and to seed rows', () => {
    const pending = submitPayment({ ...s0, payment: { method: 'Nagad', trxId: 'OWN0000001', sender: '', status: 'none' } });
    const s = decidePayments(pending, ['live', 'q1'], 'rejected', 'ভুল TrxID');
    expect(s.payment).toMatchObject({ status: 'rejected', reason: 'ভুল TrxID' });
    expect(allQueue(s).find((r) => r.id === 'q1')?.status).toBe('rejected');
    expect(resetPayment(s).payment.status).toBe('none');
  });
});

describe('doubts', () => {
  it('files a question under the student\'s batch for that course', () => {
    const s = askDoubt(s0, 'cst', 2, 4, 'কেন?');
    expect(s.myDoubts[0]).toMatchObject({ batch: 'CST-04-B01', course: 'cst', ch: 2, li: 4, q: 'কেন?' });
    expect(askDoubt(s0, 'eng', 0, 0, 'Why?').myDoubts[0].batch).toBe('ENG-02-B07');
  });
});

describe('teacher revisions', () => {
  const k = 'cst|lesson:0:0';

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
    const nk = newLessonKey('cst', 3);
    expect(nk.startsWith('cst|new:3:')).toBe(true);
    expect(item(createLesson(s0, nk), nk)).toMatchObject({ isNew: true, status: 'draft', ch: 3, title: '' });
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
    const k = 'cst|lesson:5:4';
    const s = decideContent(s0, k, 'published');
    expect(item(s, k)).toMatchObject({ status: 'published', update: false });
    expect(s.published[k].quiz).toHaveLength(2);
    expect(s.aDecided[k]).toBe('published');
  });

  it('does not give a brand-new lesson a student slot yet', () => {
    const k = 'cst|new:3:0';
    const s = decideContent(s0, k, 'published');
    expect(item(s, k).status).toBe('published');
    expect(s.published[k]).toBeUndefined();
  });

  it('returns a revision with the reason', () => {
    const k = 'cst|lesson:5:4';
    expect(item(decideContent(s0, k, 'returned', 'কুইজের উত্তর ভুল'), k)).toMatchObject({ status: 'returned', reason: 'কুইজের উত্তর ভুল' });
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
