import type { AdminConsole } from '../console';
import type { Item, SectionView } from '../types';

/** Overview: KPI tiles that open their section, generated "needs attention", revenue and recent activity. */
export function overview(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk, E = c.env;
  const openRef = S.refunds.filter((r) => r.status === 'open').length;
  const overdue = S.teachers.reduce((a, t) => a + (t.status === 'active' ? t.overdue : 0), 0);
  const live = S.batches.filter((b) => b.status !== 'finished');

  const att: Item[] = [];
  S.courses.forEach((co) => {
    const d = c.days(co.earlyEnd);
    if (co.early === 'on' && d != null && d >= 0 && d <= 14) att.push(c.it(co.code + ' early-bird ends in ' + c.pl(d, 'day'), tk(co.earlyPrice) + ' → ' + tk(co.price), '', 'Open', () => c.nav('courses', co.id)));
  });
  live.forEach((b) => {
    const d = c.days(b.exam), left = Number(b.seats) - b.enrolled;
    if (d != null && d >= 0 && d <= 60 && b.status === 'running') att.push(c.it(b.id + ' exam in ' + c.pl(d, 'day'), c.fd(b.exam), '', 'Open', () => c.nav('batches', b.id)));
    if (left <= 2 && b.status !== 'closed') att.push(c.it(b.id + ' — only ' + c.pl(left, 'seat') + ' left', 'Close enrollment or add seats?', '', 'Open', () => c.nav('batches', b.id)));
  });
  S.teachers.filter((t) => t.overdue > 0 && t.status === 'active').forEach((t) =>
    att.push(c.it(t.name + ' — ' + c.pl(t.overdue, 'question') + ' older than 24 h', 'Median reply ' + nf(t.med) + ' h', '', 'Open', () => c.nav('teachers', t.id))));
  const due = S.students.filter((u) => u.due > 0 && u.status === 'active').length;
  if (due) att.push(c.it(c.pl(due, 'student') + ' with an installment due', 'Send a reminder or review their access', '', 'Open', () => c.nav('students', null, 'due')));
  S.coupons.forEach((k) => {
    if (c.couponStatus(k) === 'active' && k.limit && k.limit - k.used <= 60) att.push(c.it(k.code + ' — ' + c.pl(k.limit - k.used, 'use') + ' left', 'Expires ' + c.fd(k.exp), '', 'Open', () => c.nav('coupons', k.id)));
  });

  // Seeded until reporting exists.
  const months: [string, number][] = [['May', 142000], ['Jun', 186000], ['Jul', 231000], ['Aug', 312000], ['Sep', 264000], ['Oct', 98400]], mx = 312000;
  return {
    title: 'Overview', sub: 'Today, ' + c.fd(c.todayISO()) + ' — what needs your attention.', head: [],
    dash: {
      hasSeg: false, seg: [],
      kpis: [
        c.K('Pending payments', nf(E.payCount), 'waiting for approval', 'payments', 'warn'),
        c.K('Content to review', nf(E.contentCount), 'submitted by teachers', 'content', 'blue'),
        c.K('Open refunds', nf(openRef), 'awaiting a decision', 'refunds', 'danger'),
        c.K('Overdue doubts', nf(overdue), 'unanswered for over 24 h', 'teachers', 'warn'),
        c.K('Revenue · Oct', tk(98400), 'in 6 days', 'reports', 'brand'),
        c.K('Active students', nf(live.reduce((a, b) => a + b.enrolled, 0)), 'in ' + c.pl(live.length, 'batch', 'batches'), 'students', 'muted'),
      ],
      panels: [
        { title: 'Needs attention', hasItems: true, items: att.length ? att : [c.it('All clear. Nothing is waiting.')], hasBars: false, bars: [] },
        { title: 'Revenue — last 6 months', hasBars: true, bars: months.map(([m, v], i) => c.bar(m, tk(v), (v / mx) * 100, i === 5 ? 'var(--warn)' : 'var(--brand)')), hasItems: false, items: [] },
        { title: 'Recent activity', hasItems: true, items: S.activity.slice(0, 5).map((a) => c.it(a.action + ' — ' + a.target, a.actor + ' · ' + c.when(a.at), '', 'View', () => c.nav('activity', a.id))), hasBars: false, bars: [] },
      ],
    },
  };
}
