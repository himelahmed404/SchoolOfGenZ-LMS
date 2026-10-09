// Admin console seed data, ported from Admin Console v5. A list is deleted from here when its section moves to the API
// (roles and staff already have).
// The console is English only, so every seeded name, title and reason is English.
import type { AdminData, Area } from './types';

export const AREAS: [Area, string][] = [
  ['payments', 'Payments'], ['content', 'Content review'], ['refunds', 'Refunds'], ['students', 'Students'], ['teachers', 'Teachers'],
  ['certificates', 'Certificates'], ['courses', 'Courses & pricing'], ['batches', 'Batches & exams'], ['coupons', 'Coupons'],
  ['announcements', 'Announcements'], ['reports', 'Reports'], ['activity', 'Activity log'], ['settings', 'Settings'], ['roles', 'Roles & staff'],
];

export function adminSeed(): AdminData {
  const now = Date.now();
  /** Timestamp of something that happened `min` minutes ago. */
  const minsAgo = (min: number) => now - min * 60000;

  return {
    courses: [
      { id: 'cst4', kind: 'diploma', code: 'CST', title: 'CST · 4th Semester', status: 'published', model: 'one', price: 3000, inst: 2, early: 'off', earlyPrice: 2500, earlyEnd: '2026-08-01', perBatch: 'on', bp: { 'CST-04-B01': 3000, 'CST-04-B02': 2800 }, enrolled: 0,
        subjects: [
          { id: 'math4', code: 'MATH', title: 'Mathematics-4', lessons: 22 }, { id: 'dsa', code: 'DSA', title: 'Data Structure & Algorithm', lessons: 30 },
          { id: 'dbms', code: 'DBMS', title: 'Database Management System', lessons: 18 }, { id: 'wdd', code: 'WDD', title: 'Web Design & Development', lessons: 24 },
          { id: 'de2', code: 'DE2', title: 'Digital Electronics-2', lessons: 16 }, { id: 'mp', code: 'MP', title: 'Microprocessor', lessons: 14 }, { id: 'soc', code: 'SOC', title: 'Social Science', lessons: 12 },
        ] },
      { id: 'cst5', kind: 'diploma', code: 'CST', title: 'CST · 5th Semester', status: 'published', model: 'one', price: 3200, inst: 2, early: 'on', earlyPrice: 2800, earlyEnd: '2026-12-31', perBatch: 'off', bp: {}, enrolled: 0,
        subjects: [
          { id: 'os', code: 'OS', title: 'Operating System', lessons: 8 }, { id: 'net', code: 'NET', title: 'Computer Network', lessons: 8 },
          { id: 'java', code: 'JAVA', title: 'Java Programming', lessons: 9 }, { id: 'se', code: 'SE', title: 'Software Engineering', lessons: 6 },
        ] },
      { id: 'cst3', kind: 'diploma', code: 'CST', title: 'CST · 3rd Semester', status: 'archived', model: 'one', price: 2800, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, enrolled: 0,
        subjects: [{ id: 'prog', code: 'PROG', title: 'Programming in C', lessons: 26 }, { id: 'math3', code: 'MTH3', title: 'Mathematics-3', lessons: 20 }] },
      { id: 'eng', kind: 'single', code: 'ENG', title: 'Spoken English — Foundation', status: 'published', model: 'inst', price: 2000, inst: 2, early: 'off', earlyPrice: 1800, earlyEnd: '', perBatch: 'off', bp: {}, enrolled: 318,
        subjects: [{ id: 'eng', code: 'ENG', title: 'Spoken English — Foundation', lessons: 18 }] },
      { id: 'web', kind: 'single', code: 'WEB', title: 'Web Development Basics', status: 'published', model: 'one', price: 2500, inst: 2, early: 'on', earlyPrice: 1999, earlyEnd: '2026-10-15', perBatch: 'off', bp: {}, enrolled: 126,
        subjects: [{ id: 'web', code: 'WEB', title: 'Web Development Basics', lessons: 24 }] },
      { id: 'car', kind: 'single', code: 'CAR', title: 'Career Planning 101', status: 'published', model: 'free', price: 0, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, enrolled: 86,
        subjects: [{ id: 'car', code: 'CAR', title: 'Career Planning 101', lessons: 8 }] },
      { id: 'uix', kind: 'single', code: 'UIX', title: 'UI Design Basics', status: 'draft', model: 'one', price: 2200, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, enrolled: 0,
        subjects: [{ id: 'uix', code: 'UIX', title: 'UI Design Basics', lessons: 6 }] },
    ],
    // Diploma courses run in batches. Single courses have none.
    batches: [
      { id: 'CST-04-B01', course: 'cst4', start: '2026-08-01', exam: '2026-12-28', seats: 30, enrolled: 28, status: 'running' },
      { id: 'CST-04-B02', course: 'cst4', start: '2026-09-01', exam: '2027-01-15', seats: 24, enrolled: 23, status: 'running' },
      { id: 'CST-05-B01', course: 'cst5', start: '2027-01-10', exam: '2027-06-20', seats: 35, enrolled: 12, status: 'enrolling' },
      { id: 'CST-03-B02', course: 'cst3', start: '2026-01-10', exam: '2026-06-20', seats: 30, enrolled: 29, status: 'finished' },
    ],
    teachers: [
      { id: 't1', name: 'Shahriar Hossain', email: 'shahriar@schoolofgenz.com', courses: ['dsa', 'math4', 'java'], med: 9, overdue: 3, answered: 41, status: 'active', joined: '2025-12-01' },
      { id: 't2', name: 'Tanvir Ahmed', email: 'tanvir@schoolofgenz.com', courses: ['dbms', 'wdd', 'net', 'se', 'web', 'uix'], med: 14, overdue: 0, answered: 12, status: 'active', joined: '2026-03-12' },
      { id: 't3', name: 'Farzana Yasmin', email: 'farzana@schoolofgenz.com', courses: ['soc', 'eng', 'car'], med: 26, overdue: 5, answered: 33, status: 'active', joined: '2026-01-20' },
      { id: 't5', name: 'Imtiaz Rahman', email: 'imtiaz@schoolofgenz.com', courses: ['de2', 'mp', 'os'], med: 11, overdue: 0, answered: 19, status: 'active', joined: '2026-02-08' },
      { id: 't4', name: 'Maruf Hasan', email: 'maruf.h@gmail.com', courses: [], med: 0, overdue: 0, answered: 0, status: 'invited', joined: '2026-10-03' },
    ],
    students: [
      { id: 'u1', name: 'Mahmudul Hasan', phone: '01712 448089', course: 'cst4', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 62, devices: [{ n: 'Redmi Note 12 · Android', last: 'today 9:12 AM' }], joined: '2026-08-02' },
      { id: 'u2', name: 'Sadia Afrin', phone: '01812 337742', course: 'cst4', batch: 'CST-04-B01', status: 'pending', paid: 0, due: 3000, prog: 0, devices: [], joined: '2026-10-06' },
      { id: 'u3', name: 'Rakib Hasan', phone: '01673 220914', course: 'cst4', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 48, devices: [{ n: 'Samsung A14 · Android', last: 'yesterday' }, { n: 'Chrome · Windows', last: '3 days ago' }], joined: '2026-08-01' },
      { id: 'u4', name: 'Sumaiya Akter', phone: '01915 783301', course: 'cst4', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 71, devices: [{ n: 'iPhone 11 · iOS', last: 'today 7:40 AM' }], joined: '2026-08-03' },
      { id: 'u5', name: 'Rakibul Islam', phone: '01911 208864', course: 'eng', status: 'active', paid: 1000, due: 1000, prog: 30, devices: [{ n: 'Realme C55 · Android', last: 'yesterday' }], joined: '2026-08-16' },
      { id: 'u6', name: 'Farhana Akter', phone: '01521 774096', course: 'eng', status: 'active', paid: 2000, due: 0, prog: 55, devices: [{ n: 'Chrome · Mac', last: 'today 10:05 AM' }], joined: '2026-08-15' },
      { id: 'u7', name: 'Tanvir Hossain', phone: '01684 991127', course: 'web', status: 'pending', paid: 0, due: 1999, prog: 0, devices: [], joined: '2026-10-05' },
      { id: 'u8', name: 'Nafis Iqbal', phone: '01844 907715', course: 'cst4', batch: 'CST-04-B02', status: 'active', paid: 2800, due: 0, prog: 22, devices: [{ n: 'Redmi 13C · Android', last: '2 days ago' }], joined: '2026-09-02' },
      { id: 'u9', name: 'Sharmin Sultana', phone: '01555 448802', course: 'eng', status: 'active', paid: 1000, due: 1000, prog: 84, devices: [{ n: 'Samsung A05 · Android', last: 'today 8:22 AM' }], joined: '2026-08-15' },
      { id: 'u10', name: 'Fahim Muntasir', phone: '01788 405521', course: 'cst4', batch: 'CST-04-B01', status: 'suspended', paid: 3000, due: 0, prog: 40, devices: [{ n: 'Chrome · Windows', last: '5 days ago' }], joined: '2026-08-01', note: 'Recorded lesson videos and shared them' },
      { id: 'u11', name: 'Jubayer Alam', phone: '01831 662207', course: 'cst4', batch: 'CST-04-B02', status: 'active', paid: 2800, due: 0, prog: 15, devices: [{ n: 'Tecno Spark · Android', last: 'today 6:50 AM' }], joined: '2026-09-01' },
      { id: 'u12', name: 'Nadia Islam', phone: '01624 119830', course: 'cst4', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 90, devices: [{ n: 'Chrome · Windows', last: 'today 9:58 AM' }], joined: '2026-08-01' },
    ],
    coupons: [
      { id: 'k1', code: 'EARLY500', type: 'amt', value: 500, scope: 'web', used: 42, limit: 100, exp: '2026-10-15', disabled: false },
      { id: 'k2', code: 'FRIEND10', type: 'pct', value: 10, scope: 'all', used: 118, limit: 0, exp: '2026-12-31', disabled: false },
      { id: 'k3', code: 'EID25', type: 'pct', value: 25, scope: 'all', used: 260, limit: 300, exp: '2026-06-20', disabled: false },
      { id: 'k4', code: 'CST300', type: 'amt', value: 300, scope: 'cst4', used: 9, limit: 50, exp: '2026-11-30', disabled: true },
    ],
    refunds: [
      { id: 'r1', name: 'Nusrat Jahan Mim', course: 'cst4', batch: 'CST-04-B01', paid: 3000, method: 'bKash', number: '01918 442210', ago: 3, watched: 8, why: 'I enrolled in the wrong course. I wanted Web Development.', status: 'open' },
      { id: 'r2', name: 'Imran Kabir', course: 'eng', paid: 2000, method: 'bKash', number: '01958 002264', ago: 12, watched: 35, why: 'My job started and I no longer have time for it.', status: 'open' },
      { id: 'r3', name: 'Mehedi Hasan', course: 'web', paid: 1000, method: 'Nagad', number: '01799 116740', ago: 5, watched: 26, why: 'Videos keep freezing on my phone. I cannot watch them.', status: 'open' },
      { id: 'r4', name: 'Rubaiya Haque', course: 'web', paid: 500, method: 'bKash', number: '01712 664438', ago: 2, watched: 0, why: 'I paid twice by mistake.', status: 'refunded', amount: 500, reason: 'Double payment' },
      { id: 'r5', name: 'Ariful Islam', course: 'cst4', batch: 'CST-04-B01', paid: 3000, method: 'bKash', number: '01733 550218', ago: 21, watched: 64, why: 'The course feels too hard.', status: 'denied', reason: 'Outside policy — 64% watched' },
    ],
    // Only single courses give a certificate.
    certs: [
      { id: 'SGZ-WEB-2026-0141', name: 'Nadia Islam', course: 'web', issued: '2026-09-28', status: 'valid' },
      { id: 'SGZ-ENG-2026-0388', name: 'Sharmin Sultana', course: 'eng', issued: '2026-09-30', status: 'valid' },
      { id: 'SGZ-CAR-2026-0052', name: 'Farhana Akter', course: 'car', issued: '2026-08-14', status: 'valid' },
      { id: 'SGZ-WEB-2026-0119', name: 'Fahim Muntasir', course: 'web', issued: '2026-06-25', status: 'revoked', reason: 'Copied another student\'s project' },
      { id: 'SGZ-ENG-2026-0371', name: 'Rakibul Islam', course: 'eng', issued: '2026-07-02', status: 'valid' },
    ],
    ann: [
      { id: 'a1', title: 'CST-04-B01: Chapter 03 test opens Saturday 9 PM', body: 'The Chapter 03 test opens on Saturday at 9 PM. It takes 8 minutes, is optional and has no negative marking.', aud: 'batch', target: 'CST-04-B01', ch: ['app', 'sms'], status: 'sent', when: '2026-10-04' },
      { id: 'a2', title: 'No live classes during the Puja holiday', body: 'There are no live classes from 10 to 13 October. Recorded lessons and quizzes stay open.', aud: 'all', target: '', ch: ['app'], status: 'scheduled', when: '2026-10-09' },
      { id: 'a3', title: 'Web Development: early-bird ends soon', body: 'The price becomes ৳2,500 after 15 October. Enroll now for ৳1,999.', aud: 'course', target: 'web', ch: ['app', 'sms'], status: 'draft', when: '' },
    ],
    activity: [
      { id: 'l1', at: minsAgo(10), actor: 'Nabila Chowdhury', area: 'payments', action: 'Approved payment', target: 'Sharmin Sultana · BKX8N2WS45', reason: '' },
      { id: 'l2', at: minsAgo(35), actor: 'Sakib Rahman', area: 'content', action: 'Returned lesson', target: 'DSA · Chapter 03 · Lesson 02', reason: 'One quiz answer is wrong' },
      { id: 'l3', at: minsAgo(120), actor: 'Rifat Ahmed', area: 'settings', action: 'Changed device limit', target: '1 → 2', reason: 'Many students study on both a phone and a laptop' },
      { id: 'l4', at: minsAgo(1500), actor: 'Nabila Chowdhury', area: 'refunds', action: 'Refunded', target: 'Rubaiya Haque · ৳500', reason: 'Double payment' },
      { id: 'l5', at: minsAgo(1560), actor: 'Tasnim Jahan', area: 'students', action: 'Reset devices', target: 'Rakib Hasan', reason: 'New phone' },
      { id: 'l6', at: minsAgo(4320), actor: 'Rifat Ahmed', area: 'certificates', action: 'Revoked certificate', target: 'SGZ-WEB-2026-0119', reason: 'Copied another student\'s project' },
      { id: 'l7', at: minsAgo(5760), actor: 'Rifat Ahmed', area: 'courses', action: 'Changed price', target: 'WEB · ৳2,800 → ৳2,500', reason: 'Matching competitors\' prices' },
    ],
    // Merchant numbers are the ones students see on the payment page.
    settings: { bkash: '01777 090909', nagad: '01888 070707', watermark: 'on', devices: 2, refundDays: 7, refundWatch: 20, autoClose: 'on', sms: 'on' },
    navMini: false,
  };
}
