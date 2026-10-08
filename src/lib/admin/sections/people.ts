import type { AdminConsole, Rec } from '../console';
import type { Action, Block, Cert, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;

/** Students: filters, batch change, device reset, due reminders, suspend / unsuspend. */
export function students(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn, tk = c.tk;
  const pass = (u: (typeof S.students)[number], k: string) => k === 'all' || (k === 'due' ? u.due > 0 : u.status === k);
  const rows = S.students.filter((u) => pass(u, S.filter) && c.match(u.name + u.phone + u.batch));
  const v: SectionView = {
    title: 'Students', sub: 'খুঁজে বের করো, ব্যাচ বদলাও, ডিভাইস রিসেট বা সাসপেন্ড করো।', head: [],
    list: c.mkList(
      ([['all', 'All'], ['active', 'Active'], ['pending', 'Pending'], ['due', 'Due'], ['suspended', 'Suspended']] as [string, string][]).map(([k, l]) => [k, l, S.students.filter((u) => pass(u, k)).length]),
      'নাম, নম্বর বা ব্যাচ খোঁজো',
      ['Student', 'Batch', 'Status', 'Progress', 'Paid', 'Devices'], 'minmax(0,1.6fr) minmax(0,1fr) minmax(0,0.9fr) minmax(0,0.7fr) minmax(0,0.9fr) minmax(0,0.6fr)',
      rows.map((u) => ({ id: u.id, cells: [
        c.T(u.name, u.phone, { bold: true, subMono: true }), c.T(u.batch, '', { mono: true }), c.B(u.status), c.T(bn(u.prog) + '%'),
        c.T(tk(u.paid), u.due ? 'বাকি ' + tk(u.due) : '', { subFg: 'var(--warn)' }),
        c.T(bn(u.devices.length) + '/' + bn(S.settings.devices), '', { fg: u.devices.length >= S.settings.devices ? 'var(--warn)' : 'var(--ink)' }),
      ] })),
      'এই ফিল্টারে কোনো স্টুডেন্ট নেই।'),
  };
  const u = S.students.find((x) => x.id === S.sel);
  if (u) {
    const b = S.batches.find((x) => x.id === u.batch), co = c.course(b ? b.course : '');
    const opts = S.batches.filter((x) => b && x.course === b.course && x.status !== 'finished').map((x) => [x.id, x.id + ' · ' + bn(Number(x.seats) - x.enrolled) + ' সিট'] as [string, string]);
    const move = (nb: string) => {
      if (nb === u.batch) return;
      c.ask({ title: u.name + '-কে ' + nb + ' ব্যাচে সরাবে?', body: 'প্রগ্রেস আর পেমেন্ট সাথে যাবে। লিডারবোর্ড নতুন ব্যাচে শুরু হবে, স্টুডেন্ট SMS পাবে।', needReason: true,
        reasons: ['সময় মিলছে না', 'ভুল ব্যাচে ভর্তি', 'স্টুডেন্টের অনুরোধ'], ok: 'Move student',
        run: (r) => {
          c.upd('students', u.id, { batch: nb });
          c.setState((s) => ({ batches: s.batches.map((x) => (x.id === nb ? { ...x, enrolled: x.enrolled + 1 } : x.id === u.batch ? { ...x, enrolled: x.enrolled - 1 } : x)) }));
          c.log('students', 'Changed batch', u.name + ' · ' + u.batch + ' → ' + nb, r); c.flash('ব্যাচ বদলানো হয়েছে — ' + nb);
        } });
    };
    const susp = u.status === 'suspended';
    v.detail = {
      title: u.name, sub: u.phone, badge: c.B(u.status), closable: true,
      blocks: [
        susp ? c.blk({ note: 'সাসপেন্ড করা — ' + u.note, tone: 'danger' }) : null,
        u.status === 'pending' ? c.blk({ note: 'পেমেন্ট এখনো যাচাই হয়নি। Payments queue থেকে অনুমোদন দিলে অ্যাক্সেস চালু হবে।', tone: 'warn' }) : null,
        c.blk({ kv: [c.kv('Course', co.title), c.kv('Joined', c.fd(u.joined)), c.kv('Paid', tk(u.paid)), c.kv('Due', u.due ? tk(u.due) : '—', { fg: u.due ? 'var(--warn)' : 'var(--ink)', bold: !!u.due }), c.kv('Progress', bn(u.prog) + '%')] }),
        c.blk({ title: 'Batch', fields: [c.seg('', opts, u.batch, move, { hint: 'ব্যাচ বদলালে কারণ লিখতে হবে।' })] }),
        c.blk({ title: 'Devices · limit ' + bn(S.settings.devices), items: u.devices.map((d) => c.it(d.n, 'শেষ লগইন ' + d.last)), note: u.devices.length ? '' : 'কোনো ডিভাইসে লগইন নেই।' }),
      ].filter(present) as Block[],
      actions: [
        u.status === 'pending' ? c.A('Open payment queue', () => c.nav('payments'), 'primary', false, true) : null,
        u.due > 0 ? c.A('Send due reminder', () => { c.log('students', 'Sent due reminder', u.name + ' · ' + tk(u.due)); c.flash('SMS পাঠানো হয়েছে — ' + u.phone); }) : null,
        c.A('Reset devices', () => c.ask({ title: u.name + '-এর সব ডিভাইস লগআউট করবে?', body: 'পরের লগইনে নতুন ডিভাইস নিবন্ধিত হবে।', needReason: true, reasons: ['নতুন ফোন', 'ফোন হারিয়েছে', 'ভুল করে লিমিট পূর্ণ'], ok: 'Reset devices',
          run: (r) => { c.upd('students', u.id, { devices: [] }); c.log('students', 'Reset devices', u.name, r); c.flash('ডিভাইস রিসেট হয়েছে'); } }), 'ghost', !u.devices.length),
        susp
          ? c.A('Unsuspend', () => c.ask({ title: u.name + '-এর অ্যাক্সেস ফিরিয়ে দেবে?', body: 'সাথে সাথে কোর্সে ঢুকতে পারবে।', needReason: true, reasons: ['ভুল বোঝাবুঝি মিটেছে', 'সতর্ক করা হয়েছে'], ok: 'Unsuspend',
            run: (r) => { c.upd('students', u.id, { status: 'active', note: '' }); c.log('students', 'Unsuspended', u.name, r); c.flash('অ্যাক্সেস চালু হয়েছে'); } }))
          : c.A('Suspend', () => c.ask({ title: u.name + '-কে সাসপেন্ড করবে?', body: 'সব কোর্সের অ্যাক্সেস সাথে সাথে বন্ধ হবে। টাকা ফেরত যাবে না — রিফান্ড আলাদাভাবে করতে হবে।', needReason: true, danger: true,
            reasons: ['ভিডিও রেকর্ড / শেয়ার', 'একাউন্ট শেয়ার', 'পেমেন্ট জালিয়াতি', 'অশোভন আচরণ'], ok: 'Suspend',
            run: (r) => { c.upd('students', u.id, { status: 'suspended', note: r }); c.log('students', 'Suspended', u.name, r); c.flash(u.name + ' সাসপেন্ড হয়েছে'); } }), 'danger'),
      ].filter(present) as Action[],
    };
  }
  return v;
}

/** Teachers: reply speed, course assignment, invite, reminders, deactivate. */
export function teachers(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn;
  const pass = (t: (typeof S.teachers)[number], k: string) => k === 'all' || (k === 'overdue' ? t.overdue > 0 : t.status === k);
  const rows = S.teachers.filter((t) => pass(t, S.filter) && c.match(t.name + t.email));
  const copts = S.courses.filter((co) => co.status !== 'archived').map((co) => [co.id, co.code] as [string, string]);
  const v: SectionView = {
    title: 'Teachers', sub: 'কোর্স অ্যাসাইন করো, উত্তর দেওয়ার গতি দেখো, নতুন শিক্ষক আনো।',
    head: [c.A('Invite teacher', () => c.setState({ sel: 'new', form: { name: '', email: '', courses: [] } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['active', 'Active'], ['invited', 'Invited'], ['overdue', 'Overdue']] as [string, string][]).map(([k, l]) => [k, l, S.teachers.filter((t) => pass(t, k)).length]),
      'নাম বা ইমেইল',
      ['Teacher', 'Courses', 'Median reply', 'Over 24h', 'Answered · 7d', 'Status'], 'minmax(0,1.6fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.7fr) minmax(0,0.8fr) minmax(0,0.7fr)',
      rows.map((t) => ({ id: t.id, cells: [
        c.T(t.name, t.email, { bold: true }), c.T(t.courses.map((x) => c.course(x).code).join(', ') || '—', '', { mono: true }),
        c.T(t.status === 'active' ? bn(t.med) + ' ঘণ্টা' : '—', '', { fg: t.med > 24 ? 'var(--warn)' : 'var(--ink)' }),
        t.overdue ? c.B('open', bn(t.overdue)) : c.T('—'), c.T(t.status === 'active' ? bn(t.answered) : '—'), c.B(t.status),
      ] })),
      'কেউ নেই।'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, ok = (f.name || '').trim().length > 2 && /.+@.+\..+/.test(f.email || '');
    v.detail = {
      title: 'Invite teacher', sub: 'ইমেইলে লিংক যাবে — সেখান থেকে পাসওয়ার্ড সেট করবে।', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Name', f.name, (x) => c.setF('name', x)),
        c.inp('Email', f.email, (x) => c.setF('email', x), { type: 'email', ph: 'name@example.com' }),
        c.seg('Courses', copts, f.courses || [], (x) => c.setF('courses', c.tog(f.courses || [], x)), { hint: 'পরে বদলানো যাবে।' }),
      ] })],
      actions: [
        c.A('Send invite', () => {
          const id = 't' + Date.now();
          c.setState((s) => ({ teachers: s.teachers.concat([{ id, name: f.name.trim(), email: f.email.trim(), courses: f.courses || [], med: 0, overdue: 0, answered: 0, status: 'invited', joined: c.todayISO() }]), sel: id, form: null }));
          c.log('teachers', 'Invited teacher', f.name.trim() + ' · ' + f.email.trim()); c.flash('ইনভাইট পাঠানো হয়েছে');
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
      c.log('teachers', has ? 'Unassigned course' : 'Assigned course', t.name + ' · ' + c.course(cid).code); c.flash(has ? 'কোর্স সরানো হয়েছে' : 'কোর্স অ্যাসাইন হয়েছে');
    };
    v.detail = {
      title: t.name, sub: t.email, badge: c.B(t.status), closable: true,
      blocks: [
        t.overdue ? c.blk({ note: bn(t.overdue) + 'টা প্রশ্নের উত্তর ২৪ ঘণ্টা পার হয়ে গেছে। স্টুডেন্টদের কথা দেওয়া আছে ২৪ ঘণ্টার মধ্যে উত্তর।', tone: 'warn' }) : null,
        t.status === 'invited' ? c.blk({ note: c.fd(t.joined) + ' ইনভাইট পাঠানো হয়েছে, এখনো একাউন্ট খোলেনি।', tone: 'warn' }) : null,
        c.blk({ kv: [
          c.kv('Joined', c.fd(t.joined)), c.kv('Median reply', t.status === 'active' ? bn(t.med) + ' ঘণ্টা' : '—', { fg: t.med > 24 ? 'var(--warn)' : 'var(--ink)' }),
          c.kv('Answered · 7d', bn(t.answered)),
          c.kv('Students', bn(S.batches.filter((b) => t.courses.includes(b.course) && b.status !== 'finished').reduce((a, b) => a + b.enrolled, 0))),
        ] }),
        c.blk({ title: 'Assigned courses', fields: [c.seg('', copts, t.courses, assign, { dis: t.status === 'inactive' })] }),
      ].filter(present) as Block[],
      actions: [
        t.overdue ? c.A('Send reminder', () => { c.log('teachers', 'Sent reply reminder', t.name + ' · ' + bn(t.overdue) + 'টা প্রশ্ন'); c.flash('রিমাইন্ডার পাঠানো হয়েছে'); }, 'primary') : null,
        t.status === 'invited' ? c.A('Resend invite', () => { c.log('teachers', 'Resent invite', t.email); c.flash('আবার পাঠানো হয়েছে — ' + t.email); }) : null,
        t.status === 'inactive'
          ? c.A('Reactivate', () => { c.upd('teachers', t.id, { status: 'active' }); c.log('teachers', 'Reactivated', t.name); })
          : c.A(t.status === 'invited' ? 'Cancel invite' : 'Deactivate', () => c.ask({
            title: t.name + '-কে ' + (t.status === 'invited' ? 'বাদ দেবে?' : 'নিষ্ক্রিয় করবে?'),
            body: t.courses.length ? 'অ্যাসাইন করা কোর্স (' + t.courses.map((x) => c.course(x).code).join(', ') + ') শিক্ষকহীন হয়ে যাবে — অন্য কাউকে দিতে হবে।' : 'লগইন বন্ধ হবে।',
            needReason: true, danger: true, reasons: ['চুক্তি শেষ', 'নিয়মিত দেরি', 'নিজে ছেড়ে দিয়েছেন'], ok: 'Deactivate',
            run: (r) => { c.upd('teachers', t.id, { status: 'inactive', courses: [] }); c.log('teachers', 'Deactivated teacher', t.name, r); c.flash('নিষ্ক্রিয় করা হয়েছে'); } }), 'danger'),
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
    title: 'Certificates', sub: 'ইস্যু করা সার্টিফিকেট যাচাই, হাতে ইস্যু বা বাতিল করো।',
    head: [c.A('Issue certificate', () => c.setState({ sel: 'new', form: { name: '', course: 'cst' } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['valid', 'Valid'], ['revoked', 'Revoked']] as [string, string][]).map(([k, l]) => [k, l, S.certs.filter((x) => k === 'all' || x.status === k).length]),
      'ID বা নাম',
      ['Certificate ID', 'Student', 'Course', 'Issued', 'Status'], 'minmax(0,1.3fr) minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,0.6fr)',
      rows.map((x) => ({ id: x.id, cells: [c.T(x.id, '', { mono: true }), c.T(x.name, '', { bold: true }), c.T(c.course(x.course).title), c.T(c.fd(x.issued)), c.B(x.status)] })),
      'কিছু পাওয়া যায়নি।'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, ok = (f.name || '').trim().length > 2;
    v.detail = {
      title: 'Issue certificate', sub: 'সাধারণত কোর্স শেষে অটো ইস্যু হয় — এখানে হাতে ইস্যু করা যায়।', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Student name', f.name, (x) => c.setF('name', x), { ph: 'যেমন মাহমুদুল হাসান' }),
        c.seg('Course', S.courses.filter((co) => co.status === 'published').map((co) => [co.id, co.code] as [string, string]), f.course, (x) => c.setF('course', x)),
      ] })],
      actions: [
        c.A('Issue', () => c.ask({ title: f.name.trim() + '-কে ' + c.course(f.course).code + ' সার্টিফিকেট দেবে?', body: 'যাচাই লিংক সাথে সাথে চালু হবে।', needReason: true,
          reasons: ['কোর্স শেষ — সিস্টেম মিস করেছে', 'অফলাইন পরীক্ষায় পাস', 'পুরনো ব্যাচ'], ok: 'Issue',
          run: (r) => {
            const id = 'SGZ-' + c.course(f.course).code + '-' + c.env.today.getFullYear() + '-0' + (400 + S.certs.length);
            const cert: Cert = { id, name: f.name.trim(), course: f.course, issued: c.todayISO(), status: 'valid' };
            c.setState((s) => ({ certs: [cert].concat(s.certs), sel: id, form: null }));
            c.log('certificates', 'Issued certificate', id + ' · ' + f.name.trim(), r); c.flash(id + ' ইস্যু হয়েছে');
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
        x.status === 'revoked' ? c.blk({ note: 'বাতিল — ' + x.reason + '\nযাচাই লিংকে "Revoked" দেখাবে।', tone: 'danger' }) : null,
        c.blk({ kv: [c.kv('Issued', c.fd(x.issued)), c.kv('Verify link', 'schoolofgenz.com/verify/' + x.id, { mono: true })] }),
      ].filter(present) as Block[],
      actions: [
        c.A('Copy verify link', () => {
          try { void navigator.clipboard?.writeText('https://schoolofgenz.com/verify/' + x.id); } catch { /* clipboard unavailable */ }
          c.flash('লিংক কপি হয়েছে');
        }, 'ghost', false, true),
        x.status === 'valid'
          ? c.A('Revoke', () => c.ask({ title: x.id + ' বাতিল করবে?', body: 'যাচাই লিংকে "Revoked" দেখাবে, স্টুডেন্টের প্রোফাইল থেকে সরে যাবে।', needReason: true, danger: true,
            reasons: ['পরীক্ষায় অসদুপায়', 'ভুল তথ্যে ইস্যু', 'পেমেন্ট রিফান্ড হয়েছে'], ok: 'Revoke',
            run: (r) => { c.upd('certs', x.id, { status: 'revoked', reason: r }); c.log('certificates', 'Revoked certificate', x.id, r); c.flash('বাতিল হয়েছে'); } }), 'danger')
          : c.A('Restore', () => c.ask({ title: x.id + ' আবার চালু করবে?', body: 'যাচাই লিংকে আবার "Valid" দেখাবে।', needReason: true, reasons: ['তদন্তে নির্দোষ', 'ভুল করে বাতিল'], ok: 'Restore',
            run: (r) => { c.upd('certs', x.id, { status: 'valid', reason: '' }); c.log('certificates', 'Restored certificate', x.id, r); c.flash('আবার চালু'); } })),
      ],
    };
  }
  return v;
}
