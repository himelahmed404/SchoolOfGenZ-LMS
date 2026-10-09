'use client';

import { useEffect, useRef, useState } from 'react';
import { NoteBlocks } from '@/components/NoteBlocks';
import { Penguin } from '@/components/Penguin';
import { Splitter, useConsole } from './Console';
import { decideContent, decidePayments } from '@/lib/actions';
import type { Cell } from '@/lib/admin';
import { contentReasons, courses, MIN_TEST_QUESTIONS, rejectReasons, teacher } from '@/lib/data';
import { ago, pad2, plural, taka } from '@/lib/format';
import { allQueue, blockHasContent, item, itemKeys, keyCourse, reasonText, returnReason, revisionRef, rowFlags } from '@/lib/selectors';
import type { AppState } from '@/lib/state';
import { useStore } from '@/lib/store';
import type { LessonRevision, PayStatus, Payment } from '@/lib/types';

export type QueueMode = 'pay' | 'content';
type CFilter = 'review' | 'published' | 'returned';

/** Payment approvals and content review. They sit in the console frame like every other section. */
export function AdminQueues({ mode }: { mode: QueueMode }) {
  const { ready } = useStore();
  if (!ready) return null;
  return mode === 'pay' ? <PaymentQueue /> : <ContentQueue />;
}

/** Runs the latest `onKey` for key presses that are not typing or pressing a focused button. */
function useKeys(onKey: (e: KeyboardEvent) => void) {
  const ref = useRef(onKey);
  useEffect(() => { ref.current = onKey; });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null, tag = el?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') { if (e.key === 'Escape') el?.blur(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      ref.current(e);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

function Badge({ c }: { c: Cell }) {
  return <span className="adm-badge" style={{ background: c.bg, color: c.fg }}>{c.t}</span>;
}

function Tabs<T extends string>({ tabs, cur, pick }: { tabs: [string, T, number][]; cur: T; pick: (id: T) => void }) {
  return (
    <div className="adm-tabs" role="tablist">
      {tabs.map(([label, id, n]) => (
        <button key={id} className="adm-tab" role="tab" aria-selected={cur === id} onClick={() => pick(id)}>{label}<span className="adm-n">{n}</span></button>
      ))}
    </div>
  );
}

function Keys({ hints }: { hints: string[] }) {
  return <span className="adm-keys" aria-label="Keyboard shortcuts">{hints.map((h) => <span key={h}>{h}</span>)}</span>;
}

/* ---------- payments ---------- */

const PAY_GRID = 'minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,0.9fr) minmax(0,1fr) minmax(0,0.8fr)';
const PAY_GRID_WIDE = PAY_GRID + ' minmax(0,0.9fr) minmax(0,1fr)';

function PaymentQueue() {
  const { s, set } = useStore();
  const { logic, st } = useConsole();
  // Mirrors the role's permission for the UI; the server must enforce it.
  const canPay = logic.perm('payments') === 'edit';

  const [filter, setFilter] = useState<PayStatus>('pending');
  const [sel, setSel] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [q, setQ] = useState('');
  // On a narrow screen the details slide over the list, so they open only when a row is picked.
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const queue = allQueue(s);
  const counts: Record<PayStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  const sums: Record<PayStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  queue.forEach((r) => { counts[r.status]++; sums[r.status] += r.amount; });
  const needle = q.trim().toLowerCase();
  const rows = queue.filter((r) => r.status === filter)
    .filter((r) => !needle || (r.name + ' ' + r.phone + ' ' + r.trx + ' ' + r.course).toLowerCase().includes(needle));
  const selIdx = Math.min(sel, Math.max(0, rows.length - 1));
  const selRow: Payment | null = rows[selIdx] || null;
  const checkedIds = Object.keys(checked).filter((id) => checked[id]);

  const pick = (i: number) => { setSel(i); setRejectFor(null); };
  const decide = (ids: string[], status: PayStatus, reason?: string) => {
    if (!ids.length || !canPay) return;
    set((x) => decidePayments(x, ids, status, reason));
    queue.filter((r) => ids.includes(r.id)).forEach((r) =>
      logic.log('payments', status === 'approved' ? 'Approved payment' : 'Rejected payment', r.name + ' · ' + r.trx, reason ? reasonText(rejectReasons, reason, 'en') : ''));
    const c = { ...checked }; ids.forEach((id) => delete c[id]); setChecked(c);
    setRejectFor(null); setSel(0);
  };
  const toggleCheck = (id: string) => { const c = { ...checked }; if (c[id]) delete c[id]; else c[id] = true; setChecked(c); };

  useKeys((e) => {
    if (st.srOpen || st.confirm) return;
    if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
    if (!selRow) return;
    const pending = selRow.status === 'pending';
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); pick(Math.min(rows.length - 1, selIdx + 1)); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); pick(Math.max(0, selIdx - 1)); }
    else if ((e.key === 'a' || e.key === 'A') && pending && canPay) { e.preventDefault(); decide([selRow.id], 'approved'); }
    else if ((e.key === 'r' || e.key === 'R') && pending && canPay) { e.preventDefault(); setRejectFor(selRow.id); setOpen(true); }
    else if (e.key === 'Escape') { setRejectFor(null); setOpen(false); }
    else if (e.key === ' ') { e.preventDefault(); toggleCheck(selRow.id); pick(Math.min(rows.length - 1, selIdx + 1)); }
  });

  const flags = selRow ? rowFlags(selRow) : [];
  const badge = (r: Payment) => (r.status === 'approved' ? logic.B('published', 'Approved') : r.status === 'rejected' ? logic.B('denied', 'Rejected') : logic.B('pending'));

  return (
    <>
      <section className="adm-list" style={{ ['--g' as string]: PAY_GRID, ['--gw' as string]: PAY_GRID_WIDE }}>
        <div className="adm-toolbar">
          <Tabs tabs={[['Pending', 'pending', counts.pending], ['Approved', 'approved', counts.approved], ['Rejected', 'rejected', counts.rejected]]} cur={filter}
            pick={(id) => { setFilter(id); setSel(0); setRejectFor(null); }} />
          <div className="adm-grow" />
          {checkedIds.length ? (
            <>
              <button className="adm-btn adm-btn-sm" onClick={() => setChecked({})}>Clear</button>
              {canPay ? <button className="adm-btn adm-btn-sm" style={{ borderColor: 'var(--brand)', background: 'var(--brand)', color: 'var(--on-brand)' }} onClick={() => decide(checkedIds, 'approved')}>Approve selected ({checkedIds.length})</button> : null}
            </>
          ) : null}
          <input ref={searchRef} className="adm-input" value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Search name, number or TrxID" aria-label="Search payments" />
        </div>
        <div className="adm-thead">
          <span>Student</span><span>Course</span><span>Method</span><span>TrxID</span><span>Submitted</span><span className="adm-x">Batch</span><span className="adm-x">Sent from</span>
        </div>
        <div className="adm-rows">
          {rows.map((r, i) => {
            const here = i === selIdx, flagged = rowFlags(r).length > 0, on = !!checked[r.id];
            return (
              <div key={r.id} className="adm-row" aria-current={here ? 'true' : undefined} data-flag={flagged} onClick={() => { pick(i); setOpen(true); }}>
                <span className="adm-cell adm-cell-row">
                  <button className="adm-check" role="checkbox" aria-checked={on} aria-label={'Select ' + r.name} onClick={(e) => { e.stopPropagation(); toggleCheck(r.id); }}><span>{on ? '✓' : ''}</span></button>
                  <span className="adm-cell" style={{ flex: 1 }}>
                    <button className="adm-row-name" style={{ fontWeight: here ? 600 : 400 }}>{r.name}</button>
                    <span className="adm-cell-s mono ink3">{r.phone}{flagged ? <span className="adm-flag"> · Check</span> : null}</span>
                  </span>
                </span>
                <span className="adm-cell"><span className="adm-cell-t ink2">{r.course}</span></span>
                <span className="adm-cell">
                  <span className="adm-cell-t ink2">{r.method}</span>
                  <span className="adm-cell-s mono" style={{ color: r.amount < r.due ? 'var(--margin)' : 'var(--ink-2)' }}>{taka(r.amount)}</span>
                </span>
                <span className="adm-cell"><span className="adm-cell-t mono ink2" style={{ fontSize: 12 }}>{r.trx}</span></span>
                <span className="adm-cell"><span className="adm-cell-t ink3" style={{ fontSize: 12 }}>{ago(r.agoMin)}</span></span>
                <span className="adm-cell adm-x"><span className="adm-cell-t mono ink2" style={{ fontSize: 12 }}>{r.batch}</span></span>
                <span className="adm-cell adm-x"><span className="adm-cell-t mono" style={{ fontSize: 12, color: r.sender !== r.phone ? 'var(--margin)' : 'var(--ink-2)' }}>{r.sender}</span></span>
              </div>
            );
          })}
          {rows.length === 0 ? (
            <div className="empty" style={{ padding: '72px 24px' }}>
              <Penguin size={80} />
              <div className="t17 w600">{needle ? 'Nothing matches the search' : 'This list is empty'}</div>
              <div className="t14 ink2" style={{ maxWidth: '36ch' }}>{needle ? 'Try a name, a phone number or a TrxID.' : 'Everything is reviewed. New submissions appear here.'}</div>
            </div>
          ) : null}
        </div>
        <footer className="adm-foot">
          <span>{plural(rows.length, 'payment')}{checkedIds.length ? ' · ' + checkedIds.length + ' selected' : ''}</span>
          <div className="adm-grow" />
          <Keys hints={['↑↓ row', 'space select', 'A approve', 'R reject', '/ search']} />
        </footer>
      </section>

      <Splitter />
      {selRow ? (
        <aside className="adm-pane" data-closed={!open} aria-label="Payment details">
          <div className="adm-pane-in">
            <div className="adm-pane-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="adm-pane-title">{selRow.name}</div>
                <div className="adm-muted mono">{selRow.phone}</div>
              </div>
              <Badge c={badge(selRow)} />
              <button className="adm-x-btn adm-narrow-only" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            {flags.length ? <div className="alert" style={{ borderRadius: 10, lineHeight: 1.6 }}>{flags.map((f) => <div key={f}>{f}</div>)}</div> : null}
            {selRow.status === 'rejected' && selRow.rejectReason ? <div className="adm-note" style={{ background: 'var(--margin-soft)' }}>Rejected: {reasonText(rejectReasons, selRow.rejectReason, 'en')}</div> : null}

            <section className="adm-block">
              <div className="adm-group" style={{ padding: 0 }}>Course</div>
              <div className="adm-kv">
                <span>Name</span><span>{selRow.course}</span>
                <span>Batch</span><span className="mono">{selRow.batch}</span>
              </div>
            </section>
            <section className="adm-block">
              <div className="adm-group" style={{ padding: 0 }}>Payment</div>
              <div className="adm-kv">
                <span>Method</span><span>{selRow.method}</span>
                <span>Received</span><span className="mono" style={{ fontWeight: 600, color: selRow.amount < selRow.due ? 'var(--margin)' : undefined }}>{taka(selRow.amount)}</span>
                <span>Expected</span><span className="mono ink2">{taka(selRow.due)}</span>
                <span>TrxID</span><span className="mono" style={{ fontWeight: 600 }}>{selRow.trx}</span>
                <span>Sent from</span><span className="mono" style={{ color: selRow.sender !== selRow.phone ? 'var(--margin)' : undefined }}>{selRow.sender}</span>
                <span>Submitted</span><span className="ink2">{ago(selRow.agoMin)}</span>
              </div>
            </section>

            {selRow.status === 'pending' && canPay && rejectFor === selRow.id ? (
              <section className="adm-block">
                <div style={{ fontSize: 13, fontWeight: 500 }}>Reason for rejecting <span className="ink3" style={{ fontWeight: 400 }}>— the student sees it</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {rejectReasons.map((r) => (
                    <button key={r.code} className="adm-opt" style={{ border: '1px solid var(--margin)', background: 'var(--surface)', color: 'var(--margin)' }} onClick={() => decide([selRow.id], 'rejected', r.code)}>{r.en}</button>
                  ))}
                </div>
              </section>
            ) : null}
            {selRow.status === 'pending' && canPay ? (
              <div className="adm-actions">
                {rejectFor === selRow.id ? <button className="adm-btn adm-btn-lg" onClick={() => setRejectFor(null)}>Cancel</button> : (
                  <>
                    <button className="adm-btn adm-btn-lg" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--brand)', background: 'var(--brand)', color: 'var(--on-brand)' }} onClick={() => decide([selRow.id], 'approved')}>Approve</button>
                    <button className="adm-btn adm-btn-lg" style={{ borderColor: 'var(--margin)', color: 'var(--margin)' }} onClick={() => setRejectFor(selRow.id)}>Reject</button>
                  </>
                )}
              </div>
            ) : null}
            {selRow.status === 'pending' && !canPay ? <div className="adm-muted" style={{ fontSize: 12 }}>You can only view this area, so you cannot approve or reject.</div> : null}
            {selRow.live ? <div className="note-dashed" style={{ borderRadius: 10 }}>You submitted this row yourself in the student view. Decide here, then look at the student view.</div> : null}
          </div>
        </aside>
      ) : (
        <aside className="adm-pane" data-summary="true" aria-label="Section summary">
          <div className="adm-pane-in">
            <div className="adm-pane-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="adm-pane-title">Payments</div>
                <div className="adm-muted">Summary</div>
              </div>
            </div>
            <section className="adm-block">
              <div className="adm-group" style={{ padding: 0 }}>By status</div>
              <div className="adm-kv">
                <span>Pending</span><span>{counts.pending}</span>
                <span>Approved</span><span>{counts.approved}</span>
                <span>Rejected</span><span>{counts.rejected}</span>
              </div>
            </section>
            <section className="adm-block">
              <div className="adm-group" style={{ padding: 0 }}>Totals</div>
              <div className="adm-kv">
                <span>Waiting for approval</span><span className="mono">{taka(sums.pending)}</span>
                <span>Approved</span><span className="mono">{taka(sums.approved)}</span>
              </div>
            </section>
            <div className="adm-note" style={{ background: 'var(--surface-sunk)' }}>Nothing in this list. Pick another tab or clear the search.</div>
          </div>
        </aside>
      )}
    </>
  );
}

/* ---------- content review ---------- */

/** Course and position of a lesson revision, for list rows and the preview. */
function where(k: string, x: LessonRevision) {
  const c = courses[keyCourse(k)];
  return { course: c.titleEn, tag: c.code, loc: revisionRef(x) };
}

function ContentQueue() {
  const { s, set } = useStore();
  const { logic, st } = useConsole();
  const canContent = logic.perm('content') === 'edit';

  const [filter, setFilter] = useState<CFilter>('review');
  const [sel, setSel] = useState(0);
  const [retFor, setRetFor] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // On a phone the preview covers the queue, so it opens only when an item is picked.
  const [open, setOpen] = useState(false);

  const count: Record<CFilter, number> = { review: 0, published: 0, returned: 0 };
  const keys = itemKeys(s);
  keys.forEach((k) => {
    const status = item(s, k).status;
    if (status === 'review' || status === 'returned') count[status]++;
    else if (status === 'published' && s.aDecided[k] === 'published') count.published++;
  });
  const vis = keys.filter((k) => {
    const status = item(s, k).status;
    return filter === 'published' ? status === 'published' && s.aDecided[k] === 'published' : status === filter;
  });
  const ci = Math.min(sel, Math.max(0, vis.length - 1));
  const ck = vis[ci] || null;
  const cit = ck ? item(s, ck) : null;
  const canRet = !!reason || !!note.trim();
  const retOpen = !!ck && retFor === ck;
  const inReview = !!cit && cit.status === 'review';

  const pick = (i: number) => { setSel(i); setRetFor(null); };
  const cancelReturn = () => { setRetFor(null); setReason(null); setNote(''); };
  const decide = (k: string | null, status: 'published' | 'returned', why?: string, detail?: string) => {
    if (!k || !canContent) return;
    set((x: AppState) => decideContent(x, k, status, why, detail));
    const x = item(s, k), w = where(k, x);
    const what = x.kind === 'test' ? 'test' : 'lesson';
    logic.log('content', (status === 'published' ? 'Published ' : 'Returned ') + what, w.tag + ' · ' + w.loc + (x.kind === 'test' ? '' : ' · ' + (x.title || '')),
      [reasonText(contentReasons, why, 'en'), detail].filter(Boolean).join(' — '));
    cancelReturn(); setSel(0); setOpen(false);
  };

  useKeys((e) => {
    if (st.srOpen || st.confirm || !vis.length) return;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); pick(Math.min(vis.length - 1, ci + 1)); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); pick(Math.max(0, ci - 1)); }
    else if ((e.key === 'a' || e.key === 'A') && inReview && canContent) { e.preventDefault(); decide(ck, 'published'); }
    else if ((e.key === 'r' || e.key === 'R') && inReview && canContent) { e.preventDefault(); setRetFor(ck); setOpen(true); }
    else if (e.key === 'Escape') { if (retFor) cancelReturn(); else setOpen(false); }
  });

  const emptyTitle = filter === 'review' ? 'Everything submitted is reviewed' : filter === 'published' ? 'Nothing published yet today' : 'Nothing has been sent back';

  return (
    <>
      <section className="adm-list adm-qlist">
        <div className="adm-toolbar">
          <Tabs tabs={[['Pending', 'review', count.review], ['Published', 'published', count.published], ['Returned', 'returned', count.returned]]} cur={filter}
            pick={(id) => { setFilter(id); setSel(0); setRetFor(null); }} />
        </div>
        <div className="adm-rows">
          {vis.map((k, i) => {
            const x = item(s, k), w = where(k, x), here = i === ci;
            return (
              <button key={k} className="adm-qitem" onClick={() => { pick(i); setOpen(true); }} aria-current={here ? 'true' : undefined}>
                <span className="row t12 ink3" style={{ gap: 8, width: '100%' }}><span>{w.tag} · {w.loc}</span><span className="ml-auto nowrap">{ago(x.subAgoMin ?? 0)}</span></span>
                <span style={{ fontSize: 14, lineHeight: 1.5, fontWeight: here ? 600 : 500 }}>{x.title || 'Untitled'}</span>
                <span className="row t12 ink2" style={{ gap: 8 }}>
                  <span>{x.by || teacher.name}</span>
                  <span className="tag" style={{ color: x.isNew ? 'var(--brand)' : 'var(--ink-2)' }}>{x.kind === 'test' ? (x.isNew ? 'New Test' : 'Test Update') : x.isNew ? 'New Lesson' : 'Update'}</span>
                </span>
              </button>
            );
          })}
          {vis.length === 0 ? <div className="adm-empty">{emptyTitle}</div> : null}
        </div>
        <footer className="adm-foot">
          <span>{plural(vis.length, 'item')}</span>
          <div className="adm-grow" />
          <Keys hints={['↑↓', 'A publish', 'R send back']} />
        </footer>
      </section>

      {cit && ck ? (
        <ContentPreview k={ck} it={cit} loc={where(ck, cit)} closed={!open} onBack={() => setOpen(false)}
          badge={cit.status === 'published' ? logic.B('published') : cit.status === 'returned' ? logic.B('denied', 'Returned') : logic.B('pending', 'Pending review')}>
          {inReview && canContent && retOpen ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Why it is going back <span className="ink3" style={{ fontWeight: 400 }}>— the teacher sees this</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contentReasons.map((r) => {
                  const on = reason === r.code;
                  return (
                    <button key={r.code} className="adm-opt" aria-pressed={on} onClick={() => setReason(on ? null : r.code)}
                      style={{ border: '1px solid ' + (on ? 'var(--margin)' : 'var(--line-strong)'), background: on ? 'var(--margin-soft)' : 'var(--surface)', color: on ? 'var(--margin)' : 'var(--ink-2)', fontWeight: on ? 600 : 400 }}>{r.en}</button>
                  );
                })}
              </div>
              <textarea className="adm-field-in" value={note} onChange={(e) => setNote(e.target.value)} aria-label="What to fix" placeholder="What to fix — e.g. 4:10 to 6:00, or question 2" rows={2} style={{ minHeight: 64 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn adm-btn-lg" onClick={cancelReturn}>Cancel</button>
                <button className="adm-btn adm-btn-lg" disabled={!canRet} onClick={() => { if (canRet) decide(ck, 'returned', reason || '', note.trim()); }}
                  style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--margin)', background: 'var(--margin-soft)', color: 'var(--margin)' }}>Send back</button>
              </div>
            </>
          ) : inReview && canContent ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="adm-btn adm-btn-lg" style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--brand)', background: 'var(--brand)', color: 'var(--on-brand)' }} onClick={() => decide(ck, 'published')}>Publish</button>
              <button className="adm-btn adm-btn-lg" style={{ borderColor: 'var(--margin)', color: 'var(--margin)' }} onClick={() => setRetFor(ck)}>Send back</button>
            </div>
          ) : inReview ? <div className="adm-muted" style={{ fontSize: 12 }}>You can only view this area, so you cannot publish or send back.</div> : null}
        </ContentPreview>
      ) : (
        <div className="adm-blank">
          <Penguin size={72} />
          <div className="t17 w600">{emptyTitle}</div>
          <div className="t14 ink2" style={{ maxWidth: '38ch' }}>Lessons and chapter tests appear here when a teacher submits them.</div>
        </div>
      )}
    </>
  );
}

/** The submission as students will see it, beside the checks and the decision (`children`). */
function ContentPreview({ k, it, loc, badge, closed, onBack, children }: {
  k: string; it: LessonRevision; loc: { course: string; loc: string }; badge: Cell; closed: boolean; onBack: () => void; children: React.ReactNode;
}) {
  const nb = it.blocks.filter(blockHasContent).length, vq = it.quiz.length, vOk = it.video.state === 'done';
  const isTest = it.kind === 'test';
  const checks: [string, boolean][] = isTest ? [
    ['Questions · ' + vq, vq >= MIN_TEST_QUESTIONS],
    ['Time limit · ' + Math.round((it.seconds || 0) / 60) + ' min', !!it.seconds],
  ] : [
    ['Video · ' + (vOk ? it.video.dur || '' : 'none'), vOk],
    ['Notes · ' + plural(nb, 'block'), nb > 0],
    ['Quiz · ' + (vq ? plural(vq, 'question') : 'none'), vq > 0],
  ];

  return (
    <div className="adm-review" data-closed={closed}>
      <div className="adm-review-in">
        <div className="adm-review-doc" key={k}>
          <div className="adm-review-head">
            <button className="adm-link adm-phone-only" style={{ marginLeft: -8, marginBottom: 4 }} onClick={onBack}>← Back to the queue</button>
            <div className="t12 ink3">{loc.course} · {loc.loc}</div>
            <h2>{it.title || 'Untitled'}</h2>
            <div className="t13 ink2">{(it.by || teacher.name) + ' · submitted ' + ago(it.subAgoMin ?? 0)}</div>
          </div>
          <div className="adm-review-flow">
            {isTest ? null : (
              <>
                <div className="adm-review-video"><span>{vOk ? it.video.name : 'No video'}</span>{vOk ? <span>▶ {it.video.dur || ''}</span> : null}</div>
                <div>
                  <div className="adm-review-label">Notes — as students see them</div>
                  {/* Lesson notes are the teacher's own words, so they stay in the language they were written in. */}
                  <div className="adm-review-card" lang="bn" style={{ padding: '20px 24px' }}><NoteBlocks blocks={it.blocks} /></div>
                </div>
              </>
            )}
            {it.quiz.map((q, qi) => (
              <div key={qi} lang="bn">
                {qi === 0 ? <div className="adm-review-label" lang="en">{isTest ? 'Questions' : 'Quiz'} — correct answers marked</div> : null}
                <div className="adm-review-card">
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <span className="mono t12 ink3" style={{ lineHeight: '24px' }}>{pad2(qi + 1)}</span>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{q.stem}</span>
                  </div>
                  <div className="adm-review-opts">
                    {q.o.map((o, oi) => (
                      <div key={oi} className="adm-review-opt" data-right={q.a === oi}>
                        <span style={{ width: 14, flexShrink: 0, color: 'var(--brand)' }} aria-label={q.a === oi ? 'Correct answer' : undefined}>{q.a === oi ? '✓' : ''}</span><span>{o}</span>
                      </div>
                    ))}
                  </div>
                  {q.why ? <div className="t13 ink2" style={{ marginTop: 10, lineHeight: 1.7 }}><span lang="en">Explanation · </span>{q.why}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="adm-review-rail" aria-label="Review">
          <div className="adm-review-info">
            <div><Badge c={badge} /></div>
            <div className="adm-checks">
              {checks.map(([label, ok]) => (
                <span key={label}><span style={{ color: ok ? 'var(--brand)' : 'var(--ink-3)' }} aria-label={ok ? 'Present' : 'Missing'}>{ok ? '✓' : '–'}</span><span>{label}</span></span>
              ))}
            </div>
            {!it.isNew && it.status === 'review' ? <div className="note-dashed" style={{ borderRadius: 10 }}>An update to something already published. Publishing replaces the old version; student progress and results are kept.</div> : null}
            {it.status === 'returned' ? (
              <div style={{ padding: '10px 12px', border: '1px solid var(--margin)', borderRadius: 10, background: 'var(--margin-soft)' }}>
                <div className="t12 w500" style={{ color: 'var(--margin)' }}>Sent back because</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{returnReason(it, 'en') || 'No reason given'}</div>
              </div>
            ) : null}
            {it.live && it.status === 'review' ? <div className="note-dashed" style={{ borderRadius: 10 }}>Submitted just now from the teacher view. Decide here, then look at the Content page in the teacher view.</div> : null}
          </div>
          <div className="adm-review-act">{children}</div>
        </aside>
      </div>
    </div>
  );
}
