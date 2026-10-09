/*
 * Admin console logic, ported from Admin Console v5 (`Component` class).
 * The console is data-driven: each section builder returns a SectionView (list / dashboard / detail
 * pane) and the renderer draws it. Builders live in ./sections/* and register in BUILDERS.
 * Permissions are mirrored here for the UI only; the server must enforce them.
 */
import { ago, dateEn } from '../format';
import { AREAS } from './seed';
import type {
  Action, AdminData, Area, Bar, Block, Cell, ConfirmSpec, Detail, Field, Item, Kpi, KV, ListView, Meter, Perm, Role, Section, SectionView, Staff, Tab,
  AdminCourse, AdminTeacher, Coupon, Refund,
} from './types';

/** Free-form records: create/edit forms and unsaved drafts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;

export interface ConsoleUi {
  sel: string | null; filter: string; q: string; form: Rec | null; draft: Rec | null;
  confirm: ConfirmSpec | null; cReason: string | null; cNote: string; toast: string | null;
  viewOpen: boolean; period: 'week' | 'month' | 'quarter'; rtab: 'roles' | 'staff';
  srOpen: boolean; srQ: string; srIdx: number;
  /** Page of the current list, zero-based. */
  page: number;
}
export type ConsoleState = AdminData & ConsoleUi;
export type SetState = (p: Partial<ConsoleState> | ((s: ConsoleState) => Partial<ConsoleState>)) => void;

export const initialUi: ConsoleUi = {
  sel: null, filter: 'all', q: '', form: null, draft: null, confirm: null, cReason: null, cNote: '', toast: null,
  viewOpen: false, period: 'month', rtab: 'roles', srOpen: false, srQ: '', srIdx: 0, page: 0,
};

/** Rows per list page. */
const PAGE = 25;

export interface ConsoleEnv {
  /** Current section, from the route. */
  sec: Section;
  theme: 'light' | 'dark';
  /** Live counts from the payment and content queues. */
  payCount: number;
  contentCount: number;
  /** The payments that have waited longest, oldest first (Overview). */
  pending: { id: string; name: string; sub: string; amount: string }[];
  navigate: (sec: Section) => void;
  toggleTheme: () => void;
  today: Date;
}

export const ICON: Record<string, string> = {
  overview: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', payments: 'M2 6h20v12H2zM2 10h20M6 15h4', content: 'M9 3h6v3H9zM8 4.5H5V21h14V4.5h-3M9 13l2 2 4-4',
  refunds: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5', students: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6', teachers: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
  certificates: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9L7 22l5-3 5 3-1.2-8.1', courses: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  batches: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', coupons: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01', announcements: 'M3 11v3l13 5V6zM16 9a3 3 0 0 1 0 6M7 15.5V20h3v-3',
  reports: 'M3 3v18h18M8 17v-5M13 17V8M18 17v-6', activity: 'M22 12h-4l-3 9L9 3l-3 9H2', settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  roles: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', alert: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01',
  collapse: 'M3 3h18v18H3zM9 3v18M16 9l-3 3 3 3', expand: 'M3 3h18v18H3zM9 3v18M13 9l3 3-3 3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3', plus: 'M12 5v14M5 12h14',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', menu: 'M3 6h18M3 12h18M3 18h18',
  up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', flat: 'M5 12h14', table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14', chart: 'M3 3v18h18M7 15l4-5 4 3 5-7', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
};

const NAV: [string | null, Section[]][] = [
  [null, ['overview']], ['Queues', ['payments', 'content', 'refunds']], ['People', ['students', 'teachers', 'certificates']],
  ['Catalog', ['courses', 'batches', 'coupons']], ['Communication', ['announcements']], ['Insights', ['reports', 'activity']], ['System', ['settings', 'roles']],
];
export type Tone = 'brand' | 'blue' | 'warn' | 'danger' | 'muted';
const TONE: Record<Tone, [string, string]> = { brand: ['var(--brand-soft)', 'var(--brand)'], blue: ['var(--accent-2-soft)', 'var(--accent-2)'], warn: ['var(--warn-soft)', 'var(--warn)'], danger: ['var(--margin)', 'var(--on-brand)'], muted: ['var(--surface-sunk)', 'var(--ink-2)'] };
const SOFT: Record<Tone, string> = { brand: 'var(--brand-soft)', blue: 'var(--accent-2-soft)', warn: 'var(--warn-soft)', danger: 'var(--margin-soft)', muted: 'var(--surface-sunk)' };
export const SL: Record<string, string> = { active: 'Active', pending: 'Pending', suspended: 'Suspended', invited: 'Invited', inactive: 'Inactive', published: 'Published', draft: 'Draft', archived: 'Archived', enrolling: 'Enrolling', running: 'Running', finished: 'Finished', closed: 'Closed', expired: 'Expired', disabled: 'Disabled', usedup: 'Used up', open: 'Open', refunded: 'Refunded', denied: 'Denied', valid: 'Valid', revoked: 'Revoked', sent: 'Sent', scheduled: 'Scheduled', eligible: 'Eligible', decide: 'Admin decides' };
const ST: Record<string, Tone> = { active: 'blue', pending: 'warn', suspended: 'danger', invited: 'warn', inactive: 'muted', published: 'brand', draft: 'muted', archived: 'muted', enrolling: 'brand', running: 'blue', finished: 'muted', closed: 'warn', expired: 'muted', disabled: 'muted', usedup: 'muted', open: 'warn', refunded: 'brand', denied: 'danger', valid: 'brand', revoked: 'danger', sent: 'blue', scheduled: 'warn', eligible: 'brand', decide: 'warn' };
const MONO = 'var(--font-mono)';
export const OTHER = 'Other reason';

/** Section builders register here (one module per group of sections). */
export const BUILDERS: Partial<Record<Section, (c: AdminConsole) => SectionView>> = {};

interface FieldOpts { type?: string; ph?: string; dis?: boolean; err?: string; hint?: string; hintFg?: string; inline?: boolean | number }

export class AdminConsole {
  /** Read-only for the section being built (the role has view access only). */
  ro = false;
  /** Flattened search results from the last render, for keyboard navigation. */
  srFlat: { run: () => void }[] = [];

  constructor(public S: ConsoleState, public setState: SetState, public env: ConsoleEnv) {}

  /* ---------- formatting ---------- */
  /** Numbers for display: grouped thousands, always 123 digits. The console is English only. */
  nf = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-US') : String(v));
  tk = (n: number | string) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');
  /** A count with its noun: pl(1, 'seat') → "1 seat", pl(3, 'seat') → "3 seats", pl(2, 'batch', 'batches'). */
  pl = (n: number, one: string, many = one + 's') => this.nf(n) + ' ' + (n === 1 ? one : many);
  private dayMs(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  /** Days from today to an ISO date (negative = past); null when there is no date. */
  days(d: string): number | null { return d ? Math.round((new Date(d + 'T00:00:00').getTime() - this.dayMs(this.env.today)) / 864e5) : null; }
  /** "8 Oct", with the year when it is not this year. */
  fd(d: string) { return d ? dateEn(d, new Date(d + 'T00:00:00').getFullYear() !== this.env.today.getFullYear()) : '—'; }
  /** How long ago a timestamp was: "just now", "10 min ago", "yesterday". */
  when(ts: number) { return ago((this.env.today.getTime() - ts) / 60000); }
  todayISO() { const t = this.env.today; return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }

  /* ---------- lookups ---------- */
  areaLabel(a: string) { const f = AREAS.find((x) => x[0] === a); return f ? f[1] : 'Overview'; }
  course(id: string): AdminCourse { return this.S.courses.find((c) => c.id === id) || ({ id, code: '—', title: '—' } as AdminCourse); }
  teacherOf(cid: string): AdminTeacher | undefined { return this.S.teachers.find((t) => t.courses.includes(cid)); }
  me(): Staff { return this.S.staff.find((s) => s.id === this.S.viewAs) || this.S.staff[0]; }
  roleOf(s: Staff): Role { return this.S.roles.find((r) => r.id === s.role) || this.S.roles[0]; }
  perm(a: Section, staffId?: string): Perm {
    if (a === 'overview') return 'view';
    const s = staffId ? this.S.staff.find((x) => x.id === staffId) : this.me();
    const r = this.roleOf(s || this.S.staff[0]);
    return r.locked ? 'edit' : (r.perms[a as Area] || 'none');
  }

  /* ---------- effects ---------- */
  /** Append-only activity log entry (actor = the staff member being viewed as). */
  log(area: string, action: string, target: string, reason?: string) {
    const actor = this.me().name;
    this.setState((s) => ({ activity: [{ id: 'l' + Date.now() + Math.random(), at: Date.now(), actor, area, action, target, reason: reason || '' }].concat(s.activity) }));
  }
  flash(t: string) { this.setState({ toast: t }); }
  ask(c: ConfirmSpec) { this.setState({ confirm: c, cReason: null, cNote: '' }); }
  upd<K extends 'students' | 'teachers' | 'courses' | 'batches' | 'coupons' | 'refunds' | 'certs' | 'ann' | 'staff' | 'roles'>(list: K, id: string, patch: Rec | ((x: Rec) => Rec)) {
    this.setState((s) => ({ [list]: (s[list] as Rec[]).map((x) => (x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)) } as Partial<ConsoleState>));
  }
  setF(k: string, v: unknown) { this.setState((s) => ({ form: { ...(s.form || {}), [k]: v } })); }
  tog<T>(arr: T[], x: T) { return arr.includes(x) ? arr.filter((y) => y !== x) : arr.concat([x]); }
  go(sec: Section, sel?: string | null, filter?: string) {
    this.setState({ sel: sel || null, filter: filter || (sec === 'refunds' ? 'open' : 'all'), q: '', page: 0, form: null, draft: null, viewOpen: false, rtab: 'roles' });
    this.env.navigate(sec);
  }
  nav(sec: Section, sel?: string | null, filter?: string) {
    if (this.perm(sec) === 'none') return this.flash('Your role cannot view this area.');
    this.go(sec, sel, filter);
  }
  /** Edit a copy of `base` as a draft keyed by `id`; `dirty` once anything changed. */
  edit(base: Rec, id: string) {
    const S = this.S, dirty = !!(S.draft && S.draft._id === id);
    const d: Rec = dirty ? S.draft! : { _id: id, ...JSON.parse(JSON.stringify(base)) };
    return { d, dirty, set: (k: string, v: unknown) => this.setState((s) => ({ draft: { ...(s.draft && s.draft._id === id ? s.draft : d), [k]: v } })) };
  }
  strip(d: Rec) { const o = { ...d }; delete o._id; return o; }
  viewAs(id: string) {
    const s = this.S.staff.find((x) => x.id === id);
    if (!s) return;
    this.setState({ viewAs: id, viewOpen: false });
    const r = this.roleOf(s), p = (a: Section) => (a === 'overview' ? 'view' : r.locked ? 'edit' : r.perms[a as Area] || 'none');
    if (p(this.env.sec) === 'none') this.go('overview');
    this.flash('Now viewing as ' + s.name + ' (' + r.name + ')');
  }

  /* ---------- view-model constructors ---------- */
  F(x: Partial<Field> & { hint?: string }): Field {
    return { isInput: false, isArea: false, isSeg: false, label: '', dir: 'column', align: 'stretch', bd: 'var(--line-strong)', hintFg: 'var(--ink-3)', ...x, hasLabel: !!x.label, hasHint: !!x.hint, hint: x.hint || '' };
  }
  inp(label: string, value: unknown, onv: (v: string) => void, o: FieldOpts = {}): Field {
    return this.F({ label, isInput: true, type: o.type || 'text', value: value == null ? '' : String(value), onChange: onv, ph: o.ph || '', disabled: this.ro || !!o.dis,
      hint: o.err || o.hint, hintFg: o.err ? 'var(--margin)' : 'var(--ink-3)', bd: o.err ? 'var(--margin)' : 'var(--line-strong)' });
  }
  area(label: string, value: unknown, onv: (v: string) => void, o: FieldOpts = {}): Field {
    return this.F({ label, isArea: true, value: value == null ? '' : String(value), onChange: onv, ph: o.ph || '', disabled: this.ro || !!o.dis, hint: o.hint, hintFg: o.hintFg || 'var(--ink-3)' });
  }
  seg<V extends string | number>(label: string, opts: [V, string][], cur: V | V[], onv: (v: V) => void, o: FieldOpts = {}): Field {
    const dis = this.ro || !!o.dis;
    return this.F({ label, isSeg: true, hint: o.hint, dir: o.inline ? 'row' : 'column', align: o.inline ? 'center' : 'stretch',
      opts: opts.map(([v, l]) => {
        const on = Array.isArray(cur) ? cur.includes(v) : v === cur;
        return { label: l, go: () => { if (!dis) onv(v); }, bg: on ? 'var(--brand-soft)' : 'var(--surface)', fg: on ? 'var(--brand)' : 'var(--ink-2)', bd: on ? 'var(--brand)' : 'var(--line-strong)', weight: on ? 600 : 400, op: dis && !on ? 0.55 : 1 };
      }) });
  }
  onoff(): ['on' | 'off', string][] { return [['on', 'On'], ['off', 'Off']]; }
  blk(b: { title?: string; note?: string; tone?: Tone; kv?: KV[]; fields?: Field[]; items?: Item[]; wide?: boolean }): Block {
    const it = b.items || [], kv = b.kv || [], fl = b.fields || [];
    return { title: b.title || '', hasTitle: !!b.title, note: b.note || '', hasNote: !!b.note, noteBg: SOFT[b.tone || 'muted'], kv, hasKv: kv.length > 0, fields: fl, hasFields: fl.length > 0, items: it, hasItems: it.length > 0, wide: b.wide };
  }
  /** A label and its value. `o.go` makes the row a shortcut, and `o.on` marks the one in use. */
  kv(k: string, v: string | number, o: { mono?: boolean; fg?: string; bold?: boolean; go?: () => void; on?: boolean } = {}): KV {
    return { k, v: String(v), font: o.mono ? MONO : 'inherit', fg: o.fg || 'var(--ink)', weight: o.bold ? 600 : 400, go: o.go, on: o.on };
  }
  it(t: string, sub?: string, right?: string, act?: string, actGo?: () => void): Item {
    // A middle dot stays with the words before it, so a wrapped line never starts with one.
    const tie = (x: string) => x.replace(/ · /g, '\u00a0· ');
    return { t: tie(t), sub: tie(sub || ''), hasSub: !!sub, right: right || '', hasRight: !!right, hasAct: !!act, actLabel: act || '', actGo: actGo || (() => {}) };
  }
  /** Action button; `free` = allowed even in read-only sections (navigation, copying…). */
  A(label: string, go: () => void, kind: 'primary' | 'danger' | 'ghost' = 'ghost', dis?: boolean, free?: boolean): Action {
    const off = !!dis || (this.ro && !free);
    const c = kind === 'primary' ? ['var(--brand)', 'var(--on-brand)', 'var(--brand)'] : kind === 'danger' ? ['var(--surface)', 'var(--margin)', 'var(--margin)'] : ['var(--surface)', 'var(--ink)', 'var(--line-strong)'];
    return { label, go: off ? () => {} : go, bg: c[0], fg: c[1], bd: c[2], op: off ? 0.45 : 1 };
  }
  T(t: string | number, sub?: string, o: { mono?: boolean; subMono?: boolean; bold?: boolean; fg?: string; subFg?: string } = {}): Cell {
    return { isText: true, isBadge: false, t: String(t), sub: sub || '', hasSub: !!sub, font: o.mono ? MONO : 'inherit', subFont: o.subMono ? MONO : 'inherit', weight: o.bold ? 600 : 400, fg: o.fg || 'var(--ink)', subFg: o.subFg || 'var(--ink-3)', bg: '' };
  }
  B(key: string, label?: string): Cell {
    const t = TONE[ST[key] || 'muted'];
    return { isText: false, isBadge: true, t: label || SL[key] || key, bg: t[0], fg: t[1], sub: '', hasSub: false, font: 'inherit', subFont: 'inherit', weight: 600, subFg: '' };
  }
  /** Stat tile that opens its section. `o.delta` and `o.spark` add the change and the trend. */
  K(label: string, value: string | number, sub: string, sec: Section, tone: Tone, o: { sel?: string | null; filter?: string; delta?: Kpi['delta']; spark?: number[] } = {}): Kpi {
    const fg = { brand: 'var(--brand)', warn: 'var(--warn)', blue: 'var(--accent-2)', danger: 'var(--margin)', muted: 'var(--ink-2)' }[tone];
    return { label, value: String(value), sub, go: () => this.nav(sec, o.sel, o.filter), icon: ICON[sec] || ICON.overview, iconBg: SOFT[tone], iconFg: fg, delta: o.delta, spark: o.spark };
  }
  /**
   * Change from `before` to `now`, as a signed figure against a named period ("vs last month"). `upGood` says which direction is good news.
   * `fmt` shapes the figure: true for a percentage of `before`, or a function for a unit ("৳9", "2 h").
   */
  delta(now: number, before: number, vs: string, upGood: boolean, fmt: boolean | ((n: number) => string) = false): Kpi['delta'] {
    const diff = now - before;
    if (!diff) return { text: 'Same as ' + vs.replace(/^vs /, ''), dir: 'flat', good: true };
    const amount = typeof fmt === 'function' ? fmt(Math.abs(diff)) : fmt && before ? Math.round((Math.abs(diff) / before) * 100) + '%' : this.nf(Math.abs(diff));
    return { text: (diff > 0 ? '+' : '−') + amount + ' ' + vs, dir: diff > 0 ? 'up' : 'down', good: diff > 0 === upGood };
  }
  bar(label: string, value: string, pct: number): Bar { return { label, value, pct: Math.max(0, Math.min(100, Math.round(pct))) }; }
  /** A ratio against a limit; from 90% it turns to the warning tone and says `note`. */
  meter(label: string, value: string, pct: number, note = 'nearly full'): Meter { const p = Math.max(0, Math.min(100, Math.round(pct))); return { label, value, pct: p, warn: p >= 90, note }; }
  /** Filter tabs. A tab with its own `go` switches the view (Roles / Staff) instead of filtering. */
  tabs(filters: [string, string, number | null, (() => void)?][]): Tab[] {
    const S = this.S;
    return filters.map(([k, l, n, go]) => ({
      label: l, count: n == null ? '' : this.nf(n), on: (go ? S.rtab : S.filter) === k, view: !!go,
      go: go || (() => this.setState({ filter: k, page: 0, sel: S.sel === 'new' ? 'new' : null })),
    }));
  }
  /**
   * A list section, paged. `wide` appends columns that show only when the list has room:
   * its `cols` are the extra headers, `grid` the template with them, and each row's cells end with the extra cells.
   */
  mkList(filters: [string, string, number | null, (() => void)?][], ph: string, cols: string[], grid: string, rows: { id: string; cells: Cell[] }[], empty: string, wide?: { cols: string[]; grid: string }): ListView {
    const S = this.S, total = rows.length, pages = Math.max(1, Math.ceil(total / PAGE));
    const pg = Math.min(S.page || 0, pages - 1), from = pg * PAGE, shown = rows.slice(from, from + PAGE);
    return {
      filters: this.tabs(filters), hasSearch: !!ph, ph: ph || '',
      cols: cols.concat(wide ? wide.cols : []), extra: wide ? wide.cols.length : 0, grid, gridWide: wide ? wide.grid : grid,
      rows: shown.map((r) => ({ key: r.id, cells: r.cells, on: S.sel === r.id, go: () => this.setState({ sel: r.id, form: null, draft: null }) })),
      isEmpty: total === 0, empty,
      page: {
        from: total ? from + 1 : 0, to: from + shown.length, total,
        prev: pg > 0 ? () => this.setState({ page: pg - 1 }) : null, next: pg < pages - 1 ? () => this.setState({ page: pg + 1 }) : null,
      },
    };
  }
  match(s: string) { const q = this.S.q.trim().toLowerCase(); return !q || s.toLowerCase().includes(q); }
  reasons(list: string[]) { return list.includes(OTHER) ? list : list.concat([OTHER]); }

  /* ---------- domain rules ---------- */
  priceStr(c: Rec) {
    if (c.model === 'free') return 'Free';
    let s = c.model === 'inst' ? this.nf(c.inst) + ' × ' + this.tk(Math.ceil(c.price / c.inst)) : this.tk(c.price);
    if (c.perBatch === 'on') { const v = Object.values(c.bp || {}).map(Number); if (v.length) s = 'Per batch ' + this.tk(Math.min(...v)) + '–' + this.tk(Math.max(...v)); }
    const d = this.days(c.earlyEnd);
    if (c.early === 'on' && d != null && d >= 0) s += ' · early ' + this.tk(c.earlyPrice);
    return s;
  }
  couponStatus(c: Coupon) { return c.disabled ? 'disabled' : (this.days(c.exp) ?? 0) < 0 ? 'expired' : c.limit && c.used >= c.limit ? 'usedup' : 'active'; }
  refundVerdict(r: Refund) { const st = this.S.settings; return r.ago <= Number(st.refundDays) && r.watched < Number(st.refundWatch) ? 'eligible' : 'decide'; }
  /** How many enrolled students an audience reaches. */
  reach(aud: string, target: string) {
    const B = this.S.batches.filter((b) => b.status !== 'finished');
    return aud === 'all' ? B.reduce((a, b) => a + b.enrolled, 0) : aud === 'course' ? B.filter((b) => b.course === target).reduce((a, b) => a + b.enrolled, 0) : (B.find((b) => b.id === target) || { enrolled: 0 }).enrolled;
  }

  /* ---------- global search (Ctrl K) ---------- */
  searchVals() {
    const S = this.S, q = (S.srQ || '').trim().toLowerCase(), has = (s: unknown) => String(s || '').toLowerCase().includes(q);
    const close = (fn: () => void) => () => { this.setState({ srOpen: false }); fn(); };
    type Hit = { title: string; sub: string; icon: string; run: () => void };
    const groups: [string, Hit[]][] = [];
    const pages: Hit[] = (AREAS.map((a) => a[0]) as Section[]).concat(['overview']).filter((k) => this.perm(k) !== 'none')
      .map((k) => ({ title: k === 'overview' ? 'Overview' : this.areaLabel(k), sub: '', icon: ICON[k], run: close(() => this.go(k)) })).filter((p) => !q || has(p.title));
    const acts = ([
      ['New announcement', 'Send a notice, SMS or push', 'announcements', () => { this.go('announcements'); this.setState({ sel: 'new', form: { title: '', body: '', aud: 'all', target: '', ch: ['app', 'push'], when: 'now', date: '' } }); }],
      ['Invite staff', 'Add an admin or support member', 'roles', () => { this.go('roles'); this.setState({ rtab: 'staff', sel: 'new', form: { name: '', email: '', role: 'support' } }); }],
      ['Edit roles & permissions', 'Who can view and change what', 'roles', () => this.go('roles')],
    ] as [string, string, Section, () => void][])
      .filter((a) => this.perm(a[2]) === 'edit' && (!q || has(a[0]) || has(a[1]))).map((a) => ({ title: a[0], sub: a[1], icon: ICON.plus, run: close(a[3]) }));
    if (acts.length) groups.push(['Actions', acts]);
    if (q) {
      const ent = <T extends { id: string }>(sec: Section, list: T[], t: (x: T) => string, s: (x: T) => string): Hit[] =>
        this.perm(sec) === 'none' ? [] : list.filter((x) => has(t(x)) || has(s(x))).slice(0, 5).map((x) => ({ title: t(x), sub: s(x), icon: ICON[sec], run: close(() => this.go(sec, x.id)) }));
      ([
        ['Students', ent('students', S.students, (x) => x.name, (x) => x.phone + ' · ' + x.batch)],
        ['Teachers', ent('teachers', S.teachers, (x) => x.name, (x) => x.email)],
        ['Courses', ent('courses', S.courses, (x) => x.code + ' — ' + x.title, () => 'Course')],
        ['Batches', ent('batches', S.batches, (x) => x.id, (x) => this.course(x.course).title)],
      ] as [string, Hit[]][]).forEach((g) => { if (g[1].length) groups.push(g); });
    }
    if (pages.length) groups.push(['Pages', q ? pages : pages.slice(0, 6)]);
    const flat: Hit[] = [];
    groups.forEach((g) => g[1].forEach((it) => flat.push(it)));
    this.srFlat = flat;
    const idx = Math.min(S.srIdx || 0, Math.max(0, flat.length - 1));
    let n = 0;
    const srGroups = groups.map(([label, items]) => ({
      label,
      items: items.map((it) => {
        const i = n++, on = i === idx;
        return { title: it.title, sub: it.sub, hasSub: !!it.sub, icon: it.icon, go: it.run, hover: () => { if (this.S.srIdx !== i) this.setState({ srIdx: i }); },
          bg: on ? 'var(--brand-soft)' : 'transparent', iconBg: on ? 'var(--brand)' : 'var(--surface-sunk)', iconFg: on ? 'var(--on-brand)' : 'var(--ink-2)', enterOp: on ? 1 : 0 };
      }),
    }));
    return { srOpen: !!S.srOpen, srQ: S.srQ || '', srGroups, srEmpty: !!q && flat.length === 0 };
  }

  /* ---------- everything the renderer draws ---------- */
  renderVals() {
    const S = this.S, E = this.env;
    let sec = E.sec;
    if (this.perm(sec) === 'none') sec = 'overview';
    this.ro = this.perm(sec) !== 'edit';
    const isQueue = sec === 'payments' || sec === 'content';
    const counts: Partial<Record<Section, number>> = {
      payments: E.payCount, content: E.contentCount,
      refunds: S.refunds.filter((r) => r.status === 'open').length,
      teachers: S.teachers.reduce((a, t) => a + (t.status === 'active' ? t.overdue : 0), 0),
    };
    const mini = !!S.navMini;
    const navGroups = NAV.map(([g, keys]) => ({
      label: g || '',
      items: keys.filter((k) => this.perm(k) !== 'none').map((k) => ({
        key: k, label: k === 'overview' ? 'Overview' : this.areaLabel(k), go: () => this.go(k), icon: ICON[k], on: sec === k,
        /** Things waiting in this section. */
        count: counts[k] || 0,
        /** The role can look here but not change anything. */
        ro: this.perm(k) === 'view' && !['overview', 'reports', 'activity'].includes(k),
      })),
    })).filter((g) => g.items.length);

    const me = this.me(), role = this.roleOf(me);
    const build = BUILDERS[sec];
    const v: SectionView = !isQueue && build ? build(this)
      : isQueue ? { title: this.areaLabel(sec), sub: sec === 'payments' ? this.pl(E.payCount, 'payment') + ' waiting for approval' : this.pl(E.contentCount, 'item') + ' waiting for review', head: [] }
      : { title: this.areaLabel(sec), sub: 'This section is not built yet.', head: [], detail: { title: this.areaLabel(sec), sub: 'Coming in a later milestone', closable: false, wide: true, blocks: [this.blk({ note: 'No builder is registered for this section.' })] } };
    // Beside a list with no row selected, the pane shows the whole section instead of blank space:
    // the filters as shortcuts with their counts, the totals, what changed here lately, and the section's own actions.
    const counted = v.list ? v.list.filters.filter((t) => !t.view && t.count !== '') : [];
    const recent = sec === 'activity' ? [] : S.activity.filter((a) => a.area === sec).slice(0, 4);
    const summary: Detail | undefined = !v.detail && v.list ? {
      title: v.title, sub: 'Summary · select a row for its details', blocks: [
        counted.length ? this.blk({ title: v.tabsLabel || 'By status', kv: counted.map((t) => this.kv(t.label, t.count, { go: t.go, on: t.on })) }) : null,
        v.summary && v.summary.length ? this.blk({ title: 'Totals', kv: v.summary }) : null,
        recent.length ? this.blk({ title: 'Recent changes', items: recent.map((a) => this.it(a.action + ' — ' + a.target, a.actor + ' · ' + this.when(a.at), '', 'View', () => this.nav('activity', a.id))) }) : null,
      ].filter((b): b is Block => !!b),
      actions: v.head,
    } : undefined;
    const d: Detail | undefined = v.detail || summary;
    const dt = d ? {
      title: d.title, sub: d.sub || '', badge: d.badge || null, closable: !!d.closable, blocks: d.blocks, actions: d.actions || [],
      hasRoNote: this.ro && (d.actions || []).length > 0,
      /** Full-width form (Settings) rather than a pane beside a list. */
      wide: !!d.wide,
      isSummary: !v.detail,
    } : null;

    const cf = S.confirm;
    let confirm = null;
    if (cf) {
      const other = S.cReason === OTHER, note = S.cNote.trim(), okDis = !!cf.needReason && (!S.cReason || (other && note.length < 4));
      confirm = {
        title: cf.title, body: cf.body || '', needReason: !!cf.needReason, okLabel: cf.ok || 'Confirm', okBg: cf.danger ? 'var(--margin)' : 'var(--brand)', okOp: okDis ? 0.45 : 1,
        notePh: other ? 'Write the reason (required)' : 'Add a note (optional)',
        reasons: this.reasons(cf.reasons || []).map((r) => {
          const on = S.cReason === r;
          return { label: r, go: () => this.setState({ cReason: r }), bg: on ? 'var(--brand-soft)' : 'var(--surface)', fg: on ? 'var(--brand)' : 'var(--ink-2)', bd: on ? 'var(--brand)' : 'var(--line-strong)', weight: on ? 600 : 400 };
        }),
        okGo: () => {
          if (okDis) return;
          // Stored reason is "chip — note" (or just the note for "Other reason").
          const reason = cf.needReason ? (other ? note : S.cReason + (note ? ' — ' + note : '')) : '';
          this.setState({ confirm: null });
          cf.run(reason);
        },
      };
    }

    return {
      ...this.searchVals(),
      sec, isQueue, mini, navGroups, ro: this.ro,
      readOnly: this.ro && !['overview', 'reports', 'activity'].includes(sec),
      headIcon: ICON[sec] || ICON.overview,
      staffOpts: S.staff.map((s) => ({ id: s.id, name: s.name, role: this.roleOf(s).name, on: s.id === me.id, go: () => this.viewAs(s.id) })),
      meName: me.name, meRole: role.name + (me.id !== S.staff[0]?.id ? ' · view as' : ''),
      v, dt, confirm,
      /** Width the admin dragged the detail pane to; 0 = the default, which follows the screen width. */
      paneW: S.paneW || 0,
    };
  }
}

export type ConsoleVals = ReturnType<AdminConsole['renderVals']>;
