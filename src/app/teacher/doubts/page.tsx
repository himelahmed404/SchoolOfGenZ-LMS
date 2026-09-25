'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { courses, teacher } from '@/lib/data';
import { doubtsFor, editorHref } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function DoubtsPage() {
  const { s, set, n } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const doubts = doubtsFor(s, teacher.batch);
  const openL = doubts.filter((d) => !d.reply).sort((a, b) => b.h - a.h);
  const doneL = doubts.filter((d) => !!d.reply).sort((a, b) => a.h - b.h);
  const lateN = openL.filter((d) => d.h >= 24).length;
  const list = tab === 'open' ? openL : doneL;

  const send = (id: string) => {
    const text = (drafts[id] || '').trim();
    if (!text) return;
    set((x) => ({ ...x, replies: { ...x.replies, [id]: { text, by: teacher.name } } }));
    const d = { ...drafts }; delete d[id]; setDrafts(d);
    setOpenId(null);
  };

  return (
    <Shell role="teacher" title="Doubts">
      <div className="strip">
        <span className="mono t13 ink2">{teacher.batch}</span>
        <span className="t13 ink3">·</span>
        <span className="t13 ink3">উত্তর দেওয়ার সময় ২৪ ঘণ্টা</span>
        <span className="ml-auto t13 w500 nowrap" style={{ color: lateN ? 'var(--margin)' : 'var(--ink-2)' }}>
          {lateN ? n(lateN) + 'টি ' + n(24) + ' ঘণ্টা পেরিয়েছে' : openL.length ? 'সব সময়ের মধ্যে' : 'কোনো প্রশ্ন বাকি নেই'}
        </span>
      </div>
      <h1 className="h1" style={{ marginBottom: 16 }}>Student Doubts</h1>
      <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
        <button role="tab" className="tab" aria-selected={tab === 'open'} onClick={() => { setTab('open'); setOpenId(null); }}>উত্তর বাকি {n(openL.length)}</button>
        <button role="tab" className="tab" aria-selected={tab === 'done'} onClick={() => { setTab('done'); setOpenId(null); }}>উত্তর দেওয়া {n(doneL.length)}</button>
      </div>

      {list.length ? (
        <div className="stack">
          {list.map((d) => {
            const late = !d.reply && d.h >= 24, open = openId === d.id, draft = drafts[d.id] || '';
            const where = courses[d.course].chapters[d.ch].lessons[d.li].t;
            return (
              <div key={d.id}>
                <button onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: 'none', background: 'var(--surface)', textAlign: 'left', whiteSpace: 'normal' }}>
                  <span style={{ width: 3, alignSelf: 'stretch', flexShrink: 0, background: late ? 'var(--margin)' : open ? 'var(--brand)' : 'var(--line)' }} />
                  <span className="grow">
                    <span className="t12 ink3" style={{ display: 'block' }}>{d.who} · {where}</span>
                    <span className="t15 w500" style={{ display: 'block', lineHeight: 1.7 }}>{d.q}</span>
                  </span>
                  <span className="t12 nowrap" style={{ flexShrink: 0, lineHeight: 1.7, color: late ? 'var(--margin)' : 'var(--ink-3)' }}>{n(d.ago)}</span>
                </button>
                {open ? (
                  <div style={{ padding: '0 16px 16px 31px' }}>
                    {d.reply ? (
                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                        <div className="t13 ink3" style={{ marginBottom: 4 }}>{d.by} · {n(d.replyAgo || '')}</div>
                        <div className="t15" style={{ lineHeight: 1.8 }}>{d.reply}</div>
                      </div>
                    ) : (
                      <div>
                        <textarea className="field field-sunk" style={{ minHeight: 96 }} value={draft} placeholder="উত্তর লেখো" aria-label="উত্তর"
                          onChange={(e) => setDrafts({ ...drafts, [d.id]: e.target.value })} />
                        <div className="row wrap" style={{ gap: '8px 12px', marginTop: 10 }}>
                          <button className="btn btn-link t13" style={{ height: 36, padding: 0 }} onClick={() => router.push(editorHref(d.course + '|lesson:' + d.ch + ':' + d.li))}>লেসনটা খোলো</button>
                          <span className="t12 ink3">লেসনের প্রশ্ন ট্যাবে ব্যাচের সবাই দেখবে</span>
                          <button className="btn btn-primary ml-auto" style={{ padding: '0 18px' }} disabled={!draft.trim()} onClick={() => send(d.id)}>উত্তর পাঠাও</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          <Penguin size={72} />
          <div className="t17 w600">{tab === 'open' ? (doubts.length ? 'সব প্রশ্নের উত্তর দেওয়া হয়েছে' : 'এখনো কোনো প্রশ্ন আসেনি') : 'এখনো কোনো উত্তর দাওনি'}</div>
          <div className="muted-p" style={{ maxWidth: '40ch' }}>{tab === 'open' ? 'ছাত্ররা লেসনের প্রশ্ন ট্যাব থেকে জিজ্ঞেস করলে এখানে আসবে।' : 'উত্তর দিলে এখানে জমা থাকবে।'}</div>
        </div>
      )}
    </Shell>
  );
}
