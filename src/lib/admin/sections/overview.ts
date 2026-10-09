import type { AdminConsole } from '../console';
import type { Item, SectionView } from '../types';
import { periodTabs, revenueOver } from './revenue';

/**
 * Overview: stat tiles that open their section, then two rows of panels on a 12-column grid.
 * Row 1: revenue over the chosen period (8) and the generated "needs attention" list (4).
 * Row 2: the payments that have waited longest, how full each batch is, and recent activity (4 each).
 */
export function overview(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk, E = c.env;
  const openRef = S.refunds.filter((r) => r.status === 'open').length;
  const overdue = S.teachers.reduce((a, t) => a + (t.status === 'active' ? t.overdue : 0), 0);
  const live = S.batches.filter((b) => b.status !== 'finished');
  const active = live.reduce((a, b) => a + b.enrolled, 0);

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

  // Seeded until reporting exists: monthly revenue for the tile, and the last six days of each daily count.
  const revenue: [string, number][] = [['May', 142000], ['Jun', 186000], ['Jul', 231000], ['Aug', 312000], ['Sep', 264000], ['Oct', 98400]];
  const sepToDate = 91200;
  const week = { pay: [7, 9, 6, 12, 8, 10], content: [2, 5, 3, 4, 2, 3], refunds: [1, 2, 2, 4, 3, 2], doubts: [5, 4, 7, 6, 9, 9], students: [164, 168, 171, 172, 176, 178] };
  const yesterday = (k: keyof typeof week) => week[k][week[k].length - 1];
  // The chart has its own period switch: the tiles above are about today, so the switch must not look like it scopes them.
  const R = revenueOver(c);

  return {
    title: 'Overview', sub: 'Today, ' + c.fd(c.todayISO()) + ' — what needs your attention.', head: [],
    dash: {
      seg: [],
      kpis: [
        c.K('Pending payments', nf(E.payCount), 'waiting for approval', 'payments', 'warn', { spark: week.pay.concat([E.payCount]), delta: c.delta(E.payCount, yesterday('pay'), 'vs yesterday', false) }),
        c.K('Content to review', nf(E.contentCount), 'submitted by teachers', 'content', 'blue', { spark: week.content.concat([E.contentCount]), delta: c.delta(E.contentCount, yesterday('content'), 'vs yesterday', false) }),
        c.K('Open refunds', nf(openRef), 'awaiting a decision', 'refunds', 'danger', { spark: week.refunds.concat([openRef]), delta: c.delta(openRef, yesterday('refunds'), 'vs yesterday', false) }),
        c.K('Overdue doubts', nf(overdue), 'unanswered for over 24 h', 'teachers', 'warn', { spark: week.doubts.concat([overdue]), delta: c.delta(overdue, yesterday('doubts'), 'vs yesterday', false) }),
        c.K('Revenue · Oct', tk(revenue[5][1]), 'month to date', 'reports', 'brand', { spark: revenue.map((m) => m[1]), delta: c.delta(revenue[5][1], sepToDate, 'vs 1–' + E.today.getDate() + ' Sep', true, true) }),
        c.K('Active students', nf(active), 'in ' + c.pl(live.length, 'batch', 'batches'), 'students', 'muted', { spark: week.students.concat([active]), delta: c.delta(active, yesterday('students'), 'vs yesterday', true) }),
      ],
      panels: [
        { title: 'Revenue', sub: R.label + ' · ' + R.by, span: 8, seg: periodTabs(c, true), trend: R.trend, more: { label: 'Reports', go: () => c.nav('reports') } },
        { title: 'Needs attention', sub: att.length ? c.pl(att.length, 'item') : '', span: 4, items: att.length ? att : [c.it('All clear. Nothing is waiting.')] },
        { title: 'Longest-waiting payments', sub: E.pending.length ? 'Oldest first' : '', span: 4, more: { label: 'Open queue', go: () => c.nav('payments') },
          items: E.pending.length ? E.pending.map((p) => c.it(p.name, p.sub, p.amount, 'Review', () => c.nav('payments'))) : [c.it('No payments are waiting.')] },
        { title: 'Batch fill', sub: 'Enrolled against seats', span: 4, more: { label: 'Batches', go: () => c.nav('batches') },
          meters: live.map((b) => c.meter(b.id, nf(b.enrolled) + '/' + nf(Number(b.seats)), (b.enrolled / Number(b.seats)) * 100)) },
        { title: 'Recent activity', span: 4, more: { label: 'Activity log', go: () => c.nav('activity') },
          items: S.activity.slice(0, 8).map((a) => c.it(a.action + ' — ' + a.target, a.actor + ' · ' + c.when(a.at), '', 'View', () => c.nav('activity', a.id))) },
      ],
    },
  };
}
