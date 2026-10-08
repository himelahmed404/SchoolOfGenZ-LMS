import type { AdminConsole, Rec } from '../console';
import type { Action, Announcement, Field, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;
const BLANK = { title: '', body: '', aud: 'all', target: '', ch: ['app'], when: 'now', date: '' };

/** Announcements: audience with live reach, in-app / push / SMS (160-char counter, ≈৳0.35 per SMS), send now or schedule. */
export function announcements(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf;
  const audStr = (a: Rec) => (a.aud === 'all' ? 'All students' : a.aud === 'course' ? c.course(a.target).code + ' (all batches)' : a.target);
  const chStr = (a: Rec) => (a.ch as string[]).map((x) => (x === 'sms' ? 'SMS' : x === 'push' ? 'Push' : 'In-app')).join(' + ');
  const rows = S.ann.filter((a) => (S.filter === 'all' || a.status === S.filter) && c.match(a.title));
  const v: SectionView = {
    title: 'Announcements', sub: 'Send a notice to all students, one course or one batch.',
    head: [c.A('New announcement', () => c.setState({ sel: 'new', form: { ...BLANK } }), 'primary')],
    list: c.mkList(
      ([['all', 'All'], ['sent', 'Sent'], ['scheduled', 'Scheduled'], ['draft', 'Draft']] as [string, string][]).map(([k, l]) => [k, l, S.ann.filter((a) => k === 'all' || a.status === k).length]),
      'Search titles',
      ['Title', 'Audience', 'Channel', 'When', 'Status'], 'minmax(0,2.2fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,0.7fr) minmax(0,0.7fr)',
      rows.map((a) => ({ id: a.id, cells: [c.T(a.title, '', { bold: true }), c.T(audStr(a), c.pl(c.reach(a.aud, a.target), 'student')), c.T(chStr(a)), c.T(a.when ? c.fd(a.when) : '—'), c.B(a.status)] })),
      'No announcements.'),
  };
  if (S.sel === 'new') {
    const f: Rec = S.form || BLANK, n = c.reach(f.aud, f.target), sms = f.ch.includes('sms'), len = (f.body || '').length;
    const ok = f.title.trim().length > 3 && f.body.trim().length > 5 && f.ch.length && (f.aud === 'all' || f.target) && (f.when === 'now' || f.date);
    const fields: Field[] = [
      c.inp('Title', f.title, (x) => c.setF('title', x)),
      c.area('Message', f.body, (x) => c.setF('body', x), { hint: sms ? nf(len) + '/160 characters' + (len > 160 ? ' — sent as 2 SMS' : '') : '', hintFg: len > 160 ? 'var(--warn)' : 'var(--ink-3)' }),
      c.seg('Audience', [['all', 'All students'], ['course', 'Course'], ['batch', 'Batch']], f.aud, (x) => c.setState({ form: { ...f, aud: x, target: '' } })),
    ];
    if (f.aud === 'course') fields.push(c.seg('Course', S.courses.filter((x) => x.status === 'published').map((x) => [x.id, x.code] as [string, string]), f.target, (x) => c.setF('target', x)));
    if (f.aud === 'batch') fields.push(c.seg('Batch', S.batches.filter((b) => b.status !== 'finished').map((b) => [b.id, b.id] as [string, string]), f.target, (x) => c.setF('target', x)));
    fields.push(c.seg('Channel', [['app', 'In-app'], ['push', 'Push'], ['sms', 'SMS']], f.ch, (x) => c.setF('ch', c.tog(f.ch, x)), { hint: sms && S.settings.sms !== 'on' ? 'SMS is turned off in Settings.' : '' }));
    fields.push(c.seg('When', [['now', 'Send now'], ['later', 'Schedule']], f.when, (x) => c.setF('when', x)));
    if (f.when === 'later') fields.push(c.inp('Date', f.date, (x) => c.setF('date', x), { type: 'date' }));
    const save = (status: Announcement['status']) => {
      const id = f.id || 'a' + Date.now();
      const rec: Announcement = { id, title: f.title.trim(), body: f.body.trim(), aud: f.aud, target: f.target, ch: f.ch, status, when: status === 'sent' ? c.todayISO() : status === 'scheduled' ? f.date : '' };
      c.setState((s) => ({ ann: [rec].concat(s.ann.filter((a) => a.id !== id)), sel: id, form: null }));
      c.log('announcements', status === 'sent' ? 'Sent announcement' : status === 'scheduled' ? 'Scheduled announcement' : 'Saved draft', rec.title + ' · ' + c.pl(n, 'student'));
      c.flash(status === 'sent' ? 'Sent to ' + c.pl(n, 'student') : status === 'scheduled' ? 'Scheduled for ' + c.fd(f.date) : 'Draft saved');
    };
    v.detail = {
      title: f.id ? 'Edit announcement' : 'New announcement', sub: '', closable: true,
      blocks: [
        c.blk({ fields }),
        c.blk({ kv: [c.kv('Reach', c.pl(n, 'student'), { bold: true })].concat(sms ? [c.kv('SMS cost', '≈ ' + c.tk(n * 0.35 * (len > 160 ? 2 : 1)))] : []) }),
      ],
      actions: [
        // Sending asks for confirmation (with the reach) but needs no reason.
        c.A(f.when === 'later' ? 'Schedule' : 'Send', () => c.ask({ title: (f.when === 'later' ? 'Schedule this for ' + c.fd(f.date) + ', to ' : 'Send this now to ') + c.pl(n, 'student') + '?',
          body: '“' + f.title.trim() + '”\n' + chStr(f) + ' — it cannot be recalled once sent.', ok: f.when === 'later' ? 'Schedule' : 'Send now',
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
        c.blk({ kv: [c.kv('Reach', c.pl(reach, 'student')), c.kv(a.status === 'sent' ? 'Sent' : 'Scheduled for', a.when ? c.fd(a.when) : '—')]
          .concat(a.status === 'sent' ? [c.kv('Opened', c.pl(Math.round(reach * 0.72), 'student') + ' · 72%')] : []) }),
      ],
      actions: [
        a.status !== 'sent'
          ? c.A('Edit', () => c.setState({ sel: 'new', form: { id: a.id, title: a.title, body: a.body, aud: a.aud, target: a.target, ch: a.ch, when: a.status === 'scheduled' ? 'later' : 'now', date: a.when } }), 'primary')
          : c.A('Duplicate', () => c.setState({ sel: 'new', form: { title: a.title, body: a.body, aud: a.aud, target: a.target, ch: a.ch, when: 'now', date: '' } })),
        a.status === 'scheduled' ? c.A('Cancel schedule', () => c.ask({ title: 'Cancel the schedule?', body: 'It stays as a draft.', ok: 'Cancel schedule', danger: true,
          run: () => { c.upd('ann', a.id, { status: 'draft', when: '' }); c.log('announcements', 'Cancelled schedule', a.title); } }), 'danger') : null,
      ].filter(present) as Action[],
    };
  }
  return v;
}
