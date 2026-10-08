'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { testMeta, testQs } from '@/lib/data';
import { mmss, pad2 } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function ResultPage() {
  const { s, n } = useStore();
  const [wrongOnly, setWrongOnly] = useState(false);

  if (s.test.score === null) {
    return (
      <Shell role="student" title="Result" back="/">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '44px 24px', textAlign: 'center' }}>
          <Penguin size={84} />
          <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>এখনো কোনো টেস্ট জমা দাওনি</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="hero" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{testMeta.name} · Result</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="disp" style={{ fontSize: 80, lineHeight: 1, fontWeight: 800 }}>{n(s.test.score)}</span>
              <span className="disp" style={{ fontSize: 28, fontWeight: 700, opacity: 0.85 }}>/ {n(testQs.length)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}><Icon name="timer" size={18} />সময় নিয়েছ {n(mmss(s.test.elapsed))}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" aria-pressed={wrongOnly} onClick={() => setWrongOnly(!wrongOnly)}
              style={{ border: 'none', background: wrongOnly ? 'var(--sun)' : '#FFFFFF', color: '#131A33', fontSize: 15, fontWeight: 700 }}>
              {wrongOnly ? 'সব প্রশ্ন দেখো' : 'ভুলগুলো দেখো'}
            </button>
            <Link href="/certificate" className="btn" style={{ border: '1px solid rgba(255,255,255,0.55)', background: 'transparent', color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>
              <Icon name="workspace_premium" size={20} />View Certificate
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {review.map((r) => {
            const accent = r.ok ? 'var(--ok)' : 'var(--margin)', soft = r.ok ? 'var(--ok-soft)' : 'var(--margin-soft)';
            return (
              <div key={r.i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px' }}>
                <span className="tile" style={{ width: 36, height: 36, borderRadius: 999, background: soft, color: accent }}><Icon name={r.ok ? 'check' : 'close'} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: 'var(--ink-3)' }}>প্রশ্ন {n(pad2(r.i + 1))}</span>
                    <span style={{ color: accent }}>{r.ok ? 'ঠিক' : 'ভুল'}</span>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 600, marginBottom: 10 }}>{r.stem}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', fontSize: 13 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: soft, color: accent }}>তোমার উত্তর — {r.yours}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: 'var(--ok-soft)', color: 'var(--ok)' }}>সঠিক উত্তর — {r.right}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {review.length === 0 ? (
            <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>কোনো ভুল নেই</div>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
