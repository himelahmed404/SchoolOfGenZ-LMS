'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NoteBlocks } from '@/components/NoteBlocks';
import { Penguin } from '@/components/Penguin';
import { useConsole } from './Console';
import { decideContent, decidePayments } from '@/lib/actions';
import { contentReasons, courses, rejectReasons, teacher } from '@/lib/data';
import { ago, pad2, taka } from '@/lib/format';
import { allQueue, blockHasContent, item, itemKeys, keyCourse, rowFlags } from '@/lib/selectors';
import type { AppState } from '@/lib/state';
import { useStore } from '@/lib/store';
import type { LessonRevision, PayStatus, Payment } from '@/lib/types';

export type QueueMode = 'pay' | 'content';
type Mode = QueueMode;
type CFilter = 'review' | 'published' | 'returned';

/** Course and position of a lesson revision, for list rows and the preview. */
function where(k: string, x: LessonRevision) {
  const c = courses[keyCourse(k)];
  return { course: c.titleEn, tag: c.code, loc: 'Chapter ' + pad2(x.ch + 1) + ' · ' + (x.isNew ? 'New lesson' : 'Lesson ' + pad2((x.li as number) + 1)) };
}

/** Payment approvals and content review, shown beside the console sidebar. */
export function AdminQueues({ mode }: { mode: Mode }) {
  const { s, set, n, ready } = useStore();
  const { logic, vals } = useConsole();
  const router = useRouter();
  // Mirrors the role's permission for the UI; the server must enforce it.
  const canPay = logic.perm('payments') === 'edit', canContent = logic.perm('content') === 'edit';
  const setMode = (m: Mode) => router.push(m === 'pay' ? '/admin/payments' : '/admin/content');

  // payments
  const [qFilter, setQFilter] = useState<PayStatus>('pending');
  const [sel, setSel] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // content
  const [cFilter, setCFilter] = useState<CFilter>('review');
  const [cSel, setCSel] = useState(0);
  const [cRetFor, setCRetFor] = useState<string | null>(null);
  const [cReason, setCReason] = useState<string | null>(null);
  const [cNote, setCNote] = useState('');

  /* ---------- payments ---------- */
  const queue = allQueue(s);
  const qCounts: Record<PayStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  queue.forEach((r) => { qCounts[r.status]++; });
  const needle = q.trim().toLowerCase();
  const rows = queue.filter((r) => r.status === qFilter)
    .filter((r) => !needle || (r.name + ' ' + r.phone + ' ' + r.trx + ' ' + r.course).toLowerCase().includes(needle));
  const selIdx = Math.min(sel, Math.max(0, rows.length - 1));
  const selRow: Payment | null = rows[selIdx] || null;
  const checkedIds = Object.keys(checked).filter((id) => checked[id]);

  const decide = (ids: string[], status: PayStatus, reason?: string) => {
    if (!ids.length || !canPay) return;
    set((x) => decidePayments(x, ids, status, reason));
    queue.filter((r) => ids.includes(r.id)).forEach((r) =>
      logic.log('payments', status === 'approved' ? 'Approved payment' : 'Rejected payment', r.name + ' · ' + r.trx, reason));
    const c = { ...checked }; ids.forEach((id) => delete c[id]); setChecked(c);
    setRejectFor(null); setSel(0);
  };
  const toggleCheck = (id: string) => { const c = { ...checked }; if (c[id]) delete c[id]; else c[id] = true; setChecked(c); };

  /* ---------- content ---------- */
  const cCount: Record<CFilter, number> = { review: 0, published: 0, returned: 0 };
  const keys = itemKeys(s);
  keys.forEach((k) => {
    const st = item(s, k).status;
    if (st === 'review' || st === 'returned') cCount[st]++;
    else if (st === 'published' && s.aDecided[k] === 'published') cCount.published++;
  });
  const cVis = keys.filter((k) => {
    const st = item(s, k).status;
    return cFilter === 'published' ? st === 'published' && s.aDecided[k] === 'published' : st === cFilter;
  });
  const ci = Math.min(cSel, Math.max(0, cVis.length - 1));
  const ck = cVis[ci] || null;
  const cit = ck ? item(s, ck) : null;
  const canRet = !!cReason || !!cNote.trim();
  const retOpen = !!ck && cRetFor === ck;

  const cDecide = (k: string | null, status: 'published' | 'returned', reason?: string) => {
    if (!k || !canContent) return;
    set((x: AppState) => decideContent(x, k, status, reason));
    const x = item(s, k), w = where(k, x);
    logic.log('content', status === 'published' ? 'Published lesson' : 'Returned lesson', w.tag + ' · ' + w.loc + ' · ' + (x.title || ''), reason);
    setCRetFor(null); setCReason(null); setCNote(''); setCSel(0);
  };
  const doReturn = () => { if (canRet) cDecide(ck, 'returned', [cReason, cNote.trim()].filter(Boolean).join(' — ')); };

  /* ---------- keyboard ---------- */
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (mode === 'content') {
      if (!cVis.length) return;
      const rev = !!cit && cit.status === 'review';
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCSel(Math.min(cVis.length - 1, ci + 1)); setCRetFor(null); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setCSel(Math.max(0, ci - 1)); setCRetFor(null); }
      else if ((e.key === 'a' || e.key === 'A') && rev && canContent) { e.preventDefault(); cDecide(ck, 'published'); }
      else if ((e.key === 'r' || e.key === 'R') && rev && canContent) { e.preventDefault(); setCRetFor(ck); }
      else if (e.key === 'Escape') { setCRetFor(null); setCReason(null); }
      return;
    }
    if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
    if (!rows.length || !selRow) return;
    const pending = selRow.status === 'pending';
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setSel(Math.min(rows.length - 1, selIdx + 1)); setRejectFor(null); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setSel(Math.max(0, selIdx - 1)); setRejectFor(null); }
    else if ((e.key === 'a' || e.key === 'A') && pending && canPay) { e.preventDefault(); decide([selRow.id], 'approved'); }
    else if ((e.key === 'r' || e.key === 'R') && pending && canPay) { e.preventDefault(); setRejectFor(selRow.id); }
    else if (e.key === 'Escape') setRejectFor(null);
    else if (e.key === ' ') { e.preventDefault(); toggleCheck(selRow.id); setSel(Math.min(rows.length - 1, selIdx + 1)); }
  };
  const keyRef = useRef(onKey);
  useEffect(() => { keyRef.current = onKey; });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (!ready) return null;

  const tabStyle = (on: boolean): React.CSSProperties => ({ height: 44, border: 'none', background: 'none', padding: 0, fontSize: 13, fontWeight: on ? 600 : 400, color: on ? 'var(--ink)' : 'var(--ink-3)', borderBottom: '2px solid ' + (on ? 'var(--brand)' : 'transparent'), whiteSpace: 'nowrap' });

  return (
    <div style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, height: 56, padding: '0 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="logo" style={{ width: 22, height: 22 }} />
        <nav style={{ display: 'flex', alignItems: 'stretch', gap: 20, height: 56 }} aria-label="Admin">
          {([['Payments', 'pay', qCounts.pending], ['Content', 'content', cCount.review]] as [string, Mode, number][]).map(([label, id, count]) => {
            const on = mode === id;
            return (
              <button key={id} aria-current={on ? 'page' : undefined} onClick={() => { setMode(id); setCRetFor(null); setRejectFor(null); }}
                style={{ height: 56, border: 'none', background: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: on ? 600 : 400, color: on ? 'var(--ink)' : 'var(--ink-3)', borderBottom: '2px solid ' + (on ? 'var(--brand)' : 'transparent') }}>
                {label}
                <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 10, background: count ? 'var(--warn-soft)' : 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n(count)}</span>
              </button>
            );
          })}
        </nav>
        <div className="t13 ink3 nowrap">
          {mode === 'pay' ? 'অপেক্ষমাণ ' + n(qCounts.pending) + ' · আজ অনুমোদিত ' + n(qCounts.approved) : 'অপেক্ষায় ' + n(cCount.review) + ' · আজ প্রকাশিত ' + n(cCount.published)}
        </div>
        <div style={{ flex: 1 }} />
        {mode === 'pay' ? (
          <input ref={searchRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="নাম, নম্বর বা TrxID খোঁজো  /" aria-label="খোঁজো"
            style={{ width: 260, height: 34, padding: '0 12px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 13 }} />
        ) : null}
        <div className="row" style={{ gap: 8, paddingLeft: 16, borderLeft: '1px solid var(--line)' }}>
          <div className="tile mono" style={{ width: 28, height: 28, borderRadius: 9999, background: 'var(--surface-sunk)', border: '1px solid var(--line)', fontSize: 8, color: 'var(--ink-2)' }}>adm</div>
          <div className="t13 nowrap">{vals.meName.split(' ')[0]}</div>
        </div>
      </header>

      {mode === 'pay' ? (
        <>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, height: 44, padding: '0 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }} role="tablist">
            {([['Pending', 'pending'], ['Approved', 'approved'], ['Rejected', 'rejected']] as [string, PayStatus][]).map(([label, id]) => (
              <button key={id} role="tab" aria-selected={qFilter === id} style={tabStyle(qFilter === id)} onClick={() => { setQFilter(id); setSel(0); setRejectFor(null); }}>{label} {n(qCounts[id])}</button>
            ))}
            {checkedIds.length ? (
              <div className="row ml-auto" style={{ gap: 8 }}>
                <button className="btn-quiet t13 w500" style={{ height: 32, padding: '0 12px' }} onClick={() => setChecked({})}>Clear</button>
                {canPay ? <button onClick={() => decide(checkedIds, 'approved')} style={{ height: 32, padding: '0 14px', border: 'none', borderRadius: 10, background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 13, fontWeight: 500 }}>Approve selected ({n(checkedIds.length)})</button> : null}
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }} role="grid" aria-label="পেমেন্ট">
              <div className="t12 ink3 pay-grid" style={{ flexShrink: 0, height: 32, padding: '0 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 2 }}>
                <span /><span>Student</span><span>Course</span><span>Method</span><span>TrxID</span><span>Submitted</span>
              </div>
              {rows.map((r, i) => {
                const here = i === selIdx, flagged = rowFlags(r).length > 0, on = !!checked[r.id];
                return (
                  <div key={r.id} role="row" aria-selected={here} onClick={() => { setSel(i); setRejectFor(null); }} className="pay-grid"
                    style={{ width: '100%', height: 44, padding: '0 16px', borderLeft: '2px solid ' + (here ? 'var(--brand)' : flagged ? 'var(--margin)' : 'transparent'), borderBottom: '1px solid var(--line)', background: here ? 'var(--brand-soft)' : 'var(--surface)', cursor: 'pointer' }}>
                    <button role="checkbox" aria-checked={on} aria-label={r.name + ' বাছো'} onClick={(e) => { e.stopPropagation(); toggleCheck(r.id); }}
                      style={{ width: 16, height: 16, padding: 0, border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 5, background: on ? 'var(--brand)' : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--on-brand)' }}>{on ? '✓' : ''}</button>
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                      <span className="t13 ellipsis" style={{ fontWeight: here ? 600 : 400 }}>{r.name}</span>
                      <span className="mono ink3" style={{ fontSize: 11 }}>{r.phone}</span>
                    </span>
                    <span className="t13 ink2 ellipsis">{r.course}</span>
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                      <span className="t13 ink2">{r.method}</span>
                      <span className="mono" style={{ fontSize: 11, color: r.amount < r.due ? 'var(--margin)' : 'var(--ink-2)' }}>{taka(r.amount)}</span>
                    </span>
                    <span className="mono t12 ink2 ellipsis">{r.trx}</span>
                    <span className="t12 ink3 nowrap">{ago(r.agoMin)}</span>
                  </div>
                );
              })}
              {rows.length === 0 ? (
                <div className="empty" style={{ padding: '72px 24px' }}>
                  <Penguin size={80} />
                  <div className="t17 w600">এই তালিকা খালি</div>
                  <div className="t15 ink2" style={{ maxWidth: '36ch' }}>সব দেখা হয়ে গেছে। নতুন জমা পড়লে এখানেই আসবে।</div>
                </div>
              ) : null}
            </div>

            {selRow ? (
              <aside style={{ width: 380, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'var(--surface)', overflow: 'auto', padding: 20 }}>
                <div className="t12 w500" style={{ marginBottom: 8, color: selRow.status === 'approved' ? 'var(--brand)' : selRow.status === 'rejected' ? 'var(--margin)' : 'var(--warn)' }}>
                  {selRow.status === 'approved' ? '✓ Approved' : selRow.status === 'rejected' ? '✗ Rejected' + (selRow.rejectReason ? ' · ' + selRow.rejectReason : '') : '● Pending'}
                </div>
                <div style={{ fontSize: 20, lineHeight: 1.45, fontWeight: 600 }}>{selRow.name}</div>
                <div className="mono t13 ink3" style={{ marginBottom: 24 }}>{selRow.phone}</div>

                {rowFlags(selRow).length ? (
                  <div className="alert" style={{ marginBottom: 24, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.7 }}>
                    {rowFlags(selRow).map((f) => <div key={f}>{f}</div>)}
                  </div>
                ) : null}

                <div className="t12 w500 ink3" style={{ marginBottom: 8 }}>Course</div>
                <dl className="kv">
                  <KV k="Name" v={selRow.course} />
                  <KV k="Batch" v={selRow.batch} mono />
                </dl>
                <div className="t12 w500 ink3" style={{ marginBottom: 8 }}>Payment</div>
                <dl className="kv">
                  <KV k="Method" v={selRow.method} />
                  <KV k="এসেছে" v={taka(selRow.amount)} mono strong color={selRow.amount < selRow.due ? 'var(--margin)' : undefined} />
                  <KV k="আসার কথা" v={taka(selRow.due)} mono color="var(--ink-2)" />
                  <KV k="TrxID" v={selRow.trx} mono strong />
                  <KV k="পাঠিয়েছে" v={selRow.sender} mono color={selRow.sender !== selRow.phone ? 'var(--margin)' : undefined} />
                  <KV k="Submitted" v={ago(selRow.agoMin)} color="var(--ink-2)" />
                </dl>

                {selRow.status === 'pending' && !canPay ? <div className="t12 ink3">এই অংশে তোমার শুধু দেখার অনুমতি আছে — অনুমোদন দিতে পারবে না।</div> : null}
                {selRow.status === 'pending' && canPay ? (
                  <div>
                    {rejectFor === selRow.id ? (
                      <div>
                        <div className="t13 w500 ink2" style={{ marginBottom: 10 }}>বাতিলের কারণ</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {rejectReasons.map((t) => (
                            <button key={t} className="chip" style={{ borderColor: 'var(--margin)', color: 'var(--margin)' }} onClick={() => decide([selRow.id], 'rejected', t)}>{t}</button>
                          ))}
                        </div>
                        <button className="btn-quiet t13 w500" style={{ height: 36, padding: '0 12px' }} onClick={() => setRejectFor(null)}>থাক</button>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button onClick={() => decide([selRow.id], 'approved')} style={{ flex: 1, height: 44, border: 'none', borderRadius: 10, background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 15, fontWeight: 500 }}>Approve</button>
                      <button onClick={() => setRejectFor(selRow.id)} style={{ height: 44, padding: '0 16px', border: '1px solid var(--margin)', borderRadius: 10, background: 'none', color: 'var(--margin)', fontSize: 15, fontWeight: 500 }}>Reject</button>
                    </div>
                  </div>
                ) : null}
                {selRow.live ? <div className="note-dashed" style={{ marginTop: 20, borderRadius: 10 }}>এই সারিটা তোমার নিজের জমা দেওয়া। অনুমোদন করলে student ভিউতে গিয়ে দেখো।</div> : null}
              </aside>
            ) : null}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, height: 44, padding: '0 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }} role="tablist">
            {([['Pending', 'review'], ['Published', 'published'], ['Returned', 'returned']] as [string, CFilter][]).map(([label, id]) => (
              <button key={id} role="tab" aria-selected={cFilter === id} style={tabStyle(cFilter === id)} onClick={() => { setCFilter(id); setCSel(0); setCRetFor(null); }}>{label} {n(cCount[id])}</button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <div style={{ width: 400, flexShrink: 0, borderRight: '1px solid var(--line)', background: 'var(--surface)', overflow: 'auto' }}>
              {cVis.map((k, i) => {
                const x = item(s, k), w = where(k, x), here = i === ci;
                const kindColor = x.isNew ? 'var(--brand)' : 'var(--ink-2)';
                return (
                  <button key={k} onClick={() => { setCSel(i); setCRetFor(null); }} aria-current={here ? 'true' : undefined}
                    style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '12px 16px 12px 14px', border: 'none', borderLeft: '2px solid ' + (here ? 'var(--brand)' : 'transparent'), borderBottom: '1px solid var(--line)', background: here ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left', whiteSpace: 'normal' }}>
                    <span className="row t12 ink3" style={{ gap: 8, width: '100%' }}><span>{w.tag} · {w.loc}</span><span className="ml-auto nowrap">{ago(x.subAgoMin ?? 0)}</span></span>
                    <span className="t15" style={{ lineHeight: 1.5, fontWeight: here ? 600 : 500 }}>{x.title || 'নাম দেওয়া হয়নি'}</span>
                    <span className="row t12 ink2" style={{ gap: 8 }}><span>{x.by || teacher.name}</span><span className="tag" style={{ color: kindColor }}>{x.isNew ? 'New Lesson' : 'Update'}</span></span>
                  </button>
                );
              })}
              {cVis.length === 0 ? (
                <div className="empty" style={{ padding: '64px 24px', gap: 12 }}>
                  <Penguin size={64} />
                  <div className="t15 w600">{cFilter === 'review' ? 'জমা পড়া সব লেসন দেখা হয়ে গেছে' : cFilter === 'published' ? 'আজ এখনো কিছু প্রকাশ করোনি' : 'কিছু ফেরত পাঠানো হয়নি'}</div>
                  <div className="t13 ink2" style={{ maxWidth: '30ch' }}>শিক্ষক লেসন জমা দিলে এখানে আসবে।</div>
                </div>
              ) : null}
            </div>

            {cit && ck ? (
              <ContentPreview k={ck} it={cit} loc={where(ck, cit)}
                actions={cit.status === 'review' && canContent ? (
                  <div style={{ flexShrink: 0, padding: '14px 32px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {retOpen ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="t13 w500 ink2">কেন ফেরত — শিক্ষক ঠিক এটাই দেখবেন</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {contentReasons.map((t) => {
                              const on = cReason === t;
                              return (
                                <button key={t} className="chip" aria-pressed={on} onClick={() => setCReason(on ? null : t)}
                                  style={{ borderColor: on ? 'var(--margin)' : 'var(--line-strong)', background: on ? 'var(--margin-soft)' : 'var(--surface)', color: on ? 'var(--margin)' : 'var(--ink-2)' }}>{t}</button>
                              );
                            })}
                          </div>
                          <textarea value={cNote} onChange={(e) => setCNote(e.target.value)} aria-label="কোথায় ঠিক করতে হবে"
                            placeholder="কোথায় ঠিক করতে হবে — যেমন ৪:১০ থেকে ৬:০০, বা ২ নম্বর প্রশ্ন"
                            style={{ width: '100%', minHeight: 64, padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.7, resize: 'none' }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button className="btn btn-quiet" style={{ height: 44 }} onClick={() => { setCRetFor(null); setCReason(null); setCNote(''); }}>থাক</button>
                            <button disabled={!canRet} onClick={doReturn}
                              style={{ height: 44, padding: '0 18px', border: '1px solid ' + (canRet ? 'var(--margin)' : 'var(--line)'), borderRadius: 10, background: canRet ? 'var(--margin-soft)' : 'var(--surface)', color: canRet ? 'var(--margin)' : 'var(--ink-3)', fontSize: 15, fontWeight: 500 }}>Send back</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => cDecide(ck, 'published')} style={{ flex: 1, height: 44, border: 'none', borderRadius: 10, background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 15, fontWeight: 500 }}>Publish</button>
                          <button onClick={() => setCRetFor(ck)} style={{ height: 44, padding: '0 16px', border: '1px solid var(--margin)', borderRadius: 10, background: 'none', color: 'var(--margin)', fontSize: 15, fontWeight: 500 }}>Send back</button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null} />
            ) : null}
          </div>
        </div>
      )}

      <footer className="mono ink3" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', height: 36, padding: '0 20px', borderTop: '1px solid var(--line)', background: 'var(--surface)', fontSize: 11 }}>
        {(mode === 'pay' ? ['↑↓ row', 'space select', 'A approve', 'R reject', '/ search'] : ['↑↓ row', 'A publish', 'R send back', 'Esc cancel']).map((h) => <span key={h}>{h}</span>)}
      </footer>
    </div>
  );
}

function KV({ k, v, mono, strong, color }: { k: string; v: string; mono?: boolean; strong?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <dt className="t13 ink3" style={{ minWidth: 88 }}>{k}</dt>
      <dd className={'t13' + (mono ? ' mono' : '')} style={{ margin: 0, fontWeight: strong ? 500 : 400, color: color || 'var(--ink)' }}>{v}</dd>
    </div>
  );
}

function ContentPreview({ k, it, loc, actions }: { k: string; it: LessonRevision; loc: { course: string; loc: string }; actions: React.ReactNode }) {
  const { n } = useStore();
  const nb = it.blocks.filter(blockHasContent).length, vq = it.quiz.length, vOk = it.video.state === 'done';
  const status = it.status === 'published' ? ['✓ Published', 'var(--brand)'] : it.status === 'returned' ? ['✗ Returned', 'var(--margin)'] : ['● Pending review', 'var(--warn)'];
  const checks: [string, boolean][] = [
    ['Video · ' + (vOk ? n(it.video.dur || '') : 'নেই'), vOk],
    ['Notes · ' + n(nb) + ' blocks', nb > 0],
    ['Quiz · ' + (vq ? n(vq) + ' প্রশ্ন' : 'নেই'), vq > 0],
  ];

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div key={k} style={{ maxWidth: 720, margin: '0 auto', padding: '28px 32px 48px' }}>
          <div className="t12 w500" style={{ color: status[1], marginBottom: 8 }}>{status[0]}</div>
          <div className="t12 ink3">{loc.course} · {loc.loc}</div>
          <h1 style={{ margin: '2px 0 4px', fontSize: 24, lineHeight: 1.4, fontWeight: 600 }}>{it.title || 'নাম দেওয়া হয়নি'}</h1>
          <div className="t13 ink2" style={{ marginBottom: 20 }}>{(it.by || teacher.name) + ' · submitted ' + ago(it.subAgoMin ?? 0)}</div>
          {!it.isNew && it.status === 'review' ? (
            <div className="note-dashed t13 ink2" style={{ marginBottom: 20, fontSize: 13, borderRadius: 10 }}>আগে প্রকাশিত লেসনের আপডেট। প্রকাশ করলে পুরোনোটা বদলে যাবে — শিক্ষার্থীদের অগ্রগতি আর কুইজের ফল থেকে যাবে।</div>
          ) : null}
          {it.status === 'returned' ? (
            <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid var(--margin)', borderRadius: 10, background: 'var(--margin-soft)' }}>
              <div className="t12 w500" style={{ color: 'var(--margin)' }}>ফেরতের কারণ</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{it.reason || 'কারণ লেখা নেই'}</div>
            </div>
          ) : null}
          {it.live && it.status === 'review' ? <div className="note-dashed" style={{ marginBottom: 20, borderRadius: 10 }}>এটা teacher ভিউ থেকে এইমাত্র জমা দেওয়া। সিদ্ধান্ত দিলে teacher ভিউয়ের কনটেন্ট পাতায় গিয়ে দেখো।</div> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', padding: '12px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
            {checks.map(([label, ok]) => (
              <span key={label} className="t13 ink2" style={{ display: 'flex', gap: 6 }}><span style={{ color: ok ? 'var(--brand)' : 'var(--ink-3)' }}>{ok ? '✓' : '–'}</span><span>{label}</span></span>
            ))}
          </div>
          <div style={{ height: 240, marginBottom: 32, padding: 12, background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <span className="mono ink2" style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 6px' }}>{vOk ? it.video.name : 'ভিডিও নেই'}</span>
            {vOk ? <span className="mono ink2" style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 5, padding: '1px 6px' }}>▶ {n(it.video.dur || '')}</span> : null}
          </div>
          <div className="t12 w500 ink3" style={{ marginBottom: 10 }}>Notes — শিক্ষার্থী যেভাবে দেখবে</div>
          <div style={{ marginBottom: 32, padding: '24px 28px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}><NoteBlocks blocks={it.blocks} /></div>
          {it.quiz.length ? (
            <div>
              <div className="t12 w500 ink3" style={{ marginBottom: 10 }}>Quiz — সঠিক উত্তর চিহ্ন দেওয়া</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {it.quiz.map((q, qi) => (
                  <div key={qi} style={{ padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <span className="mono t12 ink3" style={{ lineHeight: '24px' }}>{n(pad2(qi + 1))}</span>
                      <span className="t15 w500">{q.stem}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                      {q.o.map((o, oi) => {
                        const r = q.a === oi;
                        return (
                          <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '6px 12px', border: '1px solid ' + (r ? 'var(--brand)' : 'var(--line)'), borderRadius: 10, background: r ? 'var(--brand-soft)' : 'var(--surface)', fontSize: 14, fontWeight: r ? 600 : 400 }}>
                            <span style={{ width: 14, flexShrink: 0, color: 'var(--brand)' }}>{r ? '✓' : ''}</span><span>{o}</span>
                          </div>
                        );
                      })}
                    </div>
                    {q.why ? <div className="t13 ink2" style={{ marginTop: 10, lineHeight: 1.7 }}>ব্যাখ্যা · {q.why}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {actions}
    </div>
  );
}
