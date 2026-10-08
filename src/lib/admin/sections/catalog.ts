import { SL, type AdminConsole, type Rec } from '../console';
import type { Action, AdminCourse, Batch, Coupon, Field, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;

/** Courses & pricing: status, teacher, and the pricing model with validation and a student-facing preview. */
export function courses(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn, tk = c.tk;
  const rows = S.courses.filter((x) => (S.filter === 'all' || x.status === S.filter) && c.match(x.code + x.title));
  const studentsOf = (cid: string) => S.batches.filter((b) => b.course === cid && b.status !== 'finished').reduce((a, b) => a + b.enrolled, 0);
  const v: SectionView = {
    title: 'Courses & pricing', sub: 'দাম, কিস্তি, early-bird আর ব্যাচভেদে দাম — সব এখানে।',
    head: [c.A('New course', () => {
      const id = 'c' + Date.now();
      const nc: AdminCourse = { id, code: 'NEW', title: 'নতুন কোর্স', status: 'draft', model: 'one', price: 0, inst: 2, early: 'off', earlyPrice: 0, earlyEnd: '', perBatch: 'off', bp: {}, lessons: 0 };
      c.setState((s) => ({ courses: s.courses.concat([nc]), sel: id, draft: null, filter: 'all' }));
      c.log('courses', 'Created course', 'নতুন কোর্স (draft)');
    }, 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']] as [string, string][]).map(([k, l]) => [k, l, S.courses.filter((x) => k === 'all' || x.status === k).length]),
      'কোর্স খোঁজো',
      ['Course', 'Teacher', 'Pricing', 'Students', 'Status'], 'minmax(0,2fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,0.6fr) minmax(0,0.7fr)',
      rows.map((x) => {
        const t = c.teacherOf(x.id);
        return { id: x.id, cells: [
          c.T(x.title, x.code + ' · ' + bn(x.lessons) + ' লেসন', { bold: true, subMono: true }), c.T(t ? t.name : 'কেউ নেই', '', { fg: t ? 'var(--ink)' : 'var(--warn)' }),
          c.T(c.priceStr(x)), c.T(bn(studentsOf(x.id))), c.B(x.status),
        ] };
      }),
      'কোনো কোর্স নেই।'),
  };
  const c0 = S.courses.find((x) => x.id === S.sel);
  if (c0) {
    const t0 = c.teacherOf(c0.id), e = c.edit({ ...c0, teacher: t0 ? t0.id : 'none' }, 'course:' + c0.id), d = e.d, set = e.set;
    const myB = S.batches.filter((b) => b.course === c0.id && b.status !== 'finished');
    const err: Record<string, string> = {}, paid = d.model !== 'free';
    if (!String(d.title).trim()) err.title = 'নাম লাগবে';
    if (paid && !(+d.price > 0)) err.price = 'দাম ০-এর বেশি হতে হবে';
    if (paid && d.early === 'on' && !(+d.earlyPrice > 0 && +d.earlyPrice < +d.price)) err.early = 'Early-bird দাম মূল দামের চেয়ে কম হতে হবে';
    if (paid && d.early === 'on' && !d.earlyEnd) err.earlyEnd = 'শেষ তারিখ দাও';
    const dl = c.days(d.earlyEnd);
    const num = (x: string) => (x === '' ? '' : +x);
    const fields: Field[] = [c.seg('Model', [['free', 'Free'], ['one', 'One-time'], ['inst', 'Installments']], d.model, (x) => set('model', x))];
    if (paid) {
      fields.push(c.inp('Price (৳)', d.price, (x) => set('price', num(x)), { type: 'number', err: err.price }));
      if (d.model === 'inst') fields.push(c.seg('Installments', [[2, bn(2) + ' কিস্তি'], [3, bn(3) + ' কিস্তি']], d.inst, (x) => set('inst', x),
        { hint: 'প্রতি কিস্তি ' + tk(Math.ceil((+d.price || 0) / d.inst)) + ' · প্রথম কিস্তি দিলেই ভর্তি, পরেরটা ৩০ দিন পর পর।' }));
      fields.push(c.seg('Early-bird', c.onoff(), d.early, (x) => set('early', x), { inline: true }));
      if (d.early === 'on') {
        fields.push(c.inp('Early-bird price (৳)', d.earlyPrice, (x) => set('earlyPrice', num(x)), { type: 'number', err: err.early }));
        fields.push(c.inp('Ends on', d.earlyEnd, (x) => set('earlyEnd', x), { type: 'date', err: err.earlyEnd, hint: dl == null ? '' : dl < 0 ? 'শেষ হয়ে গেছে' : bn(dl) + ' দিন বাকি' }));
      }
      if (myB.length) {
        fields.push(c.seg('Different price per batch', c.onoff(), d.perBatch, (x) => set('perBatch', x), { inline: true }));
        if (d.perBatch === 'on') myB.forEach((b) => fields.push(c.inp(b.id + ' (৳)', d.bp[b.id] != null ? d.bp[b.id] : d.price, (x) => set('bp', { ...d.bp, [b.id]: num(x) }), { type: 'number' })));
      }
    }
    const c0r = c0 as unknown as Rec;
    const priceChanged = (c0.status === 'published' && ['model', 'price', 'inst', 'early', 'earlyPrice', 'earlyEnd', 'perBatch'].some((k) => String(d[k]) !== String(c0r[k]))) || JSON.stringify(d.bp) !== JSON.stringify(c0.bp);
    const commit = (r: string) => {
      const nd = c.strip(d), tid = nd.teacher;
      delete nd.teacher;
      c.setState((s) => ({
        courses: s.courses.map((x) => (x.id === c0.id ? { ...x, ...nd } : x)), draft: null,
        teachers: tid === (t0 ? t0.id : 'none') ? s.teachers : s.teachers.map((t) => ({ ...t, courses: t.id === tid ? t.courses.concat([c0.id]) : t.courses.filter((cc) => cc !== c0.id) })),
      }));
      c.log('courses', nd.status !== c0.status ? 'Changed status → ' + SL[nd.status] : 'Updated course', nd.code + ' · ' + c.priceStr({ ...c0, ...nd }), r);
      c.flash('সেভ হয়েছে');
    };
    const save = () => {
      if (d.status === 'archived' && c0.status !== 'archived') return c.ask({ title: c0.code + ' আর্কাইভ করবে?', body: 'নতুন ভর্তি বন্ধ হবে। যারা ভর্তি আছে তারা শেষ পর্যন্ত দেখতে পারবে।', needReason: true, danger: true,
        reasons: ['কোর্স পুরনো হয়ে গেছে', 'নতুন ভার্সন আসছে', 'শিক্ষক নেই'], ok: 'Archive', run: commit });
      if (priceChanged) return c.ask({ title: c0.code + '-এর দাম বদলাবে?', body: 'নতুন: ' + c.priceStr({ ...c0, ...d }) + '\nআগে যারা ভর্তি হয়েছে তাদের দাম বদলাবে না।', needReason: true,
        reasons: ['প্রমোশন', 'বাজারের সাথে মেলানো', 'কন্টেন্ট বেড়েছে'], ok: 'Save price', run: commit });
      commit('');
    };
    const noLessons = d.status === 'published' && c0.lessons === 0;
    v.detail = {
      title: d.title || 'Untitled', sub: d.code + ' · ' + bn(c0.lessons) + ' লেসন · ' + bn(studentsOf(c0.id)) + ' জন', badge: c.B(c0.status), closable: true,
      blocks: [
        c.blk({ fields: [
          c.inp('Title', d.title, (x) => set('title', x), { err: err.title }),
          c.inp('Code', d.code, (x) => set('code', x.toUpperCase().slice(0, 4))),
          c.seg('Status', [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']], d.status, (x) => set('status', x), { hint: noLessons ? 'লেসন ছাড়া পাবলিশ করা যাবে না।' : '' }),
          c.seg('Teacher', S.teachers.filter((t) => t.status !== 'inactive').map((t) => [t.id, t.name] as [string, string]).concat([['none', 'কেউ না']]), d.teacher, (x) => set('teacher', x)),
        ] }),
        c.blk({ title: 'Pricing', fields }),
        c.blk({ note: 'স্টুডেন্ট দেখবে: ' + c.priceStr(d), tone: 'brand' }),
      ],
      actions: [
        c.A('Save changes', save, 'primary', !e.dirty || Object.keys(err).length > 0 || noLessons),
        c.A('Discard', () => c.setState({ draft: null }), 'ghost', !e.dirty),
      ],
    };
  }
  return v;
}

/** Batches & exams: schedule, seats (never below enrolled) and enrollment status; moving an exam date notifies the batch. */
export function batches(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn;
  const rows = S.batches.filter((b) => (S.filter === 'all' || b.status === S.filter) && c.match(b.id));
  const v: SectionView = {
    title: 'Batches & exams', sub: 'ব্যাচ খোলো, সিট ঠিক করো, পরীক্ষার তারিখ বদলাও।',
    head: [c.A('New batch', () => c.setState({ sel: 'new', form: { course: 'web', id: 'WEB-01-B04', start: '', exam: '', seats: 35 } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['enrolling', 'Enrolling'], ['running', 'Running'], ['closed', 'Closed'], ['finished', 'Finished']] as [string, string][]).map(([k, l]) => [k, l, S.batches.filter((b) => k === 'all' || b.status === k).length]),
      'ব্যাচ কোড',
      ['Batch', 'Course', 'Start', 'Exam', 'Seats', 'Status'], 'minmax(0,1.1fr) minmax(0,1.6fr) minmax(0,0.8fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.7fr)',
      rows.map((b) => {
        const d = c.days(b.exam) ?? 0, left = Number(b.seats) - b.enrolled;
        return { id: b.id, cells: [
          c.T(b.id, '', { mono: true, bold: true }), c.T(c.course(b.course).title), c.T(c.fd(b.start)),
          c.T(c.fd(b.exam), b.status !== 'finished' && d >= 0 ? bn(d) + ' দিন বাকি' : '', { subFg: d <= 30 ? 'var(--warn)' : 'var(--ink-3)' }),
          c.T(bn(b.enrolled) + '/' + bn(b.seats), b.status !== 'finished' ? bn(left) + ' খালি' : '', { subFg: left <= 2 ? 'var(--warn)' : 'var(--ink-3)' }),
          c.B(b.status),
        ] };
      }),
      'কোনো ব্যাচ নেই।'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, dup = S.batches.some((b) => b.id === f.id);
    const ok = /^[A-Z]{3}-\d{2}-B\d{2}$/.test(f.id || '') && !dup && !!f.start && !!f.exam && f.exam > f.start && +f.seats > 0;
    v.detail = {
      title: 'New batch', sub: 'Enrolling অবস্থায় খুলবে — স্টুডেন্টরা সাথে সাথে ভর্তি হতে পারবে।', closable: true,
      blocks: [c.blk({ fields: [
        c.seg('Course', S.courses.filter((x) => x.status === 'published').map((x) => [x.id, x.code] as [string, string]), f.course, (x) => c.setF('course', x)),
        c.inp('Batch code', f.id, (x) => c.setF('id', x.toUpperCase()), { ph: 'WEB-01-B04', err: dup ? 'এই কোড আগেই আছে' : '', hint: 'ফরম্যাট: CODE-সেমিস্টার-Bনম্বর' }),
        c.inp('Starts', f.start, (x) => c.setF('start', x), { type: 'date' }),
        c.inp('Exam date', f.exam, (x) => c.setF('exam', x), { type: 'date', err: f.exam && f.start && f.exam <= f.start ? 'শুরুর পরে হতে হবে' : '' }),
        c.inp('Seats', f.seats, (x) => c.setF('seats', x === '' ? '' : +x), { type: 'number' }),
      ] })],
      actions: [
        c.A('Create batch', () => {
          const nb: Batch = { id: f.id, course: f.course, start: f.start, exam: f.exam, seats: +f.seats, enrolled: 0, status: 'enrolling' };
          c.setState((s) => ({ batches: [nb].concat(s.batches), sel: f.id, form: null }));
          c.log('batches', 'Created batch', f.id); c.flash(f.id + ' খোলা হয়েছে');
        }, 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }
  const b0 = S.batches.find((x) => x.id === S.sel);
  if (b0) {
    const e = c.edit(b0, 'batch:' + b0.id), d = e.d, set = e.set, done = b0.status === 'finished';
    const seatErr = +d.seats < b0.enrolled ? bn(b0.enrolled) + ' জন ভর্তি আছে — এর কম করা যাবে না' : '';
    const examMoved = d.exam !== b0.exam;
    const commit = (r: string) => {
      c.upd('batches', b0.id, c.strip(d)); c.setState({ draft: null });
      c.log('batches', examMoved ? 'Moved exam date' : 'Updated batch', b0.id + (examMoved ? ' · ' + c.fd(b0.exam) + ' → ' + c.fd(d.exam) : ''), r);
      c.flash(examMoved ? bn(b0.enrolled) + ' জন স্টুডেন্টকে নতুন তারিখ SMS করা হয়েছে' : 'সেভ হয়েছে');
    };
    v.detail = {
      title: b0.id, sub: c.course(b0.course).title, badge: c.B(b0.status), closable: true,
      blocks: [
        c.blk({ kv: [c.kv('Enrolled', bn(b0.enrolled) + ' / ' + bn(b0.seats)), c.kv('Exam in', done ? '—' : bn(c.days(b0.exam) ?? 0) + ' দিন'), c.kv('Teacher', (c.teacherOf(b0.course) || { name: 'কেউ নেই' }).name)] }),
        c.blk({ title: 'Schedule', fields: [
          c.inp('Starts', d.start, (x) => set('start', x), { type: 'date', dis: done }),
          c.inp('Exam date', d.exam, (x) => set('exam', x), { type: 'date', dis: done, hint: examMoved ? 'সেভ করলে সব স্টুডেন্ট SMS পাবে, কাউন্টডাউন বদলে যাবে।' : '' }),
          c.inp('Seats', d.seats, (x) => set('seats', x === '' ? '' : +x), { type: 'number', dis: done, err: seatErr }),
        ] }),
        done ? c.blk({ note: 'এই ব্যাচ শেষ — শুধু দেখা যাবে।' })
          : c.blk({ title: 'Enrollment', fields: [c.seg('', [['enrolling', 'Open'], ['running', 'Running'], ['closed', 'Closed']], d.status, (x) => set('status', x),
            { hint: 'Closed করলে নতুন কেউ ভর্তি হতে পারবে না। ' + (S.settings.autoClose === 'on' ? 'সিট পূর্ণ হলে অটো-বন্ধ হয়।' : '') })] }),
      ],
      actions: done ? [] : [
        c.A('Save changes', () => (examMoved ? c.ask({ title: 'পরীক্ষার তারিখ ' + c.fd(d.exam) + '-এ সরাবে?', body: bn(b0.enrolled) + ' জন স্টুডেন্টকে SMS যাবে, ড্যাশবোর্ডের কাউন্টডাউন বদলে যাবে।', needReason: true,
          reasons: ['বোর্ডের সময়সূচি বদলেছে', 'সিলেবাস শেষ হয়নি', 'ছুটি'], ok: 'Move exam', run: commit }) : commit('')), 'primary', !e.dirty || !!seatErr),
        c.A('Discard', () => c.setState({ draft: null }), 'ghost', !e.dirty),
      ],
    };
  }
  return v;
}

/** Coupons: code rules, % or ৳ off, scope, limit and expiry; status is derived. */
export function coupons(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn, tk = c.tk;
  const disc = (k: Coupon) => (k.type === 'pct' ? bn(k.value) + '%' : tk(k.value));
  const scope = (s: string) => (s === 'all' ? 'All courses' : c.course(s).code);
  const rows = S.coupons.filter((k) => (S.filter === 'all' || c.couponStatus(k) === S.filter) && c.match(k.code));
  const v: SectionView = {
    title: 'Coupons', sub: 'ডিসকাউন্ট কোড বানাও, লিমিট আর মেয়াদ ঠিক করো।',
    head: [c.A('New coupon', () => c.setState({ sel: 'new', form: { code: '', type: 'pct', value: '', scope: 'all', limit: 100, exp: '' } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['active', 'Active'], ['expired', 'Expired'], ['usedup', 'Used up'], ['disabled', 'Disabled']] as [string, string][]).map(([k, l]) => [k, l, S.coupons.filter((x) => k === 'all' || c.couponStatus(x) === k).length]),
      'কোড খোঁজো',
      ['Code', 'Discount', 'Applies to', 'Used', 'Expires', 'Status'], 'minmax(0,1.1fr) minmax(0,0.7fr) minmax(0,0.9fr) minmax(0,0.8fr) minmax(0,0.8fr) minmax(0,0.7fr)',
      rows.map((k) => ({ id: k.id, cells: [
        c.T(k.code, '', { mono: true, bold: true }), c.T(disc(k)), c.T(scope(k.scope)), c.T(bn(k.used) + ' / ' + (k.limit ? bn(k.limit) : '∞')), c.T(c.fd(k.exp)), c.B(c.couponStatus(k)),
      ] })),
      'কোনো কুপন নেই।'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || {}, dup = S.coupons.some((k) => k.code === f.code), vErr = f.type === 'pct' && +f.value > 90 ? '৯০%-এর বেশি দেওয়া যাবে না' : '';
    const ok = /^[A-Z0-9]{4,12}$/.test(f.code || '') && !dup && +f.value > 0 && !vErr && !!f.exp && (c.days(f.exp) ?? -1) >= 0;
    v.detail = {
      title: 'New coupon', sub: 'চেকআউটে স্টুডেন্ট কোডটা লিখলে দাম কমবে।', closable: true,
      blocks: [c.blk({ fields: [
        c.inp('Code', f.code, (x) => c.setF('code', x.toUpperCase().replace(/[^A-Z0-9]/g, '')), { ph: 'PUJA20', err: dup ? 'এই কোড আগেই আছে' : '', hint: '৪–১২ অক্ষর, শুধু ইংরেজি অক্ষর আর সংখ্যা' }),
        c.seg('Type', [['pct', '% off'], ['amt', '৳ off']], f.type, (x) => c.setF('type', x)),
        c.inp('Value', f.value, (x) => c.setF('value', x === '' ? '' : +x), { type: 'number', err: vErr }),
        c.seg('Applies to', ([['all', 'All courses']] as [string, string][]).concat(S.courses.filter((x) => x.model !== 'free' && x.status === 'published').map((x) => [x.id, x.code] as [string, string])), f.scope, (x) => c.setF('scope', x)),
        c.inp('Usage limit', f.limit, (x) => c.setF('limit', x === '' ? '' : +x), { type: 'number', hint: '০ মানে সীমাহীন' }),
        c.inp('Expires', f.exp, (x) => c.setF('exp', x), { type: 'date' }),
      ] })],
      actions: [
        c.A('Create coupon', () => {
          const id = 'k' + Date.now();
          const nk: Coupon = { id, code: f.code, type: f.type, value: +f.value, scope: f.scope, used: 0, limit: +f.limit || 0, exp: f.exp, disabled: false };
          c.setState((s) => ({ coupons: [nk].concat(s.coupons), sel: id, form: null, filter: 'all' }));
          c.log('coupons', 'Created coupon', f.code + ' · ' + (f.type === 'pct' ? f.value + '%' : '৳' + f.value)); c.flash(f.code + ' চালু হয়েছে');
        }, 'primary', !ok),
        c.A('Cancel', () => c.setState({ sel: null, form: null }), 'ghost', false, true),
      ],
    };
  }
  const k = S.coupons.find((x) => x.id === S.sel);
  if (k) {
    const st = c.couponStatus(k), avg = k.scope === 'all' ? 2500 : Number(c.course(k.scope).price) || 2500;
    const cost = k.type === 'pct' ? (k.used * avg * k.value) / 100 : k.used * k.value;
    const left = c.days(k.exp);
    v.detail = {
      title: k.code, sub: disc(k) + ' · ' + scope(k.scope), badge: c.B(st), closable: true,
      blocks: [
        c.blk({ kv: [c.kv('Used', bn(k.used) + ' / ' + (k.limit ? bn(k.limit) : '∞')), c.kv('Expires', c.fd(k.exp) + (left != null && left >= 0 ? ' · ' + bn(left) + ' দিন বাকি' : '')), c.kv('Discount given', '≈ ' + tk(cost), { mono: true })] }),
        c.blk({ title: 'Recent redemptions', items: k.used ? S.students.slice(0, 3).map((u, i) => c.it(u.name, u.batch, ['আজ', 'গতকাল', '২ দিন আগে'][i])) : [], note: k.used ? '' : 'এখনো কেউ ব্যবহার করেনি।' }),
      ],
      actions: [
        st === 'expired' || st === 'usedup' ? c.A('Extend 30 days', () => {
          const base = Math.max(c.env.today.getTime(), new Date(k.exp + 'T00:00:00').getTime());
          const nx = new Date(base + 30 * 864e5).toISOString().slice(0, 10);
          c.upd('coupons', k.id, { exp: nx, limit: k.limit && k.used >= k.limit ? k.limit + 50 : k.limit });
          c.log('coupons', 'Extended coupon', k.code + ' → ' + c.fd(nx)); c.flash('মেয়াদ বাড়ানো হয়েছে');
        }, 'primary') : null,
        k.disabled
          ? c.A('Enable', () => { c.upd('coupons', k.id, { disabled: false }); c.log('coupons', 'Enabled coupon', k.code); c.flash('আবার চালু'); }, 'primary')
          : c.A('Disable', () => c.ask({ title: k.code + ' বন্ধ করবে?', body: 'এখন থেকে চেকআউটে কাজ করবে না। আগে যারা ব্যবহার করেছে তাদের কিছু হবে না।', needReason: true, danger: true,
            reasons: ['অপব্যবহার হচ্ছে', 'প্রমোশন শেষ', 'ভুল করে বানানো'], ok: 'Disable',
            run: (r) => { c.upd('coupons', k.id, { disabled: true }); c.log('coupons', 'Disabled coupon', k.code, r); c.flash(k.code + ' বন্ধ'); } }), 'danger'),
      ].filter(present) as Action[],
    };
  }
  return v;
}
