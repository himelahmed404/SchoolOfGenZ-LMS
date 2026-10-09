'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { startTest, submitTest, testElapsed } from '@/lib/actions';
import { mmss, pad2 } from '@/lib/format';
import { Icon } from '@/components/ui';
import { chapterDone, chapterTest, testKey } from '@/lib/selectors';
import { useGuard } from '@/components/useGuard';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

const LETTERS = 'কখগঘ';

/** Chapter test runner. The test is optional and opens once the chapter's lessons are done. */
export default function ChapterTestPage() {
  const p = useParams<{ courseId: string; ch: string }>();
  const { s, set, n } = useStore();
  // Ready, and a student: a signed-out visitor is sent to sign in before any attempt starts.
  const ready = useGuard();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [exitAsk, setExitAsk] = useState(false);
  const [submitAsk, setSubmitAsk] = useState(false);

  const cid = p.courseId as CourseId, ci = Number(p.ch);
  const chapter = s.catalog.courses[cid]?.chapters[ci];
  const key = testKey(cid, ci);
  const test = chapter ? chapterTest(s, cid, ci) : null;
  const open = !!test && chapterDone(s, cid, ci);
  const running = s.test.key === key;
  const courseHref = '/course/' + cid;

  // A fresh visit starts a new attempt; returning after "Exit" resumes the running one.
  useEffect(() => {
    if (!ready || !chapter) return;
    if (!open) router.replace(courseHref);
    else if (!running) set((x) => startTest(x, key));
  }, [ready, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const limit = test ? test.seconds : 0;
  const left = Math.max(0, limit - testElapsed(s, now, limit));

  const submit = () => {
    set((x) => submitTest(x, Date.now()));
    router.push(`/test/${cid}/${ci}/result`);
  };

  useEffect(() => {
    if (ready && running && left === 0) submit();
  }, [left, ready, running]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chapter) notFound();
  if (!ready || !test || !running) return <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', background: 'var(--paper)' }} />;

  const qs = test.qs;
  const qi = Math.min(s.test.q, qs.length - 1), q = qs[qi];
  const setQ = (i: number) => set((x) => ({ ...x, test: { ...x.test, q: i } }));
  const pick = (oi: number) => set((x) => ({ ...x, test: { ...x.test, ans: { ...x.test.ans, [qi]: oi } } }));

  const answered = Object.keys(s.test.ans).length, unanswered = qs.length - answered;
  const last = qi === qs.length - 1;
  const low = left < 120;

  return (
    <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <div style={{ position: 'sticky', top: 'var(--devbar-h, 0px)', zIndex: 5, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 64, padding: '0 var(--test-pad)' }}>
          <button className="btn btn-round" style={{ width: 44, height: 44, flexShrink: 0 }} onClick={() => setExitAsk(true)} aria-label="Exit"><Icon name="close" /></button>
          <div style={{ minWidth: 0 }}>
            <div className="disp ellipsis" style={{ fontSize: 17, lineHeight: 1.2, fontWeight: 700 }}>Chapter {pad2(ci + 1)} test</div>
            <div className="ellipsis" style={{ fontSize: 12, color: 'var(--ink-3)' }}>Question {qi + 1}/{qs.length} · {chapter.name}</div>
          </div>
          <div className="mono" role="timer" aria-live="off"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 999, background: low ? 'var(--margin-soft)' : 'var(--surface-sunk)', color: low ? 'var(--margin)' : 'var(--ink)', fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <Icon name="timer" size={20} />{mmss(left)}
          </div>
        </div>
        <div style={{ height: 4, background: 'var(--surface-sunk)' }}>
          <div style={{ height: 4, width: Math.round((answered / qs.length) * 100) + '%', background: 'var(--brand)', transition: 'width 300ms ease' }} />
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: 'var(--test-pad)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ borderRadius: 24, padding: 'var(--card-pad)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', marginBottom: 12, borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--on-brand-soft)', fontSize: 13, fontWeight: 700 }}>Question {pad2(qi + 1)}</div>
          <div style={{ fontSize: 18, lineHeight: 1.6, fontWeight: 600, marginBottom: 18 }}>{q.stem}</div>
          <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.o.map((label, oi) => {
              const chosen = s.test.ans[qi] === oi;
              return (
                <button key={oi} role="radio" aria-checked={chosen} onClick={() => pick(oi)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 58, padding: '8px 14px 8px 8px', border: '2px solid ' + (chosen ? 'var(--brand)' : 'var(--line)'), borderRadius: 16, background: chosen ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left', fontSize: 16, whiteSpace: 'normal', color: 'var(--ink)' }}>
                  <span className="tile" style={{ width: 40, height: 40, borderRadius: 12, background: chosen ? 'var(--brand)' : 'var(--surface-sunk)', color: chosen ? 'var(--on-brand)' : 'var(--ink-2)', fontWeight: 700 }}>{LETTERS[oi]}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ padding: '0 16px' }} onClick={() => setQ(Math.max(0, qi - 1))}><Icon name="chevron_left" />Prev</button>
          {/* The main button is the next step: Next until the last question, then Submit. Submit always asks first. */}
          <button className={'btn' + (last ? '' : ' btn-primary')} style={{ padding: '0 16px' }} disabled={last} onClick={() => setQ(qi + 1)}>Next<Icon name="chevron_right" /></button>
          <button className={'btn' + (last ? ' btn-primary' : '')} style={{ marginLeft: 'auto', padding: '0 24px' }} onClick={() => setSubmitAsk(true)}>Submit</button>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 12 }}>Questions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {qs.map((_, i) => {
              const has = s.test.ans[i] !== undefined, here = i === qi;
              return (
                <button key={i} onClick={() => setQ(i)} aria-current={here ? 'step' : undefined} aria-label={'Question ' + (i + 1) + (has ? ', answered' : '')}
                  style={{ width: 44, height: 44, border: '2px solid ' + (here ? (has ? 'var(--ink)' : 'var(--brand)') : has ? 'var(--brand)' : 'var(--line)'), borderRadius: 999, background: has ? 'var(--brand)' : 'var(--surface)', color: has ? 'var(--on-brand)' : 'var(--ink-2)', fontSize: 15, fontWeight: 700 }}>{i + 1}</button>
              );
            })}
          </div>
        </div>
      </div>

      {exitAsk ? (
        <div className="ov dialog-scrim" data-print="hide">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
            <span className="tile" style={{ width: 48, height: 48, marginBottom: 14, borderRadius: 999, background: 'var(--warn-soft)', color: 'var(--warn)' }}><Icon name="timer" size={26} /></span>
            <div id="exit-title" className="disp" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>টেস্ট থেকে বের হবে?</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 22 }}>সময় চলতেই থাকবে। ফিরে এলে যেখানে ছিলে সেখান থেকেই শুরু হবে।</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, height: 48 }} onClick={() => setExitAsk(false)} autoFocus>Stay</button>
              <button className="btn btn-danger" style={{ flex: 1, height: 48, fontSize: 15 }} onClick={() => router.push(courseHref)}>Exit</button>
            </div>
          </div>
        </div>
      ) : null}

      {submitAsk ? (
        <div className="ov dialog-scrim" data-print="hide">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="submit-title">
            <span className="tile" style={{ width: 48, height: 48, marginBottom: 14, borderRadius: 999, background: unanswered ? 'var(--warn-soft)' : 'var(--ok-soft)', color: unanswered ? 'var(--warn)' : 'var(--ok)' }}><Icon name={unanswered ? 'help' : 'task_alt'} size={26} /></span>
            <div id="submit-title" className="disp" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>টেস্ট জমা দেবে?</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>
              {unanswered ? n(unanswered) + 'টা প্রশ্নের উত্তর এখনো দাওনি। জমা দিলে সেগুলো ভুল ধরা হবে।' : 'সব প্রশ্নের উত্তর দিয়েছ। জমা দিলে এই চেষ্টা শেষ হবে।'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 22px', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}><Icon name="quiz" size={18} />{answered} of {qs.length} answered · {mmss(left)} left</div>
            {/* The safe choice leads: go back while questions are open, submit once all are answered. */}
            <div style={{ display: 'flex', gap: 10 }}>
              {unanswered ? (
                <>
                  <button className="btn btn-primary" style={{ flex: 1, height: 48 }} autoFocus onClick={() => { setSubmitAsk(false); setQ(Math.max(0, qs.findIndex((_, i) => s.test.ans[i] === undefined))); }}>Go Back</button>
                  <button className="btn" style={{ flex: 1, height: 48, fontSize: 15 }} onClick={submit}>Submit Anyway</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ flex: 1, height: 48 }} autoFocus onClick={submit}>Submit</button>
                  <button className="btn" style={{ flex: 1, height: 48, fontSize: 15 }} onClick={() => setSubmitAsk(false)}>Go Back</button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
