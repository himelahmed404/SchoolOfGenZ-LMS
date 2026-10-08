import type { AdminConsole, Rec } from '../console';
import type { Action, Announcement, Field, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;
const BLANK = { title: '', body: '', aud: 'all', target: '', ch: ['app'], when: 'now', date: '' };

/** Announcements: audience with live reach, in-app / push / SMS (160-char counter, ≈৳0.35 per SMS), send now or schedule. */
export function announcements(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn;
  const audStr = (a: Rec) => (a.aud === 'all' ? 'All students' : a.aud === 'course' ? c.course(a.target).code + ' (সব ব্যাচ)' : a.target);
  const chStr = (a: Rec) => (a.ch as string[]).map((x) => (x === 'sms' ? 'SMS' : x === 'push' ? 'Push' : 'In-app')).join(' + ');
  const rows = S.ann.filter((a) => (S.filter === 'all' || a.status === S.filter) && c.match(a.title));
  const v: SectionView = {
    title: 'Announcements', sub: 'সব স্টুডেন্ট, একটা কোর্স বা একটা ব্যাচকে নোটিশ পাঠাও।',
    head: [c.A('New announcement', () => c.setState({ sel: 'new', form: { ...BLANK } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['sent', 'Sent'], ['scheduled', 'Scheduled'], ['draft', 'Draft']] as [string, string][]).map(([k, l]) => [k, l, S.ann.filter((a) => k === 'all' || a.status === k).length]),
      'শিরোনাম খোঁজো',
      ['Title', 'Audience', 'Channel', 'When', 'Status'], 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,0.7fr) minmax(0,0.7fr)',
      rows.map((a) => ({ id: a.id, cells: [c.T(a.title, '', { bold: true }), c.T(audStr(a), bn(c.reach(a.aud, a.target)) + ' জন'), c.T(chStr(a)), c.T(a.when ? c.fd(a.when) : '—'), c.B(a.status)] })),
      'কোনো নোটিশ নেই।'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || BLANK, n = c.reach(f.aud, f.target), sms = f.ch.includes('sms'), len = (f.body || '').length;
    const ok = f.title.trim().length > 3 && f.body.trim().length > 5 && f.ch.length && (f.aud === 'all' || f.target) && (f.when === 'now' || f.date);
    const fields: Field[] = [
      c.inp('Title', f.title, (x) => c.setF('title', x)),
      c.area('Message', f.body, (x) => c.setF('body', x), { hint: sms ? bn(len) + '/১৬০ অক্ষর' + (len > 160 ? ' — SMS-এ ২ ভাগে যাবে' : '') : '', hintFg: len > 160 ? 'var(--warn)' : 'var(--ink-3)' }),
      c.seg('Audience', [['all', 'All students'], ['course', 'Course'], ['batch', 'Batch']], f.aud, (x) => c.setState({ form: { ...f, aud: x, target: '' } })),
    ];
    if (f.aud === 'course') fields.push(c.seg('Course', S.courses.filter((x) => x.status === 'published').map((x) => [x.id, x.code] as [string, string]), f.target, (x) => c.setF('target', x)));
    if (f.aud === 'batch') fields.push(c.seg('Batch', S.batches.filter((b) => b.status !== 'finished').map((b) => [b.id, b.id] as [string, string]), f.target, (x) => c.setF('target', x)));
    fields.push(c.seg('Channel', [['app', 'In-app'], ['push', 'Push'], ['sms', 'SMS']], f.ch, (x) => c.setF('ch', c.tog(f.ch, x)), { hint: sms && S.settings.sms !== 'on' ? 'Settings-এ SMS বন্ধ আছে।' : '' }));
    fields.push(c.seg('When', [['now', 'Send now'], ['later', 'Schedule']], f.when, (x) => c.setF('when', x)));
    if (f.when === 'later') fields.push(c.inp('Date', f.date, (x) => c.setF('date', x), { type: 'date' }));
    const save = (status: Announcement['status']) => {
      const id = f.id || 'a' + Date.now();
      const rec: Announcement = { id, title: f.title.trim(), body: f.body.trim(), aud: f.aud, target: f.target, ch: f.ch, status, when: status === 'sent' ? c.todayISO() : status === 'scheduled' ? f.date : '' };
      c.setState((s) => ({ ann: [rec].concat(s.ann.filter((a) => a.id !== id)), sel: id, form: null }));
      c.log('announcements', status === 'sent' ? 'Sent announcement' : status === 'scheduled' ? 'Scheduled announcement' : 'Saved draft', rec.title + ' · ' + bn(n) + ' জন');
      c.flash(status === 'sent' ? bn(n) + ' জনকে পাঠানো হয়েছে' : status === 'scheduled' ? c.fd(f.date) + ' পাঠানো হবে' : 'ড্রাফট সেভ হয়েছে');
    };
    v.detail = {
      title: f.id ? 'Edit announcement' : 'New announcement', sub: '', closable: true,
      blocks: [
        c.blk({ fields }),
        c.blk({ kv: [c.kv('Reach', bn(n) + ' জন স্টুডেন্ট', { bold: true })].concat(sms ? [c.kv('SMS cost', '≈ ' + c.tk(n * 0.35 * (len > 160 ? 2 : 1)))] : []) }),
      ],
      actions: [
        // Sending asks for confirmation (with the reach) but needs no reason.
        c.A(f.when === 'later' ? 'Schedule' : 'Send', () => c.ask({ title: bn(n) + ' জন স্টুডেন্টকে ' + (f.when === 'later' ? c.fd(f.date) + ' পাঠাবে?' : 'এখনই পাঠাবে?'),
          body: '“' + f.title.trim() + '”\n' + chStr(f) + ' — পাঠানোর পর ফেরত নেওয়া যাবে না।', ok: f.when === 'later' ? 'Schedule' : 'Send now',
          run: () => save(f.when === 'later' ? 'scheduled' : 'sent') }), 'primary', !ok),
        c.A('Save draft', () => save('draft'), 'ghost', !f.title.trim()),
      ],
    };
  }
  const a = S.ann.find((x) => x.id === S.sel);
  if (a) {
    const reach = c.reach(a.aud, a.target);
    v.detail = {
      title: a.title, sub: audStr(a) + ' · ' + chStr(a), badge: c.B(a.status), closable: true,
      blocks: [
        c.blk({ note: a.body }),
        c.blk({ kv: [c.kv('Reach', bn(reach) + ' জন'), c.kv(a.status === 'sent' ? 'Sent' : 'Scheduled for', a.when ? c.fd(a.when) : '—')]
          .concat(a.status === 'sent' ? [c.kv('Opened', bn(Math.round(reach * 0.72)) + ' জন · ৭২%')] : []) }),
      ],
      actions: [
        a.status !== 'sent'
          ? c.A('Edit', () => c.setState({ sel: 'new', form: { id: a.id, title: a.title, body: a.body, aud: a.aud, target: a.target, ch: a.ch, when: a.status === 'scheduled' ? 'later' : 'now', date: a.when } }), 'primary')
          : c.A('Duplicate', () => c.setState({ sel: 'new', form: { title: a.title, body: a.body, aud: a.aud, target: a.target, ch: a.ch, when: 'now', date: '' } })),
        a.status === 'scheduled' ? c.A('Cancel schedule', () => c.ask({ title: 'শিডিউল বাতিল করবে?', body: 'ড্রাফট হিসেবে থেকে যাবে।', ok: 'Cancel schedule', danger: true,
          run: () => { c.upd('ann', a.id, { status: 'draft', when: '' }); c.log('announcements', 'Cancelled schedule', a.title); } }), 'danger') : null,
      ].filter(present) as Action[],
    };
  }
  return v;
}
