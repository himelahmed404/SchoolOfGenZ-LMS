import type { AdminConsole, Rec } from '../console';
import type { Block, Refund, SectionView } from '../types';

const present = <T,>(x: T | null | false | undefined): x is T => !!x;

/**
 * Refunds: paid within N days AND watched under M% (Settings) is "Eligible" at the full amount;
 * anything else the admin decides, with an editable full or partial amount.
 */
export function refunds(c: AdminConsole): SectionView {
  const S = c.S, nf = c.nf, tk = c.tk, st = S.settings;
  const pol = (r: Refund) => (r.status === 'open' ? c.refundVerdict(r) : r.status);
  const rows = S.refunds.filter((r) => (S.filter === 'all' || r.status === S.filter) && c.match(r.name + r.batch + r.number));
  const v: SectionView = {
    title: 'Refunds', sub: 'Full refund within ' + c.pl(Number(st.refundDays), 'day') + ' and under ' + nf(st.refundWatch) + '% watched. You decide the rest.', head: [],
    list: c.mkList(
      ([['open', 'Open'], ['refunded', 'Refunded'], ['denied', 'Denied'], ['all', 'All']] as [string, string][]).map(([k, l]) => [k, l, S.refunds.filter((r) => k === 'all' || r.status === k).length]),
      'Search name, batch or number',
      ['Student', 'Batch', 'Paid', 'Paid ago', 'Watched', 'Policy'], 'minmax(0,1.5fr) minmax(0,1fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.9fr)',
      rows.map((r) => ({ id: r.id, cells: [
        c.T(r.name, r.method + ' · ' + r.number, { bold: true }), c.T(r.batch, '', { mono: true }), c.T(tk(r.paid)),
        c.T(c.pl(r.ago, 'day'), '', { fg: r.ago > Number(st.refundDays) ? 'var(--warn)' : 'var(--ink)' }),
        c.T(nf(r.watched) + '%', '', { fg: r.watched >= Number(st.refundWatch) ? 'var(--warn)' : 'var(--ink)' }),
        c.B(pol(r)),
      ] })),
      'No refund requests.'),
  };
  const r = S.refunds.find((x) => x.id === S.sel);
  if (r) {
    const okDays = r.ago <= Number(st.refundDays), okWatch = r.watched < Number(st.refundWatch), elig = okDays && okWatch, open = r.status === 'open';
    const f: Rec = S.form && S.form._id === r.id ? S.form : { _id: r.id, amount: elig ? r.paid : '' };
    const amt = +f.amount, aErr = f.amount !== '' && (amt <= 0 || amt > r.paid) ? 'Must be more than ৳0 and at most ' + tk(r.paid) : '';
    const mark = (ok: boolean) => (ok ? '✓ ' : '✕ ');
    v.detail = {
      title: r.name, sub: r.batch + ' · ' + r.method + ' ' + r.number, badge: c.B(pol(r)), closable: true,
      blocks: [
        c.blk({ title: 'Request', note: '“' + r.why + '”' }),
        c.blk({ title: 'Policy check', kv: [
          c.kv(mark(okDays) + 'Within ' + c.pl(Number(st.refundDays), 'day'), 'Paid ' + c.pl(r.ago, 'day') + ' ago', { fg: okDays ? 'var(--brand)' : 'var(--margin)', bold: true }),
          c.kv(mark(okWatch) + 'Under ' + nf(st.refundWatch) + '% watched', 'Watched ' + nf(r.watched) + '%', { fg: okWatch ? 'var(--brand)' : 'var(--margin)', bold: true }),
          c.kv('Paid', tk(r.paid)),
        ] }),
        open ? c.blk({ note: elig ? 'Within policy: the student gets a full refund.' : 'Outside policy. You decide: full, partial, a batch transfer, or deny.', tone: elig ? 'brand' : 'warn' }) : null,
        open ? c.blk({ fields: [c.inp('Refund amount (৳)', f.amount, (x) => c.setState({ form: { ...f, amount: x === '' ? '' : +x } }),
          { type: 'number', dis: elig, err: aErr, hint: elig ? 'Policy gives the full amount; it cannot be changed.' : 'Enter a lower amount for a partial refund.' })] }) : null,
        !open ? c.blk({ kv: [c.kv(r.status === 'refunded' ? 'Refunded' : 'Denied', r.status === 'refunded' ? tk(r.amount || 0) : '—', { bold: true }), c.kv('Reason', r.reason || '—')] }) : null,
      ].filter(present) as Block[],
      actions: open ? [
        c.A('Approve ' + (f.amount !== '' ? tk(amt) : 'refund'), () => c.ask({
          title: 'Refund ' + tk(amt) + '?', body: 'Send it to ' + r.method + ' ' + r.number + '. ' + (amt === r.paid ? 'The student loses access to the course.' : 'This is a partial refund; access still ends.'),
          needReason: true, reasons: elig ? ['Within policy', 'Technical problem', 'Double payment'] : ['Special consideration', 'Technical problem', 'Partial — minus the part watched'], ok: 'Approve refund',
          run: (why) => {
            c.upd('refunds', r.id, { status: 'refunded', amount: amt, reason: why }); c.setState({ form: null });
            c.log('refunds', 'Refunded', r.name + ' · ' + tk(amt), why);
            // Staff still send the money manually, so the toast says where.
            c.flash('Send ' + tk(amt) + ' to ' + r.method + ' ' + r.number);
          } }), 'primary', f.amount === '' || !!aErr),
        c.A('Offer batch transfer', () => { c.log('refunds', 'Offered batch transfer', r.name); c.flash('Batch transfer offered by SMS'); }),
        c.A('Deny', () => c.ask({ title: 'Deny the refund for ' + r.name + '?', body: 'The student gets an SMS with the reason. Course access stays on.', needReason: true, danger: true,
          reasons: ['Outside policy', 'Most of the course watched', 'Technical problem fixed'], ok: 'Deny refund',
          run: (why) => { c.upd('refunds', r.id, { status: 'denied', reason: why }); c.log('refunds', 'Denied refund', r.name + ' · ' + tk(r.paid), why); c.flash('Refund denied'); } }), 'danger'),
      ] : [],
    };
  }
  return v;
}
