'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { startTest, submitTest, testElapsed } from '@/lib/actions';
import { testMeta, testQs } from '@/lib/data';
import { mmss, pad2 } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function TestPage() {
  const { s, set, n, ready } = useStore();
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [exitAsk, setExitAsk] = useState(false);

  // A fresh visit starts a new attempt; returning after "Exit" resumes the running one.
  useEffect(() => {
    if (ready && !s.test.on) set(startTest);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = testElapsed(s, now);
  const left = Math.max(0, testMeta.seconds - elapsed);

  const submit = () => {
    set((x) => submitTest(x, Date.now()));
    router.push('/test/result');
  };

  useEffect(() => {
    if (ready && s.test.on && left === 0) submit();
  }, [left, ready, s.test.on]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !s.test.on) return <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', background: 'var(--paper)' }} />;

  const qi = s.test.q, q = testQs[qi];
  const setQ = (i: number) => set((x) => ({ ...x, test: { ...x.test, q: i } }));
  const pick = (oi: number) => set((x) => ({ ...x, test: { ...x.test, ans: { ...x.test.ans, [qi]: oi } } }));

  return (
    <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 var(--test-pad)', height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5 }}>
        <button className="btn btn-sm" onClick={() => setExitAsk(true)}>Exit</button>
        <div className="t15 w600">{testMeta.name}</div>
        <div className="mono t13 ink3 ml-auto">{n(qi + 1)}/{n(testQs.length)}</div>
        <div className="mono nowrap" role="timer" aria-live="off" style={{ fontSize: 17, fontWeight: 500, color: left < 120 ? 'var(--margin)' : 'var(--ink)' }}>{n(mmss(left))}</div>
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: 'var(--test-pad)' }}>
        <div className="card card-pad">
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <span className="mono t13 ink3">{n(pad2(qi + 1))}</span>
            <span className="t17" style={{ lineHeight: 1.6 }}>{q.stem}</span>
          </div>
          <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.o.map((label, oi) => {
              const chosen = s.test.ans[qi] === oi;
              return (
                <button key={oi} role="radio" aria-checked={chosen} onClick={() => pick(oi)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '8px 14px', whiteSpace: 'normal', border: '1px solid ' + (chosen ? 'var(--brand)' : 'var(--line)'), borderRadius: 2, background: chosen ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left', fontSize: 15 }}>
                  <span style={{ width: 20, flexShrink: 0, textAlign: 'center', color: 'var(--brand)', fontSize: 14 }}>{chosen ? '●' : ''}</span>
                  <span className="grow">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn" onClick={() => setQ(Math.max(0, qi - 1))} disabled={qi === 0}>← Prev</button>
          <button className="btn" onClick={() => setQ(Math.min(testQs.length - 1, qi + 1))} disabled={qi === testQs.length - 1}>Next →</button>
          <button className="btn btn-primary ml-auto" onClick={submit}>Submit</button>
        </div>
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <div className="t13 w500 ink2" style={{ marginBottom: 10 }}>প্রশ্ন</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {testQs.map((_, i) => {
              const has = s.test.ans[i] !== undefined, here = i === qi;
              return (
                <button key={i} onClick={() => setQ(i)} aria-current={here ? 'step' : undefined} aria-label={'প্রশ্ন ' + n(i + 1) + (has ? ' — উত্তর দেওয়া' : '')}
                  className="mono t13 w500" style={{ width: 44, height: 44, border: '1px solid ' + (here ? 'var(--brand)' : 'var(--line)'), borderRadius: 2, background: has ? 'var(--brand-soft)' : 'var(--surface)', color: has ? 'var(--brand)' : 'var(--ink-2)' }}>{n(i + 1)}</button>
              );
            })}
          </div>
        </div>
      </div>

      {exitAsk ? (
        <div className="scrim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 70 }}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
            <div id="exit-title" className="t17 w600" style={{ marginBottom: 6 }}>টেস্ট থেকে বের হবে?</div>
            <div className="t15 ink2" style={{ marginBottom: 20 }}>সময় চলতেই থাকবে। ফিরে এলে যেখানে ছিলে সেখান থেকেই শুরু হবে।</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn grow" style={{ height: 44 }} onClick={() => setExitAsk(false)} autoFocus>থাকো</button>
              <button className="btn btn-danger grow" style={{ height: 44 }} onClick={() => router.push('/')}>Exit</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
