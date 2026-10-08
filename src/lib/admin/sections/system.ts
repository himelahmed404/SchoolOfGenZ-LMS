import { AREAS } from '../seed';
import { SL, type AdminConsole, type Rec } from '../console';
import type { Area, Perm, Role, SectionView, Settings } from '../types';

/** Reports: period switch, KPI tiles, revenue by course, payment method split, batch fill and coupon use. */
export function reports(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk;
  const m = { week: 0.24, month: 1, quarter: 2.9 }[S.period], lbl = { week: 'This week', month: 'This month', quarter: 'Last 3 months' }[S.period];
  // Seeded until reporting exists.
  const byC: [string, number][] = [['CST', 112000], ['ENG', 46000], ['WEB', 30000], ['UIX', 0], ['CAR', 0]], tot = byC.reduce((a, b) => a + b[1], 0);
  const seg = ([['week', 'This week'], ['month', 'This month'], ['quarter', 'Last 3 months']] as [ConsoleState['period'], string][]).map(([k, l]) => {
    const on = S.period === k;
    return { label: l, go: () => c.setState({ period: k }), bg: on ? 'var(--brand-soft)' : 'var(--surface)', fg: on ? 'var(--brand)' : 'var(--ink-2)', bd: on ? 'var(--brand)' : 'var(--line-strong)', weight: on ? 600 : 400 };
  });
  return {
    title: 'Reports', sub: lbl + ' — revenue, enrollment, refunds and learning progress.',
    head: [c.A('Export CSV', () => { c.log('reports', 'Exported report', lbl); c.flash('CSV download started'); }, 'ghost', false, true)],
    dash: {
      hasSeg: true, seg,
      kpis: [
        c.K('Revenue', tk(tot * m), lbl, 'reports', 'brand'),
        c.K('New enrollments', nf(Math.round(71 * m)), lbl, 'students', 'blue'),
        c.K('Refunded', tk(3500 * m), c.pl(Math.max(1, Math.round(2 * m)), 'request'), 'refunds', 'danger'),
        c.K('Completion', nf(63) + '%', 'average of running batches', 'batches', 'muted'),
        c.K('Median reply', nf(14) + ' h', 'across teachers', 'teachers', 'warn'),
      ],
      panels: [
        { title: 'Revenue by course', hasBars: true, bars: byC.map(([code, v]) => c.bar(code, tk(v * m), (v / 112000) * 100)), hasItems: false, items: [] },
        { title: 'Payment method', hasBars: true, bars: [c.bar('bKash', nf(64) + '%', 64), c.bar('Nagad', nf(36) + '%', 36, 'var(--accent-2)')], hasItems: false, items: [] },
        { title: 'Batch fill', hasBars: true, bars: S.batches.filter((b) => b.status !== 'finished').map((b) => c.bar(b.id, nf(b.enrolled) + '/' + nf(b.seats), (b.enrolled / Number(b.seats)) * 100, b.enrolled / Number(b.seats) > 0.9 ? 'var(--warn)' : 'var(--accent-2)')), hasItems: false, items: [] },
        { title: 'Coupons', hasItems: true, items: S.coupons.map((k) => c.it(k.code, SL[c.couponStatus(k)], c.pl(k.used, 'use'))), hasBars: false, bars: [] },
      ],
    },
  };
}
type ConsoleState = AdminConsole['S'];

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
      rows.map((a) => ({ id: a.id, cells: [c.T(c.when(a.at)), c.T(a.actor), c.B('x', c.areaLabel(a.area)), c.T(a.action, a.target + (a.reason ? ' · Reason: ' + a.reason : ''), { bold: true })] })),
      'Nothing found.'),
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

/** Roles & staff: custom roles with None / View / Edit per area, staff invites, role changes, View as. */
export function roles(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, me = c.me();
  const members = (rid: string) => S.staff.filter((s) => s.role === rid);
  const summ = (r: Role) => {
    if (r.locked) return 'Everything';
    const ps = Object.values(r.perms);
    return nf(ps.filter((p) => p === 'edit').length) + ' edit · ' + nf(ps.filter((p) => p === 'view').length) + ' view';
  };
  const tabs: [string, string, number, () => void][] = [
    ['roles', 'Roles', S.roles.length, () => c.setState({ rtab: 'roles', sel: null, draft: null, form: null })],
    ['staff', 'Staff', S.staff.length, () => c.setState({ rtab: 'staff', sel: null, draft: null, form: null })],
  ];
  const staffTab = S.rtab === 'staff';
  const v: SectionView = {
    title: 'Roles & staff', sub: 'Build custom roles: None, View or Edit for each area.',
    head: [staffTab
      ? c.A('Invite staff', () => c.setState({ sel: 'new', form: { name: '', email: '', role: 'support' } }), 'primary')
      : c.A('New role', () => {
        const id = 'r' + Date.now(), p = {} as Record<Area, Perm>;
        AREAS.forEach(([k]) => { p[k] = 'none'; });
        c.setState((s) => ({ roles: s.roles.concat([{ id, name: 'New role', desc: '', perms: p }]), sel: id, draft: null }));
        c.log('roles', 'Created role', 'New role');
      }, 'primary')],
    list: staffTab
      ? c.mkList(tabs, 'Search name or email', ['Name', 'Role', 'Last active'], 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.8fr)',
        S.staff.filter((s) => c.match(s.name + s.email)).map((s) => ({ id: s.id, cells: [
          c.T(s.name + (s.id === me.id ? ' (you)' : ''), s.email, { bold: true }), c.B(c.roleOf(s).locked ? 'published' : 'x', c.roleOf(s).name), c.T(s.last),
        ] })), 'Nobody here.')
      : c.mkList(tabs, '', ['Role', 'Access', 'Members'], 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,0.6fr)',
        S.roles.map((r) => ({ id: r.id, cells: [c.T(r.name, r.desc, { bold: true }), c.T(summ(r)), c.T(nf(members(r.id).length))] })), ''),
  };

  if (staffTab && S.sel === 'new') {
    const f: Rec = S.form || {}, ok = (f.name || '').trim().length > 2 && /.+@.+\..+/.test(f.email || '');
    v.detail = {
      title: 'Invite staff', sub: 'A sign-in link goes to their email.', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Name', f.name, (x) => c.setF('name', x)),
        c.inp('Email', f.email, (x) => c.setF('email', x), { type: 'email' }),
        c.seg('Role', S.roles.map((r) => [r.id, r.name] as [string, string]), f.role, (x) => c.setF('role', x)),
      ] })],
      actions: [
        c.A('Send invite', () => {
          const id = 's' + Date.now(), roleName = (S.roles.find((r) => r.id === f.role) || S.roles[0]).name;
          c.setState((s) => ({ staff: s.staff.concat([{ id, name: f.name.trim(), email: f.email.trim(), role: f.role, last: 'Invite sent' }]), sel: id, form: null }));
          c.log('roles', 'Invited staff', f.name.trim() + ' · ' + roleName); c.flash('Invite sent');
        }, 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }

  const st = staffTab ? S.staff.find((x) => x.id === S.sel) : undefined;
  if (st) {
    // Guardrails: never remove yourself or the last Super admin.
    const supers = S.staff.filter((s) => c.roleOf(s).locked).length, lastSuper = !!c.roleOf(st).locked && supers <= 1;
    v.detail = {
      title: st.name, sub: st.email, badge: c.B('x', c.roleOf(st).name), closable: true,
      blocks: [
        c.blk({ kv: [c.kv('Last active', st.last)] }),
        c.blk({ title: 'Role', fields: [c.seg('', S.roles.map((r) => [r.id, r.name] as [string, string]), st.role, (x) => {
          if (x === st.role) return;
          const to = S.roles.find((r) => r.id === x)!;
          c.ask({ title: 'Move ' + st.name + ' to the ' + to.name + ' role?', body: 'The new permissions apply from the next page load.', needReason: true, reasons: ['Responsibilities changed', 'Temporary cover', 'Was in the wrong role'], ok: 'Change role',
            run: (r) => { c.upd('staff', st.id, { role: x }); c.log('roles', 'Changed staff role', st.name + ' → ' + to.name, r); c.flash('Role changed'); } });
        }, { dis: lastSuper, hint: lastSuper ? 'The only Super admin. At least one must remain.' : '' })] }),
      ],
      actions: [
        c.A('View as ' + st.name.split(' ')[0], () => c.viewAs(st.id), 'ghost', false, true),
        c.A('Remove access', () => c.ask({ title: 'Remove access for ' + st.name + '?', body: 'They are signed out at once. Their past actions stay in the activity log.', needReason: true, danger: true,
          reasons: ['Left the job', 'Security risk', 'No longer needed'], ok: 'Remove',
          run: (r) => { c.setState((s) => ({ staff: s.staff.filter((x) => x.id !== st.id), sel: null })); c.log('roles', 'Removed staff', st.name, r); c.flash('Access removed'); } }),
        'danger', lastSuper || st.id === me.id),
      ],
    };
  }

  const r0 = !staffTab ? S.roles.find((x) => x.id === S.sel) : undefined;
  if (r0) {
    const e = c.edit(r0, 'role:' + r0.id), d = e.d, set = e.set, mem = members(r0.id);
    const fields = AREAS.map(([k, l]) => c.seg(l, [['none', 'None'], ['view', 'View'], ['edit', 'Edit']], d.locked ? 'edit' : d.perms[k], (x) => set('perms', { ...d.perms, [k]: x }), { inline: true, dis: !!d.locked }));
    v.detail = {
      title: d.name || 'Untitled role', sub: d.desc, closable: true, badge: r0.locked ? c.B('published', 'Locked') : null,
      blocks: [
        r0.locked ? c.blk({ note: 'Super admin can do everything. This cannot be changed.', tone: 'muted' })
          : c.blk({ fields: [c.inp('Role name', d.name, (x) => set('name', x)), c.inp('Description', d.desc, (x) => set('desc', x), { ph: 'What this role does' })] }),
        c.blk({ title: 'Permissions', fields }),
        c.blk({ title: 'Members · ' + nf(mem.length), items: mem.map((s) => c.it(s.name, s.email, '', 'View as', () => c.viewAs(s.id))), note: mem.length ? '' : 'Nobody has this role.' }),
      ],
      actions: r0.locked ? [] : [
        c.A('Save role', () => c.ask({ title: 'Change permissions of the ' + d.name + ' role?', body: 'Access changes at once for ' + nf(mem.length) + ' staff.', needReason: true,
          reasons: ['Responsibilities changed', 'New feature', 'Had too much access'], ok: 'Save role',
          run: (r) => { c.upd('roles', r0.id, c.strip(d)); c.setState({ draft: null }); c.log('roles', 'Changed role permissions', d.name, r); c.flash('Role saved'); } }),
          'primary', !e.dirty || !String(d.name).trim()),
        c.A('Duplicate', () => {
          const id = 'r' + Date.now();
          c.setState((s) => ({ roles: s.roles.concat([{ ...(c.strip(d) as Role), id, name: d.name + ' (copy)', locked: false }]), sel: id, draft: null }));
          c.log('roles', 'Duplicated role', d.name);
        }),
        // A role can't be deleted while it has members.
        c.A('Delete', () => c.ask({ title: 'Delete the ' + d.name + ' role?', body: 'This role can no longer be used.', needReason: true, danger: true, reasons: ['No longer needed', 'Merged into another role'], ok: 'Delete role',
          run: (r) => { c.setState((s) => ({ roles: s.roles.filter((x) => x.id !== r0.id), sel: null, draft: null })); c.log('roles', 'Deleted role', d.name, r); } }), 'danger', mem.length > 0),
      ],
    };
    if (mem.length && !r0.locked) v.detail.blocks.push(c.blk({ note: 'It has members, so it cannot be deleted. Move them to another role first.' }));
  }
  return v;
}
