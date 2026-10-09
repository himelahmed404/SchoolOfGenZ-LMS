import type { RolesAndStaff } from '@contract';
import { describe, expect, it } from 'vitest';
import { ADMIN_CODES, AdminConsole, adminSeed, BUILDERS, initialUi, rolesFromApi, sayAdmin, type ConsoleEnv, type ConsoleState, type Section } from '.';
import type { ApiInit } from '../api/client';
import { figure, niceScale, ringArcs, thin } from './chart-math';

const TODAY = new Date(2026, 9, 9, 12);
const before = (min: number) => new Date(TODAY.getTime() - min * 60000).toISOString();

/** Roles and staff as the API sends them: a role lists only the areas it can see. */
const TEAM: RolesAndStaff = {
  roles: [
    { id: 'super', name: 'Super admin', description: 'Everything: money, settings, roles', locked: true, perms: {} },
    { id: 'finance', name: 'Finance', description: 'Payments, refunds, coupons', locked: false, perms: { payments: 'edit', refunds: 'edit', coupons: 'edit', students: 'view', reports: 'view', activity: 'view' } },
    { id: 'content', name: 'Content', description: 'Courses, lesson review, batches', locked: false, perms: { content: 'edit', courses: 'edit', batches: 'view', teachers: 'view', certificates: 'view' } },
    { id: 'support', name: 'Support', description: 'Students, notices, certificates', locked: false, perms: { students: 'edit', announcements: 'edit', certificates: 'edit', payments: 'view', batches: 'view', teachers: 'view' } },
    { id: 'intern', name: 'Intern', description: '', locked: false, perms: { reports: 'view' } },
  ],
  staff: [
    { id: 's1', name: 'Rifat Ahmed', email: 'rifat@schoolofgenz.com', role: 'super', status: 'active', lastSeenAt: before(0) },
    { id: 's2', name: 'Nabila Chowdhury', email: 'nabila@schoolofgenz.com', role: 'finance', status: 'active', lastSeenAt: before(60) },
    { id: 's3', name: 'Sakib Rahman', email: 'sakib@schoolofgenz.com', role: 'content', status: 'active', lastSeenAt: before(26 * 60) },
    { id: 's4', name: 'Tasnim Jahan', email: 'tasnim@schoolofgenz.com', role: 'support', status: 'inactive', lastSeenAt: before(3 * 24 * 60) },
    { id: 's5', name: 'Imran Kabir', email: 'imran@schoolofgenz.com', role: 'support', status: 'invited', lastSeenAt: null },
  ],
};
const team = rolesFromApi(TEAM, TODAY);

/** What the console is given, with `as` signed in. */
function envFor(sec: Section, as = 's1', o: Partial<ConsoleEnv> = {}): ConsoleEnv {
  const who = team.staff.find((x) => x.id === as)!;
  return {
    sec, theme: 'light', payCount: 10, contentCount: 4, pending: [], navigate: () => {}, toggleTheme: () => {}, today: TODAY,
    me: { id: who.id, name: who.name, email: who.email, role: team.roles.find((r) => r.id === who.role)! },
    api: async () => { throw new Error('this test does not call the API'); }, refresh: () => {}, copy: () => {}, signOut: () => {}, ...o,
  };
}
const stateWith = (ui: Partial<ConsoleState>): ConsoleState => ({ ...adminSeed(), ...team, rolesState: 'ready', ...initialUi, ...ui });

/** A console on the seed data, at a fixed date, with `ui` on top of the starting view state and `as` signed in. */
function consoleAt(sec: Section, ui: Partial<ConsoleState> = {}, as = 's1') {
  return new AdminConsole(stateWith(ui), () => {}, envFor(sec, as));
}

/**
 * A console whose changes are kept, so an action can be run and its result read.
 * `answer` stands in for the API; every call it gets is remembered.
 */
function live(sec: Section, ui: Partial<ConsoleState> = {}, o: { as?: string; answer?: (path: string, init?: ApiInit) => unknown } = {}) {
  let state = stateWith(ui);
  const calls: { path: string; method?: string; body?: unknown }[] = [];
  const done = { refreshed: 0, copied: [] as string[] };
  const api: ConsoleEnv['api'] = async <T,>(path: string, init?: ApiInit) => {
    calls.push({ path, method: init?.method, body: init?.body });
    return (o.answer ? o.answer(path, init) : {}) as T;
  };
  const make = () => new AdminConsole(state, (p) => { state = { ...state, ...(typeof p === 'function' ? p(state) : p) }; },
    envFor(sec, o.as, { api, refresh: () => { done.refreshed++; }, copy: (t) => { done.copied.push(t); } }));
  return { make, calls, done, get state() { return state; } };
}
/** Let a call to the stand-in API finish. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('chart numbers', () => {
  it('ends the axis on the first round step above the largest value', () => {
    expect(niceScale(312000)).toEqual({ top: 400000, step: 100000 });
    expect(niceScale(12900)).toEqual({ top: 15000, step: 5000 });
  });
  it('keeps the steps of a count whole', () => {
    expect(niceScale(3, true)).toEqual({ top: 3, step: 1 });
    expect(niceScale(10, true)).toEqual({ top: 10, step: 5 });
  });
  it('still has an axis when every value is zero', () => {
    expect(niceScale(0).top).toBeGreaterThan(0);
  });
  it('writes taka in full, and short for axis ticks', () => {
    expect(figure(98400, 'taka')).toBe('৳98,400');
    expect(figure(250000, 'taka', true)).toBe('৳250K');
    expect(figure(12, 'count')).toBe('12');
  });
  it('thins a long series but keeps its last value', () => {
    const month = Array.from({ length: 30 }, (_, i) => i + 1);
    const out = thin(month, 12);
    expect(out).toHaveLength(12);
    expect(out[11]).toBe(30);
    expect(out[0]).toBeLessThan(out[10]);
    expect(thin([4, 5, 6], 12)).toEqual([4, 5, 6]);
  });
  it('lays the parts of a ring end to end', () => {
    expect(ringArcs([64, 36])).toEqual([{ i: 0, from: 0, len: 64 }, { i: 1, from: 64, len: 36 }]);
  });
  it('fills the ring when the parts do not add up to 100, and skips a part of nothing', () => {
    expect(ringArcs([30, 0, 10])).toEqual([{ i: 0, from: 0, len: 75 }, { i: 2, from: 75, len: 25 }]);
    expect(ringArcs([0, 0])).toEqual([]);
  });
});

describe('stat tiles', () => {
  const c = consoleAt('overview');
  it('says which way a figure moved and whether that is good news', () => {
    expect(c.delta(12, 10, 'vs yesterday', false)).toEqual({ text: '+2 vs yesterday', dir: 'up', good: false });
    expect(c.delta(8, 9, 'vs yesterday', false)).toEqual({ text: '−1 vs yesterday', dir: 'down', good: true });
  });
  it('names the period when nothing changed', () => {
    expect(c.delta(10, 10, 'vs yesterday', false)).toEqual({ text: 'Same as yesterday', dir: 'flat', good: true });
  });
  it('writes the change as a percentage or in a unit', () => {
    expect(c.delta(108, 100, 'vs last month', true, true)!.text).toBe('+8% vs last month');
    expect(c.delta(2656, 2647, 'vs last month', true, c.tk)!.text).toBe('+৳9 vs last month');
    expect(c.delta(14, 16, 'vs last month', false, (n) => n + ' h')!.text).toBe('−2 h vs last month');
  });
  it('warns when a batch is nearly full', () => {
    expect(c.meter('CST-04-B01', '28/30', (28 / 30) * 100)).toEqual({ label: 'CST-04-B01', value: '28/30', pct: 93, warn: true, note: 'nearly full' });
    expect(c.meter('ENG-02-B07', '31/40', (31 / 40) * 100).warn).toBe(false);
  });
});

describe('status badges', () => {
  const c = consoleAt('students');
  it('leaves the normal state without a fill, so the exceptions stand out', () => {
    expect(c.B('active')).toMatchObject({ t: 'Active', bg: 'transparent', fg: 'var(--ink-2)' });
    expect(c.B('pending').bg).toBe('var(--warn-soft)');
    expect(c.B('suspended').bg).toBe('var(--margin)');
  });
});

describe('lists', () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ id: 'r' + i, cells: [] }));
  const list = (page: number) => consoleAt('students', { page }).mkList([['all', 'All', 60]], 'Search', ['Name'], '1fr', rows, 'Nothing found.');
  it('shows 25 rows a page', () => {
    const first = list(0);
    expect(first.rows).toHaveLength(25);
    expect(first.page).toMatchObject({ from: 1, to: 25, total: 60, prev: null });
    expect(first.page.next).toBeTypeOf('function');
  });
  it('ends on a short last page and stays inside the range', () => {
    expect(list(2).page).toMatchObject({ from: 51, to: 60, total: 60, next: null });
    expect(list(9).page).toMatchObject({ from: 51, to: 60 });
  });
  it('keeps a middle dot with the words before it', () => {
    expect(consoleAt('overview').it('Approved payment — Sharmin Sultana · BKX8N2WS45').t).toBe('Approved payment — Sharmin Sultana · BKX8N2WS45');
  });
});

describe('section summary beside a list', () => {
  it('lists each status as a shortcut, then the totals and the latest changes', () => {
    const dt = consoleAt('students').renderVals().dt!;
    expect(dt.isSummary).toBe(true);
    expect(dt.blocks.map((b) => b.title)).toEqual(['By status', 'Totals', 'Recent changes']);
    expect(dt.blocks[0].kv.map((k) => k.k)).toEqual(['All', 'Active', 'Pending', 'Due', 'Suspended']);
    expect(dt.blocks[0].kv.every((k) => typeof k.go === 'function')).toBe(true);
    expect(dt.blocks[0].kv[0].on).toBe(true);
  });
  it('names what the activity log is divided by', () => {
    expect(consoleAt('activity').renderVals().dt!.blocks[0].title).toBe('By area');
  });
  it('does not count the Roles and Staff tabs as statuses', () => {
    const dt = consoleAt('roles', { rtab: 'staff' }).renderVals().dt!;
    expect(dt.blocks.map((b) => b.title)).toEqual(['Totals']);
    expect(dt.actions.map((a) => a.label)).toEqual(['Invite staff']);
  });
  it('gives way to the details once a row is selected', () => {
    expect(consoleAt('students', { sel: 'u2' }).renderVals().dt!.isSummary).toBe(false);
  });
});

describe('dashboards', () => {
  it.each(['overview', 'reports'] as Section[])('%s has six tiles and two full rows of panels', (sec) => {
    const dash = consoleAt(sec).renderVals().v.dash!;
    expect(dash.kpis).toHaveLength(6);
    expect(dash.kpis.every((k) => k.delta && k.spark && k.spark.length > 1)).toBe(true);
    // The first row is the wide chart with one panel beside it; the grid's row count relies on rows adding up to twelve.
    expect(dash.panels.slice(0, 2).map((p) => p.span)).toEqual([8, 4]);
    expect(dash.panels.reduce((a, p) => a + p.span, 0)).toBe(24);
  });
  it('draws the same revenue series on Overview and Reports, for the period chosen on either', () => {
    const dashOf = (sec: Section) => consoleAt(sec, { period: 'quarter' }).renderVals().v.dash!;
    const overview = dashOf('overview').panels[0], reports = dashOf('reports').panels[0];
    expect(overview.trend!.points).toHaveLength(13);
    expect(overview.trend).toEqual(reports.trend);
    expect(overview.sub).toBe('Last 3 months · by week');
  });
  it('puts the period switch on the Overview chart, not over the tiles about today', () => {
    const dash = consoleAt('overview').renderVals().v.dash!;
    expect(dash.seg).toEqual([]);
    expect(dash.panels[0].seg!.map((t) => [t.label, t.on])).toEqual([['Week', false], ['Month', true], ['Quarter', false]]);
  });
  it('names the whole that the payment methods divide', () => {
    const split = consoleAt('reports').renderVals().v.dash!.panels.find((p) => p.share)!;
    expect(split.whole).toEqual({ label: 'Revenue', value: consoleAt('reports').renderVals().v.dash!.kpis[0].value });
    expect(split.share!.reduce((a, x) => a + x.pct, 0)).toBe(100);
  });
  it('scopes Reports to the chosen period', () => {
    const week = consoleAt('reports', { period: 'week' }).renderVals().v.dash!, month = consoleAt('reports', { period: 'month' }).renderVals().v.dash!;
    expect(week.panels[0].trend!.points).toHaveLength(7);
    expect(month.panels[0].trend!.points).toHaveLength(30);
    expect(week.kpis[0].value).not.toBe(month.kpis[0].value);
  });
});

describe('two kinds of course', () => {
  it('counts a diploma course through its open and running batches, and a single course on itself', () => {
    const c = consoleAt('courses');
    expect(c.studentsOf('cst4')).toBe(28 + 23);
    expect(c.studentsOf('cst3')).toBe(0);
    expect(c.studentsOf('eng')).toBe(318);
  });

  it('says what someone is in: the batch, or the single course', () => {
    const c = consoleAt('students');
    expect(c.inWhat({ course: 'cst4', batch: 'CST-04-B01' })).toBe('CST-04-B01');
    expect(c.inWhat({ course: 'eng' })).toBe('ENG');
    expect(c.S.students.filter((u) => c.course(u.course).kind === 'single').every((u) => !u.batch)).toBe(true);
  });

  it('runs batches for diploma courses only', () => {
    const c = consoleAt('batches', { sel: 'new', form: { course: 'cst5', id: '', start: '', exam: '', seats: 35 } });
    expect(c.S.batches.every((b) => c.course(b.course).kind === 'diploma')).toBe(true);
    const pick = BUILDERS.batches!(c).detail!.blocks[0].fields[0];
    expect(pick.opts!.map((o) => o.label)).toEqual(['CST · 4th Semester', 'CST · 5th Semester']);
  });

  it('lists each kind under its own tab', () => {
    const rows = (filter: string) => BUILDERS.courses!(consoleAt('courses', { filter })).list!.rows.map((r) => r.key);
    expect(rows('diploma')).toEqual(['cst4', 'cst5', 'cst3']);
    expect(rows('single')).toEqual(['eng', 'web', 'car', 'uix']);
    expect(rows('all')).toHaveLength(7);
    expect(rows('archived')).toEqual(['cst3']);
  });

  it('shows a semester by its subjects and a single course by its teacher', () => {
    const sem = BUILDERS.courses!(consoleAt('courses', { sel: 'cst4' })).detail!;
    const subjects = sem.blocks.find((b) => b.title === 'Subjects · 7')!;
    expect(subjects.items.map((x) => x.t)).toContain('Data Structure & Algorithm');
    expect(subjects.items.find((x) => x.t === 'Data Structure & Algorithm')!.right).toBe('Shahriar Hossain');
    expect(sem.blocks[0].fields.some((f) => f.label === 'Teacher')).toBe(false);

    const one = BUILDERS.courses!(consoleAt('courses', { sel: 'eng' })).detail!;
    expect(one.blocks.some((b) => b.title.startsWith('Subjects'))).toBe(false);
    expect(one.blocks[0].fields.some((f) => f.label === 'Teacher')).toBe(true);
    expect(one.actions!.some((a) => a.label === 'Add subject')).toBe(false);
  });

  it('adds a subject to a semester, and refuses a code that is taken', () => {
    const h = live('courses', { sel: 'cst5', form: { _for: 'cst5', title: 'Accounting', code: 'ACC' } });
    BUILDERS.courses!(h.make()).detail!.actions!.find((a) => a.label === 'Add subject')!.go();
    const added = h.state.courses.find((x) => x.id === 'cst5')!.subjects;
    expect(added.map((x) => x.code)).toEqual(['OS', 'NET', 'JAVA', 'SE', 'ACC']);
    expect(h.state.activity[0]).toMatchObject({ area: 'courses', action: 'Added subject', target: 'CST · Accounting' });

    const taken = BUILDERS.courses!(consoleAt('courses', { sel: 'cst5', form: { _for: 'cst5', title: 'Another', code: 'DSA' } })).detail!;
    expect(taken.blocks.find((b) => b.title === 'Add a subject')!.fields[1].hint).toBe('This code is already used');
  });

  it('reaches everyone, one course, or one batch', () => {
    const c = consoleAt('announcements');
    expect(c.reach('all', '')).toBe(51 + 12 + 318 + 126 + 86);
    expect(c.reach('course', 'web')).toBe(126);
    expect(c.reach('course', 'cst4')).toBe(51);
    expect(c.reach('batch', 'CST-04-B01')).toBe(28);
  });

  it('gives certificates for single courses only', () => {
    const c = consoleAt('certificates', { sel: 'new', form: { name: 'Someone', course: 'eng' } });
    expect(BUILDERS.certificates!(c).detail!.blocks[0].fields[1].opts!.map((o) => o.label)).toEqual(['ENG', 'WEB', 'CAR']);
    expect(c.S.certs.every((x) => c.course(x.course).kind === 'single')).toBe(true);
  });
});


describe('who is signed in', () => {
  const nav = (c: AdminConsole) => c.renderVals().navGroups.flatMap((g) => g.items.map((i) => i.key));

  it('draws the console for the signed-in person\'s role', () => {
    const finance = consoleAt('payments', {}, 's2');
    expect(finance.perm('payments')).toBe('edit');
    expect(finance.perm('students')).toBe('view');
    expect(finance.perm('roles')).toBe('none');
    expect(nav(finance)).toEqual(['overview', 'payments', 'refunds', 'students', 'coupons', 'reports', 'activity']);
    expect(consoleAt('students', {}, 's2').renderVals().readOnly).toBe(true);
    expect(nav(consoleAt('overview'))).toContain('roles');
  });

  it('shows the overview instead of a section the role cannot see', () => {
    expect(consoleAt('settings', {}, 's2').renderVals().sec).toBe('overview');
    expect(consoleAt('settings').renderVals().sec).toBe('settings');
  });

  it('lets a super admin preview another staff member\'s view, and nobody else', () => {
    const asFinance = consoleAt('payments', { viewAs: 's2' }).renderVals();
    expect(asFinance.preview).toMatchObject({ name: 'Nabila Chowdhury', role: 'Finance' });
    expect(asFinance.navGroups.flatMap((g) => g.items.map((i) => i.key))).not.toContain('roles');
    expect(asFinance.meName).toBe('Rifat Ahmed');
    // Someone who is not a super admin cannot widen their view by naming one.
    const sneaky = consoleAt('payments', { viewAs: 's1' }, 's2');
    expect(sneaky.renderVals().preview).toBeNull();
    expect(sneaky.perm('roles')).toBe('none');
    expect(sneaky.renderVals().staffOpts).toEqual([]);
  });

  it('offers only active colleagues to preview as', () => {
    expect(consoleAt('overview').renderVals().staffOpts.map((o) => o.name)).toEqual(['Nabila Chowdhury', 'Sakib Rahman']);
  });

  it('logs a change in the name of the signed-in person, even while previewing', () => {
    const x = live('coupons', { viewAs: 's2' });
    x.make().log('coupons', 'Disabled coupon', 'EID25', 'Expired campaign');
    expect(x.state.activity[0]).toMatchObject({ actor: 'Rifat Ahmed', action: 'Disabled coupon', reason: 'Expired campaign' });
  });
});

describe('roles and staff, from the API', () => {
  const action = (c: AdminConsole, label: string) => BUILDERS.roles!(c).detail!.actions!.find((a) => a.label === label)!;

  it('turns what the API sends into what the console draws', () => {
    const finance = team.roles.find((r) => r.id === 'finance')!;
    expect(finance.perms.payments).toBe('edit');
    expect(finance.perms.settings).toBe('none');
    expect(Object.keys(finance.perms)).toHaveLength(14);
    expect(finance.desc).toBe('Payments, refunds, coupons');
    expect(team.roles[0].locked).toBe(true);
    expect(team.staff.map((x) => x.last)).toEqual(['just now', '1 h ago', 'yesterday', '3 days ago', 'Never']);
  });

  it('waits for the API, and says so when it cannot be reached', () => {
    const waiting = BUILDERS.roles!(consoleAt('roles', { rolesState: 'loading', roles: [], staff: [] }));
    expect(waiting.sub).toBe('Loading roles and staff…');
    expect(waiting.matrix).toBeUndefined();
    const failed = BUILDERS.roles!(consoleAt('roles', { rolesState: 'failed', roles: [], staff: [] }));
    expect(failed.sub).toBe('Roles and staff could not be loaded.');
    expect(failed.head.map((a) => a.label)).toEqual(['Try again']);
  });

  it('lists staff with their status', () => {
    const list = BUILDERS.roles!(consoleAt('roles', { rtab: 'staff' })).list!;
    expect(list.cols).toEqual(['Name', 'Role', 'Status', 'Last active']);
    expect(list.rows.map((r) => r.cells[2].t)).toEqual(['Active', 'Active', 'Active', 'Inactive', 'Invited']);
    expect(list.rows[0].cells[0].t).toBe('Rifat Ahmed (you)');
  });

  it('invites a staff member and shows the link to send them', async () => {
    const x = live('roles', { rtab: 'staff', sel: 'new', form: { name: ' Farhan Islam ', email: 'farhan@schoolofgenz.com', role: 'support' } },
      { answer: () => ({ id: 'new-1', link: 'http://localhost:3000/invite/abc', expiresAt: '2026-10-16T06:00:00.000Z' }) });
    action(x.make(), 'Create invitation').go();
    await settle();
    expect(x.calls).toEqual([{ path: '/admin/staff', method: undefined, body: { name: 'Farhan Islam', email: 'farhan@schoolofgenz.com', role: 'support' } }]);
    expect(x.state).toMatchObject({ sel: 'new-1', form: null, link: { for: 'new-1', url: 'http://localhost:3000/invite/abc' } });
    expect(x.done.refreshed).toBe(1);
    expect(x.state.activity[0]).toMatchObject({ action: 'Invited staff', target: 'Farhan Islam · Support' });
  });

  it('does not send an invitation with a name or an email missing', () => {
    const off = (form: object) => action(consoleAt('roles', { rtab: 'staff', sel: 'new', form }), 'Create invitation').op;
    expect(off({ name: 'F', email: 'farhan@schoolofgenz.com', role: 'support' })).toBe(0.45);
    expect(off({ name: 'Farhan Islam', email: 'farhan', role: 'support' })).toBe(0.45);
    expect(off({ name: 'Farhan Islam', email: 'farhan@schoolofgenz.com', role: '' })).toBe(0.45);
    expect(off({ name: 'Farhan Islam', email: 'farhan@schoolofgenz.com', role: 'support' })).toBe(1);
  });

  it('keeps a fresh link on screen with a way to copy it', async () => {
    const x = live('roles', { rtab: 'staff', sel: 's5' }, { answer: () => ({ link: 'http://localhost:3000/invite/xyz', expiresAt: '2026-10-16T06:00:00.000Z' }) });
    action(x.make(), 'New invitation link').go();
    await settle();
    expect(x.calls[0]).toMatchObject({ path: '/admin/staff/s5/link', method: 'POST' });
    const block = BUILDERS.roles!(x.make()).detail!.blocks.find((b) => b.title === 'Invitation link')!;
    expect(block.note).toContain('until 16 Oct');
    block.items[0].actGo();
    expect(x.done.copied).toEqual(['http://localhost:3000/invite/xyz']);
    // The link belongs to that person: it is not shown beside anyone else.
    expect(BUILDERS.roles!(consoleAt('roles', { rtab: 'staff', sel: 's2', link: x.state.link })).detail!.blocks.some((b) => b.title.endsWith('link'))).toBe(false);
  });

  it('asks why before removing access, then sends the reason', async () => {
    const x = live('roles', { rtab: 'staff', sel: 's2' });
    action(x.make(), 'Remove access').go();
    expect(x.state.confirm).toMatchObject({ needReason: true, danger: true });
    expect(x.calls).toEqual([]);
    x.state.confirm!.run('Left the job');
    await settle();
    expect(x.calls).toEqual([{ path: '/admin/staff/s2', method: 'PATCH', body: { active: false, reason: 'Left the job' } }]);
    expect(x.done.refreshed).toBe(1);
  });

  it('does not offer to remove yourself or the only super admin, and offers to restore someone removed', () => {
    const own = BUILDERS.roles!(consoleAt('roles', { rtab: 'staff', sel: 's1' })).detail!;
    expect(own.actions!.find((a) => a.label === 'Remove access')!.op).toBe(0.45);
    expect(own.blocks.find((b) => b.title === 'Role')!.fields[0].hint).toBe('Ask another admin to change your own role.');
    expect(BUILDERS.roles!(consoleAt('roles', { rtab: 'staff', sel: 's4' })).detail!.actions!.map((a) => a.label)).toEqual(['Restore access']);
  });

  it('saves a role with the reason, and says in English when the server refuses', async () => {
    const draft = { _id: 'role:support', ...team.roles.find((r) => r.id === 'support')!, perms: { ...team.roles.find((r) => r.id === 'support')!.perms, refunds: 'view' } };
    const ok = live('roles', { sel: 'support', draft });
    action(ok.make(), 'Save role').go();
    ok.state.confirm!.run('Responsibilities changed');
    await settle();
    expect(ok.calls[0]).toMatchObject({ path: '/admin/roles/support', method: 'PUT', body: { name: 'Support', reason: 'Responsibilities changed' } });
    expect((ok.calls[0].body as { perms: Record<string, string> }).perms.refunds).toBe('view');
    expect(ok.state).toMatchObject({ draft: null, toast: 'Role saved' });

    const refused = live('roles', { sel: 'support', draft }, { answer: () => { throw { code: 'role_locked' }; } });
    action(refused.make(), 'Save role').go();
    refused.state.confirm!.run('Responsibilities changed');
    await settle();
    expect(refused.state.toast).toBe('This role cannot be changed.');
    expect(refused.state.draft).toEqual(draft);
    expect(refused.done.refreshed).toBe(0);
  });

  it('creates a role from the form, and keeps a role with members from being deleted', async () => {
    const perms = { ...team.roles.find((r) => r.id === 'intern')!.perms, payments: 'view' as const };
    const x = live('roles', { sel: 'new', form: { name: 'Night shift', desc: 'Covers the evening queue', perms } }, { answer: () => ({ id: 'night-shift' }) });
    action(x.make(), 'Create role').go();
    await settle();
    expect(x.calls[0]).toMatchObject({ path: '/admin/roles', body: { name: 'Night shift', description: 'Covers the evening queue' } });
    expect(x.state.sel).toBe('night-shift');
    expect(action(consoleAt('roles', { sel: 'support' }), 'Delete').op).toBe(0.45);
    expect(action(consoleAt('roles', { sel: 'intern' }), 'Delete').op).toBe(1);
    expect(BUILDERS.roles!(consoleAt('roles', { sel: 'super' })).detail!.actions).toEqual([]);
  });

  it('deletes an unused role with a reason', async () => {
    const x = live('roles', { sel: 'intern' });
    action(x.make(), 'Delete').go();
    x.state.confirm!.run('No longer needed');
    await settle();
    expect(x.calls).toEqual([{ path: '/admin/roles/intern/delete', method: undefined, body: { reason: 'No longer needed' } }]);
    expect(x.state.sel).toBeNull();
  });

  it('has English words for every refusal it can get, and a general sentence for the rest', () => {
    const general = sayAdmin(new Error('boom'));
    for (const code of ADMIN_CODES) expect(sayAdmin({ code }), code).not.toBe(general);
    expect(sayAdmin({ code: 'something_new' })).toBe(general);
    expect(sayAdmin(undefined)).toBe(general);
    expect(ADMIN_CODES).toEqual(expect.arrayContaining(['role_exists', 'role_locked', 'role_in_use', 'email_taken', 'not_yourself', 'last_super', 'no_permission', 'offline']));
  });
});
