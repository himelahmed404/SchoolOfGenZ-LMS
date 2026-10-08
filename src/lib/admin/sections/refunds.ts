import type { AdminConsole, Rec } from '../console';
import type { Block, Refund, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;

/**
 * Refunds: paid within N days AND watched under M% (Settings) is "Eligible" at the full amount;
 * anything else the admin decides, with an editable full or partial amount.
 */
export function refunds(c: AdminConsole): SectionView {
  const S = c.S, bn = c.bn, tk = c.tk, st = S.settings;
  const pol = (r: Refund) => (r.status === 'open' ? c.refundVerdict(r) : r.status);
  const rows = S.refunds.filter((r) => (S.filter === 'all' || r.status === S.filter) && c.match(r.name + r.batch + r.number));
  const v: SectionView = {
    title: 'Refunds', sub: bn(st.refundDays) + ' দিনের মধ্যে আর ' + bn(st.refundWatch) + '%-এর কম দেখলে পুরো টাকা — বাকিগুলো তুমি ঠিক করবে।', head: [],
    list: c.mkList(
      ([['open', 'Open'], ['refunded', 'Refunded'], ['denied', 'Denied'], ['all', 'All']] as [string, string][]).map(([k, l]) => [k, l, S.refunds.filter((r) => k === 'all' || r.status === k).length]),
      'নাম, ব্যাচ বা নম্বর',
      ['Student', 'Batch', 'Paid', 'Paid ago', 'Watched', 'Policy'], 'minmax(0,1.5fr) minmax(0,1fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.9fr)',
      rows.map((r) => ({ id: r.id, cells: [
        c.T(r.name, r.method + ' · ' + r.number, { bold: true }), c.T(r.batch, '', { mono: true }), c.T(tk(r.paid)),
        c.T(bn(r.ago) + ' দিন', '', { fg: r.ago > Number(st.refundDays) ? 'var(--warn)' : 'var(--ink)' }),
        c.T(bn(r.watched) + '%', '', { fg: r.watched >= Number(st.refundWatch) ? 'var(--warn)' : 'var(--ink)' }),
        c.B(pol(r)),
      ] })),
      'কোনো রিফান্ড অনুরোধ নেই।'),
  };
  const r = S.refunds.find((x) => x.id === S.sel);
  if (r) {
    const okDays = r.ago <= Number(st.refundDays), okWatch = r.watched < Number(st.refundWatch), elig = okDays && okWatch, open = r.status === 'open';
    const f: Rec = S.form && S.form._id === r.id ? S.form : { _id: r.id, amount: elig ? r.paid : '' };
    const amt = +f.amount, aErr = f.amount !== '' && (amt <= 0 || amt > r.paid) ? '০ থেকে ' + tk(r.paid) + '-এর মধ্যে হতে হবে' : '';
    const mark = (ok: boolean) => (ok ? '✓ ' : '✕ ');
    v.detail = {
      title: r.name, sub: r.batch + ' · ' + r.method + ' ' + r.number, badge: c.B(pol(r)), closable: true,
      blocks: [
        c.blk({ title: 'Request', note: '“' + r.why + '”' }),
        c.blk({ title: 'Policy check', kv: [
          c.kv(mark(okDays) + bn(st.refundDays) + ' দিনের মধ্যে', bn(r.ago) + ' দিন আগে পেমেন্ট', { fg: okDays ? 'var(--brand)' : 'var(--margin)', bold: true }),
          c.kv(mark(okWatch) + bn(st.refundWatch) + '%-এর কম দেখা', bn(r.watched) + '% দেখেছে', { fg: okWatch ? 'var(--brand)' : 'var(--margin)', bold: true }),
          c.kv('Paid', tk(r.paid)),
        ] }),
        open ? c.blk({ note: elig ? 'পলিসি অনুযায়ী পুরো টাকা ফেরত পাবে।' : 'পলিসির বাইরে — পুরো, আংশিক, ব্যাচ বদল নাকি বাতিল, তুমি ঠিক করবে।', tone: elig ? 'brand' : 'warn' }) : null,
        open ? c.blk({ fields: [c.inp('Refund amount (৳)', f.amount, (x) => c.setState({ form: { ...f, amount: x === '' ? '' : +x } }),
          { type: 'number', dis: elig, err: aErr, hint: elig ? 'পলিসিতে পুরো টাকা — বদলানো যাবে না।' : 'আংশিক দিতে চাইলে কম লেখো।' })] }) : null,
        !open ? c.blk({ kv: [c.kv(r.status === 'refunded' ? 'Refunded' : 'Denied', r.status === 'refunded' ? tk(r.amount || 0) : '—', { bold: true }), c.kv('Reason', r.reason || '—')] }) : null,
      ].filter(present) as Block[],
      actions: open ? [
        c.A('Approve ' + (f.amount !== '' ? tk(amt) : 'refund'), () => c.ask({
          title: tk(amt) + ' ফেরত দেবে?', body: r.method + ' ' + r.number + ' নম্বরে পাঠাতে হবে। ' + (amt === r.paid ? 'স্টুডেন্টের কোর্স অ্যাক্সেস বন্ধ হবে।' : 'আংশিক ফেরত — অ্যাক্সেস বন্ধ হবে।'),
          needReason: true, reasons: elig ? ['পলিসি অনুযায়ী', 'কারিগরি সমস্যা', 'ডাবল পেমেন্ট'] : ['বিশেষ বিবেচনা', 'কারিগরি সমস্যা', 'আংশিক — দেখা অংশ বাদে'], ok: 'Approve refund',
          run: (why) => {
            c.upd('refunds', r.id, { status: 'refunded', amount: amt, reason: why }); c.setState({ form: null });
            c.log('refunds', 'Refunded', r.name + ' · ' + tk(amt), why);
            // Staff still send the money manually, so the toast says where.
            c.flash(tk(amt) + ' — ' + r.method + ' ' + r.number + ' নম্বরে পাঠাও');
          } }), 'primary', f.amount === '' || !!aErr),
        c.A('Offer batch transfer', () => { c.log('refunds', 'Offered batch transfer', r.name); c.flash('ব্যাচ বদলের প্রস্তাব SMS-এ পাঠানো হয়েছে'); }),
        c.A('Deny', () => c.ask({ title: r.name + '-এর রিফান্ড বাতিল করবে?', body: 'স্টুডেন্ট কারণসহ SMS পাবে। কোর্স অ্যাক্সেস চালু থাকবে।', needReason: true, danger: true,
          reasons: ['পলিসির বাইরে', 'কোর্সের বেশিরভাগ দেখা', 'কারিগরি সমস্যা ঠিক করা হয়েছে'], ok: 'Deny refund',
          run: (why) => { c.upd('refunds', r.id, { status: 'denied', reason: why }); c.log('refunds', 'Denied refund', r.name + ' · ' + tk(r.paid), why); c.flash('বাতিল করা হয়েছে'); } }), 'danger'),
      ] : [],
    };
  }
  return v;
}
