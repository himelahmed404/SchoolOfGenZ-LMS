'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { createLesson, newLessonKey } from '@/lib/actions';
import { batches, courses, teacher } from '@/lib/data';
import { pad2 } from '@/lib/format';
import { editorHref, item, itemKeys, statusOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function ContentPage() {
  const { s, set, n } = useStore();
  const router = useRouter();
  const tCid = batches[teacher.batch].course;
  const tc = courses[tCid];
  const [openCh, setOpenCh] = useState<number | null>(tc.chapters.length - 1);

  const keys = itemKeys(s);
  let revN = 0, draftN = 0, retN = 0;
  keys.filter((k) => k.startsWith(tCid + '|')).forEach((k) => {
    const st = item(s, k).status;
    if (st === 'review') revN++;
    if (st === 'draft') draftN++;
    if (st === 'returned') retN++;
  });
  const parts: string[] = [];
  if (retN) parts.push(n(retN) + 'টি ফেরত');
  if (revN) parts.push(n(revN) + 'টি অপেক্ষায়');
  if (draftN) parts.push(n(draftN) + 'টি খসড়া');

  const newLesson = () => {
    const ci = openCh !== null && openCh < tc.chapters.length ? openCh : tc.chapters.length - 1;
    const k = newLessonKey(tCid, ci);
    set((x) => createLesson(x, k));
    router.push(editorHref(k));
  };

  return (
    <Shell role="teacher" title="Content">
      <div className="strip">
        <span className="t13 ink2">{tc.title}</span>
        <span className="ml-auto t13 w500 nowrap" style={{ color: retN ? 'var(--margin)' : 'var(--ink-2)' }}>{parts.join(' · ') || 'সব প্রকাশিত'}</span>
      </div>
      <h1 className="d1" style={{ marginBottom: 6 }}>Content</h1>
      <div className="muted-p" style={{ marginBottom: 28 }}>নতুন বা বদলানো লেসন অ্যাডমিন অনুমোদন করলে তবেই ছাত্ররা দেখবে।</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="t13 w500 ink2">Chapters</div>
        <button className="btn btn-sm ml-auto" style={{ padding: '0 14px', fontWeight: 500 }} onClick={newLesson}>+ New Lesson</button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {tc.chapters.map((ch, ci) => {
          const ks: [string, string][] = ch.lessons.map((l, li) => [tCid + '|lesson:' + ci + ':' + li, l.n] as [string, string])
            .concat(keys.filter((k) => k.startsWith(tCid + '|new:' + ci + ':')).map((k, j) => [k, n(pad2(ch.lessons.length + j + 1))] as [string, string]));
          const rows = ks.map(([k, num]) => ({ k, num, it: item(s, k) }));
          const pend = rows.filter((r) => r.it.status !== 'published').length;
          const open = openCh === ci;
          return (
            <div key={ci} style={{ borderBottom: ci === tc.chapters.length - 1 ? 'none' : '1px solid var(--line)' }}>
              <button onClick={() => setOpenCh(open ? null : ci)} aria-expanded={open}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: 'none', background: 'var(--surface)', color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
                <span className="mono t13 ink3" style={{ flexShrink: 0 }}>{ch.n}</span>
                <span className="grow t17 w600" style={{ lineHeight: 1.5 }}>{ch.name}</span>
                <span className="t12 nowrap" style={{ color: pend ? 'var(--warn)' : 'var(--ink-3)' }}>{n(ks.length)} লেসন{pend ? ' · ' + n(pend) + 'টি অপ্রকাশিত' : ''}</span>
              </button>
              {open ? (
                <div style={{ padding: '0 16px 8px 48px', display: 'flex', flexDirection: 'column' }}>
                  {rows.map(({ k, num, it }) => {
                    const [label, color] = statusOf(it);
                    return (
                      <button key={k} onClick={() => router.push(editorHref(k))}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '8px 8px 8px 0', border: 'none', borderTop: '1px solid var(--line)', background: 'none', color: 'var(--ink)', textAlign: 'left' }}>
                        <span className="mono t12 ink3" style={{ flexShrink: 0 }}>{num}</span>
                        <span className="grow t15 ellipsis">{it.title || 'নাম দেওয়া হয়নি'}</span>
                        <span className="t12 w500" style={{ flexShrink: 0, color }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
