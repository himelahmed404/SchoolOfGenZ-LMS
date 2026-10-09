import { AREAS } from '../seed';
import { SL, type AdminConsole, type Rec } from '../console';
import type { Area, Block, Perm, SectionView, Settings } from '../types';
import { periodTabs, revenueOver } from './revenue';

/** Eight steps from `from` to `to` with a steady wobble, for a tile's trend line. Seeded like the rest of the report. */
const walk = (from: number, to: number, seed: number) => Array.from({ length: 8 }, (_, i) =>
  from + ((to - from) * i) / 7 + (i > 0 && i < 7 ? Math.sin(seed + i * 2.3) * (Math.abs(to - from) || to * 0.1) * 0.4 : 0));

/** Reports: the period switch scopes every number on the page. Tiles, revenue over time, payment split, revenue by course, batch fill, coupons. */
export function reports(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk;
  const R = revenueOver(c), span = R.days, lbl = R.label, vs = R.vs, rev = R.total, revBefore = R.totalBefore;
  const enrolled = Math.round(rev / 2650), enrolledBefore = Math.round(revBefore / 2650);
  const avg = Math.round(rev / Math.max(1, enrolled)), avgBefore = Math.round(revBefore / Math.max(1, enrolledBefore));
  const byCourse = ([['CST', 0.6], ['ENG', 0.24], ['WEB', 0.16], ['UIX', 0], ['CAR', 0]] as [string, number][]).map(([code, share]) => [code, Math.round(rev * share)] as [string, number]);
  const top = Math.max(...byCourse.map((x) => x[1]), 1);
  const scale = span / 30, refunded = 3500 * scale, refundedBefore = 5000 * scale;
  const paidBy = (share: number) => c.pl(Math.round(enrolled * share), 'payment');

  return {
    title: 'Reports', sub: 'Revenue, enrollment, refunds and learning.',
    head: [c.A('Export CSV', () => { c.log('reports', 'Exported report', lbl); c.flash('CSV download started'); }, 'ghost', false, true)],
    dash: {
      seg: periodTabs(c),
      kpis: [
        c.K('Revenue', tk(rev), lbl, 'reports', 'brand', { spark: R.trend.points.map((x) => x.y), delta: c.delta(rev, revBefore, vs, true, true) }),
        c.K('New enrollments', nf(enrolled), lbl, 'students', 'blue', { spark: walk(enrolledBefore, enrolled, 1), delta: c.delta(enrolled, enrolledBefore, vs, true) }),
        c.K('Average payment', tk(avg), 'per enrollment', 'payments', 'muted', { spark: walk(avgBefore, avg, 2), delta: c.delta(avg, avgBefore, vs, true, tk) }),
        c.K('Refunded', tk(refunded), c.pl(Math.max(1, Math.round(2 * scale)), 'request'), 'refunds', 'danger', { spark: walk(refundedBefore, refunded, 3), delta: c.delta(refunded, refundedBefore, vs, false, true) }),
        c.K('Average completion', nf(63) + '%', 'in running batches', 'batches', 'muted', { spark: walk(61, 63, 4), delta: c.delta(63, 61, vs, true, (n) => nf(n) + ' pts') }),
        c.K('Median reply', nf(14) + ' h', 'across teachers', 'teachers', 'warn', { spark: walk(16, 14, 5), delta: c.delta(14, 16, vs, false, (n) => nf(n) + ' h') }),
      ],
      // The first row is the tall one, so the list that grows with the catalog sits beside the chart.
      panels: [
        { title: 'Revenue', sub: lbl + ' · ' + R.by, span: 8, trend: R.trend },
        { title: 'Revenue by course', sub: lbl, span: 4, bars: byCourse.map(([code, v]) => c.bar(code, tk(v), (v / top) * 100)) },
        { title: 'Payment method', sub: 'Share of revenue · ' + lbl.toLowerCase(), span: 4, whole: { label: 'Revenue', value: tk(rev) }, share: [
          { label: 'bKash', value: tk(rev * 0.64), pct: 64, slot: 1, sub: paidBy(0.64) }, { label: 'Nagad', value: tk(rev * 0.36), pct: 36, slot: 2, sub: paidBy(0.36) },
        ] },
        { title: 'Batch fill', sub: 'Enrolled against seats', span: 4,
          meters: S.batches.filter((b) => b.status !== 'finished').map((b) => c.meter(b.id, nf(b.enrolled) + '/' + nf(Number(b.seats)), (b.enrolled / Number(b.seats)) * 100)) },
        { title: 'Coupons', sub: 'All time', span: 4, table: { cols: ['Code', 'Status', 'Uses'], rows: S.coupons.map((k) => [k.code, SL[c.couponStatus(k)], nf(k.used)]) } },
      ],
    },
  };
}

/** Activity log: append-only, filter by area, search; the detail shows the reason. */
export function activity(c: AdminConsole): SectionView {
  const S = c.S;
  const areas = ['all'].concat(Array.from(new Set(S.activity.map((a) => a.area))));
  const rows = S.activity.filter((a) => (S.filter === 'all' || a.area === S.filter) && c.match(a.actor + a.action + a.target + a.reason));
  const v: SectionView = {
    title: 'Activity log', sub: 'Who changed what, when and why. Entries cannot be deleted.',
    head: [c.A('Export CSV', () => c.flash('CSV download started'), 'ghost', false, true)],
    list: c.mkList(areas.map((k) => [k, k === 'all' ? 'All' : c.areaLabel(k), S.activity.filter((a) => k === 'all' || a.area === k).length]),
      'Search name, action or reason',
      ['When', 'Who', 'Area', 'Action'], 'minmax(0,0.7fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,2.4fr)',
      rows.map((a) => ({ id: a.id, cells: [c.T(c.when(a.at)), c.T(a.actor), c.B('x', c.areaLabel(a.area)), c.T(a.action, a.target, { bold: true }), c.T(a.reason || '—', '', { fg: a.reason ? 'var(--ink)' : 'var(--ink-3)' })] })),
      'Nothing found.',
      { cols: ['Reason'], grid: 'minmax(0,0.6fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,1.8fr) minmax(0,1.6fr)' }),
    tabsLabel: 'By area',
    summary: [c.kv('Entries', c.nf(S.activity.length)), c.kv('People', c.nf(new Set(S.activity.map((a) => a.actor)).size)), c.kv('With a reason', c.nf(S.activity.filter((a) => a.reason).length))],
  };
  const a = S.activity.find((x) => x.id === S.sel);
  if (a) v.detail = {
    title: a.action, sub: a.target, closable: true,
    blocks: [c.blk({ kv: [c.kv('When', c.when(a.at)), c.kv('Who', a.actor), c.kv('Area', c.areaLabel(a.area))] }), c.blk({ title: 'Reason', note: a.reason || 'This action does not need a reason.' })],
    actions: [c.A('Open ' + c.areaLabel(a.area), () => c.nav(a.area as Area), 'ghost', false, true)],
  };
  return v;
}

/** Settings: full-width form; saving lists every before → after change and asks for a reason. */
export function settings(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, e = c.edit(S.settings, 'settings'), d = e.d, set = e.set;
  const LBL: Record<keyof Settings, string> = { bkash: 'bKash number', nagad: 'Nagad number', watermark: 'Watermark', devices: 'Device limit', refundDays: 'Refund window', refundWatch: 'Refund watched %', autoClose: 'Auto-close', sms: 'SMS' };
  const sr = S.settings as unknown as Rec;
  const changed = (Object.keys(LBL) as (keyof Settings)[]).filter((k) => String(d[k]) !== String(sr[k]));
  const phoneErr = (x: string) => (/^01\d[\d ]{8,10}$/.test(String(x).trim()) ? '' : 'An 11-digit number starting with 01');
  const err = !!phoneErr(d.bkash) || !!phoneErr(d.nagad) || !(+d.refundDays >= 0) || !(+d.refundWatch >= 0 && +d.refundWatch <= 100);
  const num = (x: string) => (x === '' ? '' : +x);
  const history = S.activity.filter((a) => a.area === 'settings').slice(0, 8);
  return {
    title: 'Settings', sub: 'Rules for the whole platform. Every change needs a reason.', head: [],
    detail: {
      title: 'Platform settings', sub: changed.length ? c.pl(changed.length, 'unsaved change') : 'All saved', closable: false, wide: true,
      blocks: [
        c.blk({ title: 'Payment numbers', fields: [
          c.inp('bKash merchant', d.bkash, (x) => set('bkash', x), { err: phoneErr(d.bkash), hint: 'Students see this number on the payment page.' }),
          c.inp('Nagad merchant', d.nagad, (x) => set('nagad', x), { err: phoneErr(d.nagad) }),
        ] }),
        c.blk({ title: 'Content protection', fields: [
          c.seg('Video watermark', c.onoff(), d.watermark, (x) => set('watermark', x), { inline: true, hint: 'The student\'s name and number float over the video.' }),
          c.seg('Device limit', [[1, nf(1)], [2, nf(2)], [3, nf(3)]], d.devices, (x) => set('devices', x), { inline: true, hint: 'How many devices one account can use. Lowering it signs out the extra devices.' }),
        ] }),
        c.blk({ title: 'Refund policy', fields: [
          c.inp('Refund window (days)', d.refundDays, (x) => set('refundDays', num(x)), { type: 'number' }),
          c.inp('Max watched (%)', d.refundWatch, (x) => set('refundWatch', num(x)), { type: 'number', hint: 'Watching less than this, within the refund window, qualifies for a full refund.' }),
        ] }),
        c.blk({ title: 'Enrollment & messages', fields: [
          c.seg('Auto-close full batches', c.onoff(), d.autoClose, (x) => set('autoClose', x), { inline: true }),
          c.seg('SMS notifications', c.onoff(), d.sms, (x) => set('sms', x), { inline: true, hint: 'Payment approvals, exam dates and notices go out by SMS.' }),
        ] }),
        // Who changed a rule, when and why, so nobody has to leave the page to check.
        c.blk({ title: 'Change history', wide: true, note: history.length ? '' : 'No setting has been changed yet.',
          items: history.map((a) => c.it(a.action + ' — ' + a.target, a.actor + ' · ' + c.when(a.at) + (a.reason ? ' · ' + a.reason : ''), '', 'View', () => c.nav('activity', a.id))) }),
      ],
      actions: [
        c.A('Save changes', () => c.ask({ title: 'Change settings?', body: changed.map((k) => LBL[k] + ': ' + nf(sr[k]) + ' → ' + nf(d[k])).join('\n'), needReason: true,
          reasons: ['New merchant account', 'Policy update', 'Student complaints'], ok: 'Save settings',
          run: (r) => { c.setState({ settings: c.strip(d) as Settings, draft: null }); c.log('settings', 'Changed settings', changed.map((k) => LBL[k]).join(', '), r); c.flash('Settings saved'); } }),
          'primary', !changed.length || err),
        c.A('Discard', () => c.setState({ draft: null }), 'ghost', !e.dirty),
      ],
    },
  };
}

/** One time a link stops working, as "16 Oct". */
const untilDay = (c: AdminConsole, iso: string) => c.fd(iso.slice(0, 10));

/**
 * Roles & staff: custom roles with None / View / Edit per area, staff invited by a link the admin sends, role changes,
 * access switched off and on. Everything here is read from the API and saved through it; the server checks each change
 * and writes its own activity log. The console's log gets a copy so the change shows at once (it moves to the API later).
 */
export function roles(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, me = c.env.me, api = c.env.api, isSuper = !!me.role.locked;
  const reload = () => c.env.refresh('roles');
  const title = 'Roles & staff';
  if (S.rolesState !== 'ready') {
    return S.rolesState === 'loading'
      ? { title, sub: 'Loading roles and staff…', head: [] }
      : { title, sub: 'Roles and staff could not be loaded.', head: [c.A('Try again', reload, 'primary', false, true)] };
  }

  /** Everyone holding a role, whatever their status: a role cannot be deleted while anyone holds it. */
  const members = (rid: string) => S.staff.filter((s) => s.role === rid);
  const noPerms = () => { const p = {} as Record<Area, Perm>; AREAS.forEach(([k]) => { p[k] = 'none'; }); return p; };
  const roleOpts = S.roles.map((r) => [r.id, r.name] as [string, string]);
  const tabs: [string, string, number, () => void][] = [
    ['roles', 'Roles', S.roles.length, () => c.setState({ rtab: 'roles', sel: null, draft: null, form: null })],
    ['staff', 'Staff', S.staff.length, () => c.setState({ rtab: 'staff', sel: null, draft: null, form: null })],
  ];
  const staffTab = S.rtab === 'staff';
  const v: SectionView = {
    title, sub: 'Build custom roles: None, View or Edit for each area.',
    head: [staffTab
      ? c.A('Invite staff', () => c.setState({ sel: 'new', form: { name: '', email: '', role: S.roles.find((r) => !r.locked)?.id || '' } }), 'primary')
      : c.A('New role', () => c.setState({ sel: 'new', draft: null, form: { name: '', desc: '', perms: noPerms() } }), 'primary')],
    list: staffTab
      ? c.mkList(tabs, 'Search name or email', ['Name', 'Role', 'Status', 'Last active'], 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.7fr) minmax(0,0.8fr)',
        S.staff.filter((s) => c.match(s.name + s.email)).map((s) => ({ id: s.id, cells: [
          c.T(s.name + (s.id === me.id ? ' (you)' : ''), s.email, { bold: true }), c.B(c.roleOf(s).locked ? 'published' : 'x', c.roleOf(s).name), c.B(s.status), c.T(s.last),
        ] })), 'Nobody here.')
      : undefined,
    summary: staffTab ? [
      c.kv('Staff', nf(S.staff.length)), c.kv('Waiting to accept', nf(S.staff.filter((s) => s.status === 'invited').length)),
      c.kv('Roles in use', nf(new Set(S.staff.map((s) => s.role)).size)), c.kv('Super admins', nf(S.staff.filter((s) => c.roleOf(s).locked && s.status === 'active').length)),
    ] : undefined,
    // Every role against every area, so a gap or an overlap in access is visible at a glance. A column header opens that role.
    matrix: staffTab ? undefined : {
      filters: c.tabs(tabs),
      cols: S.roles.map((r) => ({
        key: r.id, title: r.name, sub: c.pl(members(r.id).length, 'member') + (r.locked ? ' · locked' : ''), on: S.sel === r.id,
        go: () => c.setState({ sel: r.id, draft: null, form: null }),
      })),
      rows: AREAS.map(([k, label]) => ({
        label,
        cells: S.roles.map((r) => {
          const p = r.locked ? 'edit' : r.perms[k];
          return p === 'edit' ? c.B('published', 'Edit') : p === 'view' ? c.B('x', 'View') : c.T('—', '', { fg: 'var(--ink-3)' });
        }),
      })),
    },
  };

  if (staffTab && S.sel === 'new') {
    const f: Rec = S.form || {}, name = String(f.name || '').trim(), email = String(f.email || '').trim();
    const ok = name.length >= 2 && /^\S+@\S+\.\S+$/.test(email) && !!f.role;
    v.detail = {
      title: 'Invite staff', sub: 'You get a link to send them. It works once.', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Name', f.name, (x) => c.setF('name', x)),
        c.inp('Email', f.email, (x) => c.setF('email', x), { type: 'email', hint: 'They sign in with this.' }),
        c.seg('Role', roleOpts, f.role, (x) => c.setF('role', x)),
      ] })],
      actions: [
        c.A('Create invitation', () => c.send(() => api<{ id: string; link: string; expiresAt: string }>('/admin/staff', { body: { name, email, role: f.role } }), (r) => {
          c.setState({ sel: r.id, form: null, link: { for: r.id, url: r.link, until: r.expiresAt } });
          c.log('roles', 'Invited staff', name + ' · ' + (S.roles.find((x) => x.id === f.role)?.name || f.role));
          reload();
          c.flash('Invitation created. Copy the link and send it.');
        }), 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }

  const st = staffTab ? S.staff.find((x) => x.id === S.sel) : undefined;
  if (st) {
    // Guardrails the server also keeps: nobody changes their own access, and one Super admin always remains.
    const role = c.roleOf(st), isMe = st.id === me.id, off = st.status === 'inactive';
    const supers = S.staff.filter((s) => c.roleOf(s).locked && s.status === 'active').length;
    const lastSuper = !!role.locked && st.status === 'active' && supers <= 1;
    const patch = (body: Rec, done: string, logged: [string, string, string]) =>
      c.send(() => api('/admin/staff/' + st.id, { method: 'PATCH', body }), () => { c.log('roles', ...logged); reload(); c.flash(done); });
    const makeLink = () => c.send(() => api<{ link: string; expiresAt: string }>('/admin/staff/' + st.id + '/link', { method: 'POST' }), (r) => {
      c.setState({ link: { for: st.id, url: r.link, until: r.expiresAt } });
      c.log('roles', st.status === 'invited' ? 'Made a new invitation link' : 'Made a password reset link', st.name);
      c.flash('Link ready. Copy it and send it.');
    });
    const link = S.link && S.link.for === st.id ? S.link : null;
    v.detail = {
      title: st.name, sub: st.email, badge: c.B(st.status), closable: true,
      blocks: [
        c.blk({ kv: [c.kv('Role', role.name), c.kv('Last active', st.last)] }),
        link ? c.blk({
          title: st.status === 'invited' ? 'Invitation link' : 'Password reset link', tone: 'brand',
          note: 'Send this to ' + st.name.split(' ')[0] + ' yourself. It works once, until ' + untilDay(c, link.until) + ', and is not shown again.',
          items: [c.it(link.url, '', '', 'Copy', () => { c.env.copy(link.url); c.flash('Link copied'); })],
        }) : null,
        c.blk({ title: 'Role', fields: [c.seg('', roleOpts, st.role, (x) => {
          if (x === st.role) return;
          const to = S.roles.find((r) => r.id === x)!;
          c.ask({ title: 'Move ' + st.name + ' to the ' + to.name + ' role?', body: 'The new permissions apply from their next request.', needReason: true, reasons: ['Responsibilities changed', 'Temporary cover', 'Was in the wrong role'], ok: 'Change role',
            run: (r) => patch({ role: x, reason: r }, 'Role changed', ['Changed staff role', st.name + ' → ' + to.name, r]) });
        }, { dis: lastSuper || isMe || off, hint: isMe ? 'Ask another admin to change your own role.' : lastSuper ? 'The only Super admin. At least one must remain.' : off ? 'Restore their access to change the role.' : '' })] }),
      ].filter((b): b is Block => !!b),
      actions: off ? [
        c.A('Restore access', () => c.ask({ title: 'Restore access for ' + st.name + '?', body: 'They can sign in again with the role shown.', needReason: true,
          reasons: ['Back at work', 'Removed by mistake'], ok: 'Restore',
          run: (r) => patch({ active: true, reason: r }, 'Access restored', ['Restored staff access', st.name, r]) }), 'primary'),
      ] : [
        c.A(st.status === 'invited' ? 'New invitation link' : 'Password reset link', makeLink),
        c.A('Preview as ' + st.name.split(' ')[0], () => c.viewAs(st.id), 'ghost', !isSuper || isMe || st.status !== 'active', true),
        c.A('Remove access', () => c.ask({ title: 'Remove access for ' + st.name + '?', body: 'They are signed out at once. Their past actions stay in the activity log.', needReason: true, danger: true,
          reasons: ['Left the job', 'Security risk', 'No longer needed'], ok: 'Remove',
          run: (r) => patch({ active: false, reason: r }, 'Access removed', ['Removed staff access', st.name, r]) }),
        'danger', lastSuper || isMe),
      ],
    };
  }

  /** The permission switches of a role being made or edited. */
  const permFields = (d: Rec, set: (k: string, v: unknown) => void, locked: boolean) =>
    AREAS.map(([k, l]) => c.seg(l, [['none', 'None'], ['view', 'View'], ['edit', 'Edit']], locked ? 'edit' : d.perms[k], (x) => set('perms', { ...d.perms, [k]: x }), { inline: true, dis: locked }));
  /** Create a role and open it. */
  const create = (name: string, desc: string, perms: Record<Area, Perm>, logged: string) =>
    c.send(() => api<{ id: string }>('/admin/roles', { body: { name, description: desc, perms } }), (r) => {
      c.setState({ sel: r.id, form: null, draft: null });
      c.log('roles', logged, name);
      reload();
      c.flash('Role created');
    });

  if (!staffTab && S.sel === 'new') {
    const f: Rec = S.form || { name: '', desc: '', perms: noPerms() }, name = String(f.name || '').trim();
    v.detail = {
      title: name || 'New role', sub: 'Name it, then choose what it may see and change.', closable: true,
      blocks: [
        c.blk({ fields: [c.inp('Role name', f.name, (x) => c.setF('name', x)), c.inp('Description', f.desc, (x) => c.setF('desc', x), { ph: 'What this role does' })] }),
        c.blk({ title: 'Permissions', fields: permFields(f, (k, val) => c.setF(k, val), false) }),
      ],
      actions: [
        c.A('Create role', () => create(name, String(f.desc || '').trim(), f.perms, 'Created role'), 'primary', name.length < 2),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }

  const r0 = !staffTab ? S.roles.find((x) => x.id === S.sel) : undefined;
  if (r0) {
    const e = c.edit(r0, 'role:' + r0.id), d = e.d, set = e.set, mem = members(r0.id), name = String(d.name || '').trim();
    v.detail = {
      title: d.name || 'Untitled role', sub: d.desc, closable: true, badge: r0.locked ? c.B('published', 'Locked') : null,
      blocks: [
        r0.locked ? c.blk({ note: 'Super admin can do everything. This cannot be changed.', tone: 'muted' })
          : c.blk({ fields: [c.inp('Role name', d.name, (x) => set('name', x)), c.inp('Description', d.desc, (x) => set('desc', x), { ph: 'What this role does' })] }),
        c.blk({ title: 'Permissions', fields: permFields(d, set, !!r0.locked) }),
        c.blk({ title: 'Members · ' + nf(mem.length), note: mem.length ? '' : 'Nobody has this role.',
          items: mem.map((s) => (isSuper && s.status === 'active' && s.id !== me.id ? c.it(s.name, s.email, '', 'Preview as', () => c.viewAs(s.id)) : c.it(s.name, s.email, s.status === 'active' ? '' : SL[s.status]))) }),
      ],
      actions: r0.locked ? [] : [
        c.A('Save role', () => c.ask({ title: 'Change permissions of the ' + name + ' role?', body: 'Access changes at once for ' + nf(mem.length) + ' staff.', needReason: true,
          reasons: ['Responsibilities changed', 'New feature', 'Had too much access'], ok: 'Save role',
          run: (r) => c.send(() => api('/admin/roles/' + r0.id, { method: 'PUT', body: { name, description: String(d.desc || '').trim(), perms: d.perms, reason: r } }), () => {
            c.setState({ draft: null });
            c.log('roles', 'Changed role permissions', name, r);
            reload();
            c.flash('Role saved');
          }) }),
          'primary', !e.dirty || name.length < 2),
        c.A('Duplicate', () => create(name + ' (copy)', String(d.desc || '').trim(), d.perms, 'Duplicated role')),
        // A role can't be deleted while it has members.
        c.A('Delete', () => c.ask({ title: 'Delete the ' + r0.name + ' role?', body: 'This role can no longer be used.', needReason: true, danger: true, reasons: ['No longer needed', 'Merged into another role'], ok: 'Delete role',
          run: (r) => c.send(() => api('/admin/roles/' + r0.id + '/delete', { body: { reason: r } }), () => {
            c.setState({ sel: null, draft: null });
            c.log('roles', 'Deleted role', r0.name, r);
            reload();
            c.flash('Role deleted');
          }) }), 'danger', mem.length > 0),
      ],
    };
    if (mem.length && !r0.locked) v.detail.blocks.push(c.blk({ note: 'It has members, so it cannot be deleted. Move them to another role first.' }));
  }
  return v;
}
