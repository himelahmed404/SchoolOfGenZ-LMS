// Admin console seed data, ported from Admin Console v5. Replace with API data once a server exists.
import type { AdminData, Area, Perm } from './types';

export const AREAS: [Area, string][] = [
  ['payments', 'Payments'], ['content', 'Content review'], ['refunds', 'Refunds'], ['students', 'Students'], ['teachers', 'Teachers'],
  ['certificates', 'Certificates'], ['courses', 'Courses & pricing'], ['batches', 'Batches & exams'], ['coupons', 'Coupons'],
  ['announcements', 'Announcements'], ['reports', 'Reports'], ['activity', 'Activity log'], ['settings', 'Settings'], ['roles', 'Roles & staff'],
];

const perms = (edit: Area[], view: Area[]): Record<Area, Perm> => {
  const p = {} as Record<Area, Perm>;
  AREAS.forEach(([k]) => { p[k] = edit.includes(k) ? 'edit' : view.includes(k) ? 'view' : 'none'; });
  return p;
};

export function adminSeed(): AdminData {
  return {
    roles: [
      { id: 'super', name: 'Super admin', desc: 'সবকিছু — টাকা, সেটিংস, রোল', locked: true, perms: perms(AREAS.map((a) => a[0]), []) },
      { id: 'finance', name: 'Finance', desc: 'পেমেন্ট, রিফান্ড, কুপন', perms: perms(['payments', 'refunds', 'coupons'], ['students', 'reports', 'activity']) },
      { id: 'content', name: 'Content', desc: 'কোর্স, লেসন রিভিউ, ব্যাচ', perms: perms(['content', 'courses'], ['batches', 'teachers', 'certificates']) },
      { id: 'support', name: 'Support', desc: 'স্টুডেন্ট, নোটিশ, সার্টিফিকেট', perms: perms(['students', 'announcements', 'certificates'], ['payments', 'batches', 'teachers']) },
    ],
    staff: [
      { id: 's1', name: 'রিফাত আহমেদ', email: 'rifat@schoolofgenz.com', role: 'super', last: 'এখন' },
      { id: 's2', name: 'নাবিলা চৌধুরী', email: 'nabila@schoolofgenz.com', role: 'finance', last: '১ ঘণ্টা আগে' },
      { id: 's3', name: 'সাকিব রহমান', email: 'sakib@schoolofgenz.com', role: 'content', last: 'গতকাল' },
      { id: 's4', name: 'তাসনিম জাহান', email: 'tasnim@schoolofgenz.com', role: 'support', last: '৩ দিন আগে' },
    ],
    courses: [
      { id: 'cst', code: 'CST', title: 'ডেটা স্ট্রাকচার ও অ্যালগরিদম', status: 'published', model: 'one', price: 3000, inst: 2, early: 'off', earlyPrice: 2500, earlyEnd: '2026-08-01', perBatch: 'on', bp: { 'CST-04-B01': 3000, 'CST-04-B02': 2800 }, lessons: 38 },
      { id: 'eng', code: 'ENG', title: 'স্পোকেন ইংলিশ — ফাউন্ডেশন', status: 'published', model: 'inst', price: 2000, inst: 2, early: 'off', earlyPrice: 1800, earlyEnd: '', perBatch: 'off', bp: {}, lessons: 24 },
      { id: 'web', code: 'WEB', title: 'ওয়েব ডেভেলপমেন্ট বেসিক', status: 'published', model: 'one', price: 2500, inst: 2, early: 'on', earlyPrice: 1999, earlyEnd: '2026-10-15', perBatch: 'off', bp: {}, lessons: 30 },
      { id: 'car', code: 'CAR', title: 'ক্যারিয়ার প্ল্যানিং ১০১', status: 'published', model: 'free', price: 0, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, lessons: 8 },
      { id: 'uix', code: 'UIX', title: 'UI ডিজাইন বেসিক', status: 'draft', model: 'one', price: 2200, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, lessons: 6 },
    ],
    batches: [
      { id: 'CST-04-B01', course: 'cst', start: '2026-08-01', exam: '2026-12-28', seats: 30, enrolled: 28, status: 'running' },
      { id: 'CST-04-B02', course: 'cst', start: '2026-09-01', exam: '2027-01-15', seats: 24, enrolled: 23, status: 'running' },
      { id: 'ENG-02-B07', course: 'eng', start: '2026-08-15', exam: '2026-11-20', seats: 40, enrolled: 31, status: 'running' },
      { id: 'WEB-01-B03', course: 'web', start: '2026-10-12', exam: '2027-02-10', seats: 35, enrolled: 12, status: 'enrolling' },
      { id: 'CAR-01-B02', course: 'car', start: '2026-09-20', exam: '2026-10-30', seats: 200, enrolled: 86, status: 'running' },
      { id: 'CST-03-B02', course: 'cst', start: '2026-01-10', exam: '2026-06-20', seats: 30, enrolled: 29, status: 'finished' },
    ],
    teachers: [
      { id: 't1', name: 'শাহরিয়ার হোসেন', email: 'shahriar@schoolofgenz.com', courses: ['cst'], med: 9, overdue: 3, answered: 41, status: 'active', joined: '2025-12-01' },
      { id: 't2', name: 'তানভীর আহমেদ', email: 'tanvir@schoolofgenz.com', courses: ['web', 'uix'], med: 14, overdue: 0, answered: 12, status: 'active', joined: '2026-03-12' },
      { id: 't3', name: 'ফারজানা ইয়াসমিন', email: 'farzana@schoolofgenz.com', courses: ['eng', 'car'], med: 26, overdue: 5, answered: 33, status: 'active', joined: '2026-01-20' },
      { id: 't4', name: 'মারুফ হাসান', email: 'maruf.h@gmail.com', courses: [], med: 0, overdue: 0, answered: 0, status: 'invited', joined: '2026-10-03' },
    ],
    students: [
      { id: 'u1', name: 'মাহমুদুল হাসান', phone: '01712 448089', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 62, devices: [{ n: 'Redmi Note 12 · Android', last: 'আজ ৯:১২' }], joined: '2026-08-02' },
      { id: 'u2', name: 'সাদিয়া আফরিন', phone: '01812 337742', batch: 'CST-04-B01', status: 'pending', paid: 0, due: 3000, prog: 0, devices: [], joined: '2026-10-06' },
      { id: 'u3', name: 'রাকিব হাসান', phone: '01673 220914', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 48, devices: [{ n: 'Samsung A14 · Android', last: 'গতকাল' }, { n: 'Chrome · Windows', last: '৩ দিন আগে' }], joined: '2026-08-01' },
      { id: 'u4', name: 'সুমাইয়া আক্তার', phone: '01915 783301', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 71, devices: [{ n: 'iPhone 11 · iOS', last: 'আজ ৭:৪০' }], joined: '2026-08-03' },
      { id: 'u5', name: 'রাকিবুল ইসলাম', phone: '01911 208864', batch: 'ENG-02-B07', status: 'active', paid: 1000, due: 1000, prog: 30, devices: [{ n: 'Realme C55 · Android', last: 'গতকাল' }], joined: '2026-08-16' },
      { id: 'u6', name: 'ফারহানা আক্তার', phone: '01521 774096', batch: 'ENG-02-B07', status: 'active', paid: 2000, due: 0, prog: 55, devices: [{ n: 'Chrome · Mac', last: 'আজ ১০:০৫' }], joined: '2026-08-15' },
      { id: 'u7', name: 'তানভীর হোসেন', phone: '01684 991127', batch: 'WEB-01-B03', status: 'pending', paid: 0, due: 1999, prog: 0, devices: [], joined: '2026-10-05' },
      { id: 'u8', name: 'নাফিস ইকবাল', phone: '01844 907715', batch: 'CST-04-B02', status: 'active', paid: 2800, due: 0, prog: 22, devices: [{ n: 'Redmi 13C · Android', last: '২ দিন আগে' }], joined: '2026-09-02' },
      { id: 'u9', name: 'শারমিন সুলতানা', phone: '01555 448802', batch: 'ENG-02-B07', status: 'active', paid: 1000, due: 1000, prog: 84, devices: [{ n: 'Samsung A05 · Android', last: 'আজ ৮:২২' }], joined: '2026-08-15' },
      { id: 'u10', name: 'ফাহিম মুনতাসির', phone: '01788 405521', batch: 'CST-04-B01', status: 'suspended', paid: 3000, due: 0, prog: 40, devices: [{ n: 'Chrome · Windows', last: '৫ দিন আগে' }], joined: '2026-08-01', note: 'লেসন ভিডিও রেকর্ড করে শেয়ার করেছে' },
      { id: 'u11', name: 'জুবায়ের আলম', phone: '01831 662207', batch: 'CST-04-B02', status: 'active', paid: 2800, due: 0, prog: 15, devices: [{ n: 'Tecno Spark · Android', last: 'আজ ৬:৫০' }], joined: '2026-09-01' },
      { id: 'u12', name: 'নাদিয়া ইসলাম', phone: '01624 119830', batch: 'CST-04-B01', status: 'active', paid: 3000, due: 0, prog: 90, devices: [{ n: 'Chrome · Windows', last: 'আজ ৯:৫৮' }], joined: '2026-08-01' },
    ],
    coupons: [
      { id: 'k1', code: 'EARLY500', type: 'amt', value: 500, scope: 'web', used: 42, limit: 100, exp: '2026-10-15', disabled: false },
      { id: 'k2', code: 'FRIEND10', type: 'pct', value: 10, scope: 'all', used: 118, limit: 0, exp: '2026-12-31', disabled: false },
      { id: 'k3', code: 'EID25', type: 'pct', value: 25, scope: 'all', used: 260, limit: 300, exp: '2026-06-20', disabled: false },
      { id: 'k4', code: 'CST300', type: 'amt', value: 300, scope: 'cst', used: 9, limit: 50, exp: '2026-11-30', disabled: true },
    ],
    refunds: [
      { id: 'r1', name: 'নুসরাত জাহান মীম', batch: 'CST-04-B01', paid: 3000, method: 'bKash', number: '01918 442210', ago: 3, watched: 8, why: 'ভুল কোর্সে ভর্তি হয়েছি — ওয়েব ডেভেলপমেন্ট নিতে চেয়েছিলাম।', status: 'open' },
      { id: 'r2', name: 'ইমরান কবির', batch: 'ENG-02-B07', paid: 2000, method: 'bKash', number: '01958 002264', ago: 12, watched: 35, why: 'অফিস শুরু হয়েছে, ক্লাসের সময় মিলছে না।', status: 'open' },
      { id: 'r3', name: 'মেহেদী হাসান', batch: 'WEB-01-B03', paid: 1000, method: 'Nagad', number: '01799 116740', ago: 5, watched: 26, why: 'আমার ফোনে ভিডিও আটকে যায়, দেখতে পারছি না।', status: 'open' },
      { id: 'r4', name: 'রুবাইয়া হক', batch: 'WEB-01-B03', paid: 500, method: 'bKash', number: '01712 664438', ago: 2, watched: 0, why: 'ভুল করে দুইবার পেমেন্ট হয়ে গেছে।', status: 'refunded', amount: 500, reason: 'ডাবল পেমেন্ট' },
      { id: 'r5', name: 'আরিফুল ইসলাম', batch: 'CST-04-B01', paid: 3000, method: 'bKash', number: '01733 550218', ago: 21, watched: 64, why: 'কোর্সটা অনেক কঠিন লাগছে।', status: 'denied', reason: 'পলিসির বাইরে — ৬৪% দেখা' },
    ],
    certs: [
      { id: 'SGZ-CST-2026-0141', name: 'নাদিয়া ইসলাম', course: 'cst', issued: '2026-09-28', status: 'valid' },
      { id: 'SGZ-ENG-2026-0388', name: 'শারমিন সুলতানা', course: 'eng', issued: '2026-09-30', status: 'valid' },
      { id: 'SGZ-CAR-2026-0052', name: 'ফারহানা আক্তার', course: 'car', issued: '2026-08-14', status: 'valid' },
      { id: 'SGZ-CST-2026-0119', name: 'ফাহিম মুনতাসির', course: 'cst', issued: '2026-06-25', status: 'revoked', reason: 'পরীক্ষায় অসদুপায়' },
      { id: 'SGZ-ENG-2026-0371', name: 'রাকিবুল ইসলাম', course: 'eng', issued: '2026-07-02', status: 'valid' },
    ],
    ann: [
      { id: 'a1', title: 'ENG-02-B07 মডেল টেস্ট শনিবার রাত ৯টায়', body: 'শনিবার রাত ৯টায় মডেল টেস্ট ৪ শুরু হবে। ৪০ মিনিট সময়, নেগেটিভ মার্কিং নেই।', aud: 'batch', target: 'ENG-02-B07', ch: ['app', 'sms'], status: 'sent', when: '2026-10-04' },
      { id: 'a2', title: 'পূজার ছুটিতে লাইভ ক্লাস বন্ধ', body: '১০ থেকে ১৩ অক্টোবর লাইভ ক্লাস হবে না। রেকর্ডেড লেসন আর কুইজ খোলা থাকবে।', aud: 'all', target: '', ch: ['app'], status: 'scheduled', when: '2026-10-09' },
      { id: 'a3', title: 'ওয়েব ব্যাচ ০৩ — early-bird শেষ হচ্ছে', body: '১৫ অক্টোবরের পর দাম ৳২,৫০০ হবে। এখনই ভর্তি হলে ৳১,৯৯৯।', aud: 'course', target: 'web', ch: ['app', 'sms'], status: 'draft', when: '' },
    ],
    activity: [
      { id: 'l1', at: '১০ মিনিট আগে', actor: 'নাবিলা চৌধুরী', area: 'payments', action: 'Approved payment', target: 'শারমিন সুলতানা · BKX8N2WS45', reason: '' },
      { id: 'l2', at: '৩৫ মিনিট আগে', actor: 'সাকিব রহমান', area: 'content', action: 'Returned lesson', target: 'CST · অধ্যায় ৩ · লেসন ২', reason: 'কুইজের একটা উত্তর ভুল' },
      { id: 'l3', at: '২ ঘণ্টা আগে', actor: 'রিফাত আহমেদ', area: 'settings', action: 'Changed device limit', target: '১ → ২', reason: 'ফোন + ল্যাপটপ দুটোতে পড়তে চায় অনেকে' },
      { id: 'l4', at: 'গতকাল', actor: 'নাবিলা চৌধুরী', area: 'refunds', action: 'Refunded', target: 'রুবাইয়া হক · ৳৫০০', reason: 'ডাবল পেমেন্ট' },
      { id: 'l5', at: 'গতকাল', actor: 'তাসনিম জাহান', area: 'students', action: 'Reset devices', target: 'রাকিব হাসান', reason: 'নতুন ফোন' },
      { id: 'l6', at: '৩ দিন আগে', actor: 'রিফাত আহমেদ', area: 'certificates', action: 'Revoked certificate', target: 'SGZ-CST-2026-0119', reason: 'পরীক্ষায় অসদুপায়' },
      { id: 'l7', at: '৪ দিন আগে', actor: 'রিফাত আহমেদ', area: 'courses', action: 'Changed price', target: 'WEB · ৳২,৮০০ → ৳২,৫০০', reason: 'প্রতিযোগীদের দামের সাথে মেলানো' },
    ],
    settings: { bkash: '01711 000 222', nagad: '01811 000 333', watermark: 'on', devices: 2, refundDays: 7, refundWatch: 20, autoClose: 'on', sms: 'on' },
    viewAs: 's1',
    navMini: false,
  };
}
