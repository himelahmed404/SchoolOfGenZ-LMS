'use client';

import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { batches, courses, teacher } from '@/lib/data';
import { roster, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function TeacherClassPage() {
  const { s, n } = useStore();
  const [sort, setSort] = useState<'low' | 'name'>('low');
  const [q, setQ] = useState('');
  const [chF, setChF] = useState<number | null>(null);

  const tc = courses[batches[teacher.batch].course];
  const list0 = roster(s, teacher.batch);
  const total = tc.chapters.length;
  const size = list0.length || 1;
  const query = q.trim();
  const list = list0
    .filter((r) => (chF === null || r.done === chF) && (!query || r.name.indexOf(query) >= 0))
    .sort(sort === 'name'
      ? (a, b) => a.name.localeCompare(b.name, 'bn')
      : (a, b) => a.done - b.done || a.name.localeCompare(b.name, 'bn'));

  return (
    <Shell role="teacher" title="Class">
      <div className="strip">
        <span className="mono t13 ink2">{teacher.batch}</span>
        <span className="t13 ink3">·</span>
        <span className="t13 ink3">{tc.title}</span>
        <span className="ml-auto t13 w500 ink2 nowrap">{n(list0.length)} জন</span>
      </div>
      <h1 className="d1" style={{ marginBottom: 6 }}>Class Progress</h1>
      <div className="muted-p" style={{ marginBottom: 28 }}>কে কোন অধ্যায় পর্যন্ত শেষ করেছে। শুধু তোমার ব্যাচ দেখা যায়।</div>

      <div className="disp" style={{ fontSize: 19, lineHeight: 1.2, fontWeight: 700, marginBottom: 12 }}>অধ্যায় অনুযায়ী</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {tc.chapters.map((ch, ci) => {
          const done = list0.filter((r) => r.done > ci).length, now = list0.filter((r) => r.done === ci).length, on = chF === ci;
          return (
            <button key={ci} aria-pressed={on} onClick={() => setChF(on ? null : ci)}
              style={{ width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', padding: '12px 16px', border: 'none', borderBottom: ci === total - 1 ? 'none' : '1px solid var(--line)', borderLeft: '2px solid ' + (on ? 'var(--brand)' : 'transparent'), background: on ? 'var(--brand-soft)' : 'var(--surface)', color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
              <span className="mono t13 ink3" style={{ width: 24, flexShrink: 0 }}>{ch.n}</span>
              <span className="t15" style={{ flex: '1 1 160px', minWidth: 0, fontWeight: on ? 600 : 400 }}>{ch.name.replace(/\s*\(.*\)\s*$/, '')}</span>
              <span style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, height: 4, display: 'flex', background: 'var(--line)' }}>
                  <span style={{ height: 4, width: Math.round((done / size) * 100) + '%', background: 'var(--brand)' }} />
                  <span style={{ height: 4, width: Math.round((now / size) * 100) + '%', background: 'var(--brand)', opacity: 0.4 }} />
                </span>
                <span className="t12 ink2 nowrap" style={{ width: 150, flexShrink: 0, textAlign: 'right' }}>{n(done)} জন শেষ{now ? ' · ' + n(now) + ' পড়ছে' : ''}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="t12 ink3" style={{ display: 'flex', alignItems: 'center', gap: '8px 16px', flexWrap: 'wrap', margin: '10px 0 32px' }}>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 4, background: 'var(--brand)' }} />শেষ করেছে</span>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 4, background: 'var(--brand)', opacity: 0.4 }} />এখন পড়ছে</span>
        <span>অধ্যায় বেছে নিলে নিচে শুধু সেখানকার ছাত্ররা</span>
      </div>

      <div className="row wrap" style={{ gap: 10, marginBottom: 8 }}>
        <div className="t13 w500 ink2">শিক্ষার্থী · {n(list.length)}</div>
        {chF !== null ? (
          <button onClick={() => setChF(null)} style={{ height: 28, padding: '0 10px', border: '1px solid var(--brand)', borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 12, fontWeight: 500 }}>
            অধ্যায় {tc.chapters[chF].n} পড়ছে ✕
          </button>
        ) : null}
        <div className="seg" role="group" aria-label="সাজানো" style={{ marginLeft: 'auto', padding: 3 }}>
          <button aria-pressed={sort === 'low'} onClick={() => setSort('low')} style={{ height: 30, padding: '0 12px' }}>কম আগে</button>
          <button aria-pressed={sort === 'name'} onClick={() => setSort('name')} style={{ height: 30, padding: '0 12px' }}>নাম</button>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম খোঁজো" aria-label="নাম খোঁজো"
            style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 15 }} />
        </div>
        {list.map((r) => (
          <div key={r.name} className="row" style={{ gap: 14, minHeight: 48, padding: '8px 16px', borderBottom: '1px solid var(--line)' }}>
            <span className="grow t15 ellipsis">{r.name}</span>
            <span style={{ display: 'flex', gap: 3, flexShrink: 0 }} aria-label={n(r.done) + '/' + n(total) + ' অধ্যায়'}>
              {tc.chapters.map((_, ci) => (
                <span key={ci} className="seg-cell" style={{ height: 4, background: ci <= r.done ? 'var(--brand)' : 'var(--line)', opacity: ci === r.done ? 0.4 : 1 }} />
              ))}
            </span>
            <span className="mono t12 ink2" style={{ width: 36, flexShrink: 0, textAlign: 'right' }}>{n(r.done)}/{n(total)}</span>
          </div>
        ))}
        {list.length === 0 ? <div className="t15 ink3" style={{ padding: '24px 16px', textAlign: 'center' }}>এই নামে কাউকে পাওয়া যায়নি</div> : null}
      </div>
      <div className="note-dashed" style={{ marginTop: 16 }}>{studentName(s)} এই তালিকায় আছে — student ভিউতে লেসন শেষ করলে এখানে অধ্যায় বদলাবে।</div>
    </Shell>
  );
}
