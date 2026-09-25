'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { defaultStudent } from '@/lib/data';
import { ordinal } from '@/lib/format';
import { boardRows } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function LeaderboardPage() {
  const { s, n, numerals } = useStore();
  const [period, setPeriod] = useState<'all' | 'week'>('all');
  const weekly = period === 'week';

  const rows = boardRows(s, weekly);
  const meIdx = Math.max(0, rows.findIndex((r) => r.live));
  const me = rows[meIdx];
  // Only ±5 around the student. The full ranking is never shown.
  const from = Math.max(0, meIdx - 5), to = Math.min(rows.length, meIdx + 6);
  const above = rows.filter((r) => r.pts > me.pts);
  const next = above.length ? above[above.length - 1] : null;
  const diff = next ? next.pts - me.pts : 0;
  const { courseId, ch, li } = s.last;

  return (
    <Shell role="student" title="Leaderboard" back="/">
      <div className="row wrap" style={{ gap: 8, paddingBottom: 14, marginBottom: 28, borderBottom: '1px solid var(--line)' }}>
        <span className="mono t13 ink2">{defaultStudent.batch}</span>
        <span className="t13 ink3">·</span>
        <span className="t13 ink3">{n(rows.length)} জন</span>
        <div className="seg ml-auto" role="group" aria-label="সময়কাল">
          <button aria-pressed={!weekly} onClick={() => setPeriod('all')}>All time</button>
          <button aria-pressed={weekly} onClick={() => setPeriod('week')}>This week</button>
        </div>
      </div>

      <div className="t13 w500 ink2">Your Rank</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 56, lineHeight: 1.2, fontWeight: 600 }}>{ordinal(me.rank, numerals)}</span>
        <span className="t15 ink3">{n(rows.length)} জনের মধ্যে</span>
        <span className="ml-auto t15 w500 ink2">{n(me.pts)} পয়েন্ট</span>
      </div>
      <div className="row wrap" style={{ gap: 16, margin: '6px 0 32px' }}>
        <div className="t15 ink2">
          {next
            ? 'আর ' + n(diff) + ' পয়েন্ট পেলে ' + ordinal(next.rank, numerals) + ' — মোটামুটি ' + n(Math.ceil(diff / 10)) + 'টা লেসন।'
            : 'তুমি সবার উপরে। ধরে রাখো।'}
        </div>
        <Link href={`/learn/${courseId}/${ch}/${li}`} className="btn btn-primary ml-auto" style={{ padding: '0 18px' }}>Next Lesson</Link>
      </div>

      <div className="t13 w500 ink2" style={{ marginBottom: 8 }}>Around You</div>
      <div className="stack">
        {from > 0 ? <div className="t12 ink3" style={{ padding: '6px 16px', background: 'var(--surface-sunk)' }}>↑ আরও {n(from)} জন</div> : null}
        {rows.slice(from, to).map((r, i) => (
          <div key={r.name + i} aria-current={r.live ? 'true' : undefined}
            style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) auto', gap: 12, alignItems: 'center', minHeight: 48, padding: '0 16px 0 14px', borderLeft: '2px solid ' + (r.live ? 'var(--brand)' : 'transparent'), background: r.live ? 'var(--brand-soft)' : 'var(--surface)' }}>
            <span className="t13 ink3">{n(r.rank)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="t15 ellipsis" style={{ fontWeight: r.live ? 600 : 400 }}>{r.name}</span>
              {r.live ? <span className="tag" style={{ color: 'var(--brand)' }}>তুমি</span> : null}
            </span>
            <span className="t13 ink2" style={{ fontWeight: r.live ? 600 : 400 }}>{n(r.pts)}</span>
          </div>
        ))}
        {to < rows.length ? <div className="t12 ink3" style={{ padding: '6px 16px', background: 'var(--surface-sunk)' }}>↓ আরও {n(rows.length - to)} জন</div> : null}
      </div>
      <div className="t13 ink3" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20, lineHeight: 1.7, maxWidth: '60ch' }}>
        <div>পয়েন্ট — প্রতিটা লেসন শেষ করলে ১০, মডেল টেস্টে প্রতিটা সঠিক উত্তরে ৫।</div>
        <div>{weekly ? 'সাপ্তাহিক বোর্ড প্রতি শনিবার শূন্য থেকে শুরু হয় — পিছিয়ে থাকলেও এই সপ্তাহে সামনে আসা যায়।' : 'সব সময়ের পয়েন্ট ব্যাচ শুরুর দিন থেকে জমছে।'}</div>
        <div>পুরো তালিকা কেউ দেখে না — সবাই শুধু নিজের আশেপাশের জনদের দেখে।</div>
      </div>
    </Shell>
  );
}
