import type { AdminConsole, Rec } from '../console';
import type { Action, Block, Cert, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;

/** Students: filters, batch change, device reset, due reminders, suspend / unsuspend. */
export function students(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk;
  const pass = (u: (typeof S.students)[number], k: string) => k === 'all' || (k === 'due' ? u.due > 0 : u.status === k);
  const rows = S.students.filter((u) => pass(u, S.filter) && c.match(u.name + u.phone + u.batch));
  const v: SectionView = {
    title: 'Students', sub: 'Find a student, move batch, reset devices or suspend.', head: [],
    list: c.mkList(
      ([['all', 'All'], ['active', 'Active'], ['pending', 'Pending'], ['due', 'Due'], ['suspended', 'Suspended']] as [string, string][]).map(([k, l]) => [k, l, S.students.filter((u) => pass(u, k)).length]),
      'Search name, phone or batch',
      ['Student', 'Batch', 'Status', 'Progress', 'Paid', 'Devices'], 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,0.7fr) minmax(0,0.9fr) minmax(0,0.6fr)',
      rows.map((u) => ({ id: u.id, cells: [
        c.T(u.name, u.phone, { bold: true, subMono: true }), c.T(u.batch, '', { mono: true }), c.B(u.status), c.T(nf(u.prog) + '%'),
        c.T(tk(u.paid), u.due ? 'Due ' + tk(u.due) : '', { subFg: 'var(--warn)' }),
        c.T(nf(u.devices.length) + '/' + nf(S.settings.devices), '', { fg: u.devices.length >= S.settings.devices ? 'var(--warn)' : 'var(--ink)' }),
      ] })),
      'No students match this filter.'),
  };
  const u = S.students.find((x) => x.id === S.sel);
  if (u) {
    const b = S.batches.find((x) => x.id === u.batch), co = c.course(b ? b.course : '');
    const opts = S.batches.filter((x) => b && x.course === b.course && x.status !== 'finished').map((x) => [x.id, x.id + ' · ' + c.pl(Number(x.seats) - x.enrolled, 'seat') + ' left'] as [string, string]);
    const move = (nb: string) => {
      if (nb === u.batch) return;
      c.ask({ title: 'Move ' + u.name + ' to ' + nb + '?', body: 'Progress and payments move with the student. The leaderboard starts over in the new batch, and the student gets an SMS.', needReason: true,
        reasons: ['Schedule conflict', 'Enrolled in the wrong batch', 'Student request'], ok: 'Move student',
        run: (r) => {
          c.upd('students', u.id, { batch: nb });
          c.setState((s) => ({ batches: s.batches.map((x) => (x.id === nb ? { ...x, enrolled: x.enrolled + 1 } : x.id === u.batch ? { ...x, enrolled: x.enrolled - 1 } : x)) }));
          c.log('students', 'Changed batch', u.name + ' · ' + u.batch + ' → ' + nb, r); c.flash('Moved to ' + nb);
        } });
    };
    const susp = u.status === 'suspended';
    v.detail = {
      title: u.name, sub: u.phone, badge: c.B(u.status), closable: true,
      blocks: [
        susp ? c.blk({ note: 'Suspended — ' + u.note, tone: 'danger' }) : null,
        u.status === 'pending' ? c.blk({ note: 'Payment not verified yet. Access starts once it is approved in the Payments queue.', tone: 'warn' }) : null,
        c.blk({ kv: [c.kv('Course', co.title), c.kv('Joined', c.fd(u.joined)), c.kv('Paid', tk(u.paid)), c.kv('Due', u.due ? tk(u.due) : '—', { fg: u.due ? 'var(--warn)' : 'var(--ink)', bold: !!u.due }), c.kv('Progress', nf(u.prog) + '%')] }),
        c.blk({ title: 'Batch', fields: [c.seg('', opts, u.batch, move, { hint: 'Moving a student needs a reason.' })] }),
        c.blk({ title: 'Devices · limit ' + nf(S.settings.devices), items: u.devices.map((d) => c.it(d.n, 'Last sign-in ' + d.last)), note: u.devices.length ? '' : 'Not signed in on any device.' }),
      ].filter(present) as Block[],
      actions: [
        u.status === 'pending' ? c.A('Open payment queue', () => c.nav('payments'), 'primary', false, true) : null,
        u.due > 0 ? c.A('Send due reminder', () => { c.log('students', 'Sent due reminder', u.name + ' · ' + tk(u.due)); c.flash('SMS sent to ' + u.phone); }) : null,
        c.A('Reset devices', () => c.ask({ title: 'Sign ' + u.name + ' out of all devices?', body: 'The next sign-in registers a new device.', needReason: true, reasons: ['New phone', 'Lost phone', 'Limit reached by mistake'], ok: 'Reset devices',
          run: (r) => { c.upd('students', u.id, { devices: [] }); c.log('students', 'Reset devices', u.name, r); c.flash('Devices reset'); } }), 'ghost', !u.devices.length),
        susp
          ? c.A('Unsuspend', () => c.ask({ title: 'Restore access for ' + u.name + '?', body: 'They can open their courses right away.', needReason: true, reasons: ['Misunderstanding resolved', 'Warned'], ok: 'Unsuspend',
            run: (r) => { c.upd('students', u.id, { status: 'active', note: '' }); c.log('students', 'Unsuspended', u.name, r); c.flash('Access restored'); } }))
          : c.A('Suspend', () => c.ask({ title: 'Suspend ' + u.name + '?', body: 'Access to every course stops at once. No money is returned; a refund is handled separately.', needReason: true, danger: true,
            reasons: ['Recorded or shared videos', 'Shared the account', 'Payment fraud', 'Abusive behaviour'], ok: 'Suspend',
            run: (r) => { c.upd('students', u.id, { status: 'suspended', note: r }); c.log('students', 'Suspended', u.name, r); c.flash(u.name + ' suspended'); } }), 'danger'),
      ].filter(present) as Action[],
    };
  }
  return v;
}

/** Teachers: reply speed, course assignment, invite, reminders, deactivate. */
export function teachers(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf;
  const pass = (t: (typeof S.teachers)[number], k: string) => k === 'all' || (k === 'overdue' ? t.overdue > 0 : t.status === k);
  const rows = S.teachers.filter((t) => pass(t, S.filter) && c.match(t.name + t.email));
  const copts = S.courses.filter((co) => co.status !== 'archived').map((co) => [co.id, co.code] as [string, string]);
  const v: SectionView = {
    title: 'Teachers', sub: 'Assign courses, watch reply times, invite new teachers.',
    head: [c.A('Invite teacher', () => c.setState({ sel: 'new', form: { name: '', email: '', courses: [] } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['active', 'Active'], ['invited', 'Invited'], ['overdue', 'Overdue']] as [string, string][]).map(([k, l]) => [k, l, S.teachers.filter((t) => pass(t, k)).length]),
      'Search name or email',
      ['Teacher', 'Courses', 'Median reply', 'Over 24h', 'Answered · 7d', 'Status'], 'minmax(0,1.6fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.7fr) minmax(0,0.8fr) minmax(0,0.7fr)',
      rows.map((t) => ({ id: t.id, cells: [
        c.T(t.name, t.email, { bold: true }), c.T(t.courses.map((x) => c.course(x).code).join(', ') || '—', '', { mono: true }),
        c.T(t.status === 'active' ? nf(t.med) + ' h' : '—', '', { fg: t.med > 24 ? 'var(--warn)' : 'var(--ink)' }),
        t.overdue ? c.B('open', nf(t.overdue)) : c.T('—'), c.T(t.status === 'active' ? nf(t.answered) : '—'), c.B(t.status),
      ] })),
      'No teachers here.'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, ok = (f.name || '').trim().length > 2 && /.+@.+\..+/.test(f.email || '');
    v.detail = {
      title: 'Invite teacher', sub: 'They get a link by email and set a password from it.', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Name', f.name, (x) => c.setF('name', x)),
        c.inp('Email', f.email, (x) => c.setF('email', x), { type: 'email', ph: 'name@example.com' }),
        c.seg('Courses', copts, f.courses || [], (x) => c.setF('courses', c.tog(f.courses || [], x)), { hint: 'Can be changed later.' }),
      ] })],
      actions: [
        c.A('Send invite', () => {
          const id = 't' + Date.now();
          c.setState((s) => ({ teachers: s.teachers.concat([{ id, name: f.name.trim(), email: f.email.trim(), courses: f.courses || [], med: 0, overdue: 0, answered: 0, status: 'invited', joined: c.todayISO() }]), sel: id, form: null }));
          c.log('teachers', 'Invited teacher', f.name.trim() + ' · ' + f.email.trim()); c.flash('Invite sent');
        }, 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }
  const t = S.teachers.find((x) => x.id === S.sel);
  if (t) {
    const assign = (cid: string) => {
      const has = t.courses.includes(cid);
      c.upd('teachers', t.id, { courses: c.tog(t.courses, cid) });
      c.log('teachers', has ? 'Unassigned course' : 'Assigned course', t.name + ' · ' + c.course(cid).code); c.flash(has ? 'Course unassigned' : 'Course assigned');
    };
    v.detail = {
      title: t.name, sub: t.email, badge: c.B(t.status), closable: true,
      blocks: [
        t.overdue ? c.blk({ note: c.pl(t.overdue, 'question') + ' waiting over 24 hours. Students are promised a reply within 24 hours.', tone: 'warn' }) : null,
        t.status === 'invited' ? c.blk({ note: 'Invited on ' + c.fd(t.joined) + '. The account has not been opened yet.', tone: 'warn' }) : null,
        c.blk({ kv: [
          c.kv('Joined', c.fd(t.joined)), c.kv('Median reply', t.status === 'active' ? nf(t.med) + ' h' : '—', { fg: t.med > 24 ? 'var(--warn)' : 'var(--ink)' }),
          c.kv('Answered · 7d', nf(t.answered)),
          c.kv('Students', nf(S.batches.filter((b) => t.courses.includes(b.course) && b.status !== 'finished').reduce((a, b) => a + b.enrolled, 0))),
        ] }),
        c.blk({ title: 'Assigned courses', fields: [c.seg('', copts, t.courses, assign, { dis: t.status === 'inactive' })] }),
      ].filter(present) as Block[],
      actions: [
        t.overdue ? c.A('Send reminder', () => { c.log('teachers', 'Sent reply reminder', t.name + ' · ' + c.pl(t.overdue, 'question')); c.flash('Reminder sent'); }, 'primary') : null,
        t.status === 'invited' ? c.A('Resend invite', () => { c.log('teachers', 'Resent invite', t.email); c.flash('Invite sent again to ' + t.email); }) : null,
        t.status === 'inactive'
          ? c.A('Reactivate', () => { c.upd('teachers', t.id, { status: 'active' }); c.log('teachers', 'Reactivated', t.name); })
          : c.A(t.status === 'invited' ? 'Cancel invite' : 'Deactivate', () => c.ask({
            title: (t.status === 'invited' ? 'Remove ' : 'Deactivate ') + t.name + '?',
            body: t.courses.length ? 'Their courses (' + t.courses.map((x) => c.course(x).code).join(', ') + ') will have no teacher until you assign someone else.' : 'They will no longer be able to sign in.',
            needReason: true, danger: true, reasons: ['Contract ended', 'Repeated late replies', 'Left on their own'], ok: 'Deactivate',
            run: (r) => { c.upd('teachers', t.id, { status: 'inactive', courses: [] }); c.log('teachers', 'Deactivated teacher', t.name, r); c.flash('Deactivated'); } }), 'danger'),
      ].filter(present) as Action[],
    };
  }
  return v;
}

/** Certificates: verify, issue manually, revoke and restore (each with a reason). */
export function certificates(c: AdminConsole): SectionView {
  const S = c.S;
  const rows = S.certs.filter((x) => (S.filter === 'all' || x.status === S.filter) && c.match(x.id + x.name));
  const v: SectionView = {
    title: 'Certificates', sub: 'Check issued certificates, issue one by hand, or revoke.',
    head: [c.A('Issue certificate', () => c.setState({ sel: 'new', form: { name: '', course: 'cst' } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['valid', 'Valid'], ['revoked', 'Revoked']] as [string, string][]).map(([k, l]) => [k, l, S.certs.filter((x) => k === 'all' || x.status === k).length]),
      'Search ID or name',
      ['Certificate ID', 'Student', 'Course', 'Issued', 'Status'], 'minmax(0,1.3fr) minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,0.6fr)',
      rows.map((x) => ({ id: x.id, cells: [c.T(x.id, '', { mono: true }), c.T(x.name, '', { bold: true }), c.T(c.course(x.course).title), c.T(c.fd(x.issued)), c.B(x.status)] })),
      'Nothing found.'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, ok = (f.name || '').trim().length > 2;
    v.detail = {
      title: 'Issue certificate', sub: 'Certificates are normally issued automatically when a course is finished. Use this to issue one by hand.', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Student name', f.name, (x) => c.setF('name', x), { ph: 'e.g. Mahmudul Hasan' }),
        c.seg('Course', S.courses.filter((co) => co.status === 'published').map((co) => [co.id, co.code] as [string, string]), f.course, (x) => c.setF('course', x)),
      ] })],
      actions: [
        c.A('Issue', () => c.ask({ title: 'Issue a ' + c.course(f.course).code + ' certificate to ' + f.name.trim() + '?', body: 'The verification link works at once.', needReason: true,
          reasons: ['Course finished but not issued', 'Passed an offline exam', 'Earlier batch'], ok: 'Issue',
          run: (r) => {
            const id = 'SGZ-' + c.course(f.course).code + '-' + c.env.today.getFullYear() + '-0' + (400 + S.certs.length);
            const cert: Cert = { id, name: f.name.trim(), course: f.course, issued: c.todayISO(), status: 'valid' };
            c.setState((s) => ({ certs: [cert].concat(s.certs), sel: id, form: null }));
            c.log('certificates', 'Issued certificate', id + ' · ' + f.name.trim(), r); c.flash(id + ' issued');
          } }), 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }
  const x = S.certs.find((y) => y.id === S.sel);
  if (x) {
    v.detail = {
      title: x.id, sub: x.name + ' · ' + c.course(x.course).title, badge: c.B(x.status), closable: true,
      blocks: [
        x.status === 'revoked' ? c.blk({ note: 'Revoked — ' + x.reason + '\nThe verification link shows "Revoked".', tone: 'danger' }) : null,
        c.blk({ kv: [c.kv('Issued', c.fd(x.issued)), c.kv('Verify link', 'schoolofgenz.com/verify/' + x.id, { mono: true })] }),
      ].filter(present) as Block[],
      actions: [
        c.A('Copy verify link', () => {
          try { void navigator.clipboard?.writeText('https://schoolofgenz.com/verify/' + x.id); } catch { /* clipboard unavailable */ }
          c.flash('Link copied');
        }, 'ghost', false, true),
        x.status === 'valid'
          ? c.A('Revoke', () => c.ask({ title: 'Revoke ' + x.id + '?', body: 'The verification link will show "Revoked", and the certificate leaves the student\'s profile.', needReason: true, danger: true,
            reasons: ['Cheated in the exam', 'Issued on wrong information', 'Payment was refunded'], ok: 'Revoke',
            run: (r) => { c.upd('certs', x.id, { status: 'revoked', reason: r }); c.log('certificates', 'Revoked certificate', x.id, r); c.flash('Revoked'); } }), 'danger')
          : c.A('Restore', () => c.ask({ title: 'Restore ' + x.id + '?', body: 'The verification link will show "Valid" again.', needReason: true, reasons: ['Cleared after review', 'Revoked by mistake'], ok: 'Restore',
            run: (r) => { c.upd('certs', x.id, { status: 'valid', reason: '' }); c.log('certificates', 'Restored certificate', x.id, r); c.flash('Restored'); } })),
      ],
    };
  }
  return v;
}
