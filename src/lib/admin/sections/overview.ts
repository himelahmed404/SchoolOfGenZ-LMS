import type { AdminConsole } from '../console';
import type { Item, SectionView } from '../types';

/** Overview: KPI tiles that open their section, generated "needs attention", revenue and recent activity. */
export function overview(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn, tk = c.tk, E = c.env;
  const openRef = S.refunds.filter((r) => r.status === 'open').length;
  const overdue = S.teachers.reduce((a, t) => a + (t.status === 'active' ? t.overdue : 0), 0);
  const live = S.batches.filter((b) => b.status !== 'finished');

  const att: Item[] = [];
  S.courses.forEach((co) => {
    const d = c.days(co.earlyEnd);
    if (co.early === 'on' && d != null && d >= 0 && d <= 14) att.push(c.it(co.code + ' early-bird শেষ হবে ' + bn(d) + ' দিনে', tk(co.earlyPrice) + ' → ' + tk(co.price), '', 'Open', () => c.nav('courses', co.id)));
  });
  live.forEach((b) => {
    const d = c.days(b.exam), left = Number(b.seats) - b.enrolled;
    if (d != null && d >= 0 && d <= 60 && b.status === 'running') att.push(c.it(b.id + ' পরীক্ষা ' + bn(d) + ' দিন পরে', c.fd(b.exam), '', 'Open', () => c.nav('batches', b.id)));
    if (left <= 2 && b.status !== 'closed') att.push(c.it(b.id + ' — মাত্র ' + bn(left) + 'টা সিট বাকি', 'ভর্তি বন্ধ করবে নাকি সিট বাড়াবে?', '', 'Open', () => c.nav('batches', b.id)));
  });
  S.teachers.filter((t) => t.overdue > 0 && t.status === 'active').forEach((t) =>
    att.push(c.it(t.name + ' — ' + bn(t.overdue) + 'টা প্রশ্ন ২৪ ঘণ্টার বেশি পুরনো', 'গড় উত্তর ' + bn(t.med) + ' ঘণ্টা', '', 'Open', () => c.nav('teachers', t.id))));
  const due = S.students.filter((u) => u.due > 0 && u.status === 'active').length;
  if (due) att.push(c.it(bn(due) + ' জনের কিস্তি বাকি', 'রিমাইন্ডার পাঠাও বা অ্যাক্সেস ঠিক করো', '', 'Open', () => c.nav('students', null, 'due')));
  S.coupons.forEach((k) => {
    if (c.couponStatus(k) === 'active' && k.limit && k.limit - k.used <= 60) att.push(c.it(k.code + ' — আর ' + bn(k.limit - k.used) + 'বার ব্যবহার করা যাবে', 'মেয়াদ ' + c.fd(k.exp), '', 'Open', () => c.nav('coupons', k.id)));
  });

  // Seeded until reporting exists.
  const months: [string, number][] = [['মে', 142000], ['জুন', 186000], ['জুলা', 231000], ['আগ', 312000], ['সেপ্টে', 264000], ['অক্টো', 98400]], mx = 312000;
  return {
    title: 'Overview', sub: 'আজ ' + c.fd(c.todayISO()) + ' — কোথায় তোমার মনোযোগ দরকার।', head: [],
    dash: {
      hasSeg: false, seg: [],
      kpis: [
        c.K('Pending payments', bn(E.payCount), 'অনুমোদনের অপেক্ষায়', 'payments', 'warn'),
        c.K('Content to review', bn(E.contentCount), 'শিক্ষকরা জমা দিয়েছেন', 'content', 'blue'),
        c.K('Open refunds', bn(openRef), 'সিদ্ধান্ত বাকি', 'refunds', 'danger'),
        c.K('Overdue doubts', bn(overdue), '২৪ ঘণ্টার বেশি উত্তরহীন', 'teachers', 'warn'),
        c.K('Revenue · অক্টো', tk(98400), '৬ দিনে', 'reports', 'brand'),
        c.K('Active students', bn(live.reduce((a, b) => a + b.enrolled, 0)), bn(live.length) + 'টা ব্যাচে', 'students', 'muted'),
      ],
      panels: [
        { title: 'Needs attention', hasItems: true, items: att.length ? att : [c.it('সব ঠিক আছে — কিছু বাকি নেই।')], hasBars: false, bars: [] },
        { title: 'Revenue — শেষ ৬ মাস', hasBars: true, bars: months.map(([m, v], i) => c.bar(m, tk(v), (v / mx) * 100, i === 5 ? 'var(--warn)' : 'var(--brand)')), hasItems: false, items: [] },
        { title: 'Recent activity', hasItems: true, items: S.activity.slice(0, 5).map((a) => c.it(a.action + ' — ' + a.target, a.actor + ' · ' + a.at, '', 'View', () => c.nav('activity', a.id))), hasBars: false, bars: [] },
      ],
    },
  };
}
