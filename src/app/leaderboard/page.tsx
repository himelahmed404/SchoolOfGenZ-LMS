'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Icon, initial } from '@/components/ui';
import { defaultStudent } from '@/lib/data';
import { ordinal, ordinalEn, plural } from '@/lib/format';
import { boardRows } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const AVATAR: [string, string][] = [
  ['var(--brand-soft)', 'var(--brand)'], ['var(--accent-2-soft)', 'var(--accent-2)'], ['var(--ok-soft)', 'var(--ok)'], ['var(--warn-soft)', 'var(--warn)'],
];

export default function LeaderboardPage() {
  const { s, n, numerals } = useStore();
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const weekly = period === 'week';

  const rows = boardRows(s, weekly);
  const meIdx = Math.max(0, rows.findIndex((r) => r.live));
  const me = rows[meIdx];
  // Only ±5 around the student. The full ranking is never shown (the API must return just this window).
  const from = Math.max(0, meIdx - 5), to = Math.min(rows.length, meIdx + 6);
  const above = rows.filter((r) => r.pts > me.pts);
  const next = above.length ? above[above.length - 1] : null;
  const diff = next ? next.pts - me.pts : 0;
  const { courseId, ch, li } = s.last;
  const morePill = (text: string) => (
    <div style={{ alignSelf: 'center', padding: '3px 12px', borderRadius: 999, background: 'var(--surface-sunk)', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{text}</div>
  );

  return (
    <Shell role="student" title="Leaderboard" back="/">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="d1 only-desktop" style={{ margin: '0 0 6px' }}>Leaderboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
              <span className="mono" style={{ padding: '2px 8px', borderRadius: 8, background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{defaultStudent.batch}</span>
              <span>{plural(rows.length, 'student')}</span>
            </div>
          </div>
          <div className="seg" role="group" aria-label="সময়কাল" style={{ marginLeft: 'auto' }}>
            <button aria-pressed={!weekly} onClick={() => setPeriod('all')}>All time</button>
            <button aria-pressed={weekly} onClick={() => setPeriod('week')}>This week</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--hero-cols)', gap: 16 }}>
          <div className="hero" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Your Rank</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="disp" style={{ fontSize: 80, lineHeight: 1, fontWeight: 800 }}>{ordinalEn(me.rank)}</span>
              <span style={{ fontSize: 15 }}>of {rows.length}</span>
            </div>
            <span style={{ alignSelf: 'flex-start', marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--sun)', color: 'var(--on-sun)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
              <Icon name="bolt" size={18} fill />{plural(me.pts, 'point')}
            </span>
          </div>
          <div className="card" style={{ borderRadius: 24, padding: 'var(--hero-pad)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="tile" style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icon name="trending_up" /></span>
            <div className="disp" style={{ fontSize: 19, lineHeight: 1.4, fontWeight: 700 }}>
              {next ? 'আর ' + n(diff) + ' পয়েন্ট পেলে ' + ordinal(next.rank, numerals) + ' — মোটামুটি ' + n(Math.ceil(diff / 10)) + 'টা লেসন।' : 'তুমি সবার উপরে। ধরে রাখো।'}
            </div>
            <Link href={`/learn/${courseId}/${ch}/${li}`} className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-start', padding: '0 20px' }}>
              Next Lesson<Icon name="arrow_forward" size={20} />
            </Link>
          </div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">Around You</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {from > 0 ? morePill('↑ ' + from + ' more') : null}
            {rows.slice(from, to).map((r, i) => {
              const av = AVATAR[r.name.length % 4];
              return (
                <div key={r.name + i} aria-current={r.live ? 'true' : undefined}
                  style={{ display: 'grid', gridTemplateColumns: '36px 36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', minHeight: 56, padding: '8px 16px 8px 10px', borderRadius: 16, border: '1px solid ' + (r.live ? 'var(--brand)' : 'var(--line)'), background: r.live ? 'var(--brand-soft)' : 'var(--surface)' }}>
                  <span className="disp" style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: r.rank <= 3 ? 'var(--warn)' : 'var(--ink-3)' }}>{r.rank}</span>
                  <span className="tile" style={{ width: 36, height: 36, borderRadius: 999, background: av[0], color: av[1], fontSize: 15, fontWeight: 700 }}>{initial(r.name)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="ellipsis" style={{ fontSize: 15, fontWeight: r.live ? 700 : 500 }}>{r.name}</span>
                    {r.live ? <span style={{ flexShrink: 0, padding: '0 8px', borderRadius: 999, background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 12, fontWeight: 700, lineHeight: '20px' }}>তুমি</span> : null}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: r.live ? 700 : 500, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{r.pts}</span>
                </div>
              );
            })}
            {to < rows.length ? morePill('↓ ' + (rows.length - to) + ' more') : null}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', borderRadius: 18, background: 'var(--surface-sunk)', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
          <Icon name="info" size={20} style={{ color: 'var(--ink-3)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '62ch' }}>
            <div>পয়েন্ট — প্রতিটা লেসন শেষ করলে ১০, চ্যাপ্টার টেস্টে প্রতিটা সঠিক উত্তরে ৫ (সবচেয়ে ভালো চেষ্টাটা ধরা হয়)।</div>
            <div>{weekly ? 'সাপ্তাহিক বোর্ড প্রতি শনিবার শূন্য থেকে শুরু হয় — পিছিয়ে থাকলেও এই সপ্তাহে সামনে আসা যায়।' : 'সব সময়ের পয়েন্ট ব্যাচ শুরুর দিন থেকে জমছে।'}</div>
            <div>পুরো তালিকা কেউ দেখে না — সবাই শুধু নিজের আশেপাশের জনদের দেখে।</div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
