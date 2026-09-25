'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { testMeta, testQs } from '@/lib/data';
import { mmss, pad2 } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function ResultPage() {
  const { s, n } = useStore();
  const [wrongOnly, setWrongOnly] = useState(false);

  if (s.test.score === null) {
    return (
      <Shell role="student" title="Result" back="/">
        <div className="card empty">
          <div className="t17 w600">এখনো কোনো টেস্ট জমা দাওনি</div>
          <Link href="/test" className="btn btn-primary">Start</Link>
        </div>
      </Shell>
    );
  }

  const review = testQs.map((q, i) => {
    const mine = s.test.ans[i];
    return { i, ok: mine === q.a, stem: q.stem, yours: mine === undefined ? 'দাওনি' : q.o[mine], right: q.o[q.a as number] };
  }).filter((r) => (wrongOnly ? !r.ok : true));

  return (
    <Shell role="student" title="Result" back="/">
      <div className="t13 w500 ink2">{testMeta.name} · Result</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, margin: '8px 0 24px' }}>
        <div className="mono" style={{ fontSize: 'var(--d1)', lineHeight: 1.35, fontWeight: 500 }}>{n(s.test.score)}/{n(testQs.length)}</div>
        <div className="t13 ink3" style={{ paddingBottom: 8 }}>সময় নিয়েছ {n(mmss(s.test.elapsed))}</div>
      </div>
      <div className="row wrap" style={{ marginBottom: 32 }}>
        <button className="btn" aria-pressed={wrongOnly} onClick={() => setWrongOnly(!wrongOnly)}
          style={{ background: wrongOnly ? 'var(--brand-soft)' : 'var(--surface)', color: wrongOnly ? 'var(--brand)' : 'var(--ink)' }}>
          {wrongOnly ? 'সব প্রশ্ন দেখো' : 'ভুলগুলো দেখো'}
        </button>
        <Link href="/certificate" className="btn btn-link">View Certificate</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {review.map((r) => {
          const accent = r.ok ? 'var(--brand)' : 'var(--margin)';
          return (
            <div key={r.i} style={{ border: '1px solid var(--line)', borderLeft: '3px solid ' + accent, borderRadius: 2, background: 'var(--surface)', padding: 16 }}>
              <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                <span className="mono t13 ink3">{n(pad2(r.i + 1))}</span>
                <span className="t13 w500" style={{ color: accent }}>{r.ok ? '✓ ঠিক' : '✗ ভুল'}</span>
              </div>
              <div className="t15" style={{ marginBottom: 10 }}>{r.stem}</div>
              <div className="t13 ink2">তোমার উত্তর — {r.yours}</div>
              <div className="t13 ink2">সঠিক উত্তর — {r.right}</div>
            </div>
          );
        })}
        {review.length === 0 ? <div className="card empty"><div className="t17 w600">কোনো ভুল নেই</div></div> : null}
      </div>
    </Shell>
  );
}
