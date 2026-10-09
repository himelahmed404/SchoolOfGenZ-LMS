import type { AdminConsole, ConsoleState } from '../console';
import type { Point, Tab, Trend } from '../types';

type Period = ConsoleState['period'];

/** A revenue figure for each of the last 182 days, the same on every render: a slow rise with a weekly rhythm. Seeded until reporting exists. */
const DAILY = Array.from({ length: 182 }, (_, i) => Math.round(3600 + i * 22 + 1500 * Math.sin(i / 3.2) + (i % 7 === 5 ? 2400 : 0)));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 91 };
const LABEL: Record<Period, string> = { week: 'This week', month: 'This month', quarter: 'Last 3 months' };
const SHORT: Record<Period, string> = { week: 'Week', month: 'Month', quarter: 'Quarter' };
const VS: Record<Period, string> = { week: 'vs last week', month: 'vs last month', quarter: 'vs prior 3 months' };

/**
 * Revenue over the period the admin chose, with the same span before it to compare against.
 * Overview and Reports both draw this series, so their charts always agree.
 */
export function revenueOver(c: AdminConsole) {
  const period = c.S.period, days = DAYS[period];
  const cur = DAILY.slice(-days), before = DAILY.slice(-2 * days, -days);
  const dayAt = (back: number) => { const d = new Date(c.env.today); d.setDate(d.getDate() - back); return d.getDate() + ' ' + d.toLocaleString('en-US', { month: 'short' }); };
  // Daily points for a week or a month; a quarter reads better by week.
  const points: Point[] = period === 'quarter'
    ? Array.from({ length: 13 }, (_, w) => ({ x: dayAt(days - 1 - w * 7), y: sum(cur.slice(w * 7, w * 7 + 7)) }))
    : cur.map((y, i) => ({ x: dayAt(days - 1 - i), y }));
  // The series ends today, and today is not over yet.
  const trend: Trend = { points, unit: 'taka', partial: true };
  return { days, label: LABEL[period], by: period === 'quarter' ? 'by week' : 'by day', vs: VS[period], total: sum(cur), totalBefore: sum(before), trend };
}

/** The period switch. `short` labels fit a panel header; the long ones go in the top bar. */
export function periodTabs(c: AdminConsole, short = false): Tab[] {
  return (Object.keys(DAYS) as Period[]).map((k) => ({ label: short ? SHORT[k] : LABEL[k], count: '', on: c.S.period === k, go: () => c.setState({ period: k }) }));
}
