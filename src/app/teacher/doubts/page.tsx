'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { teacher } from '@/lib/data';
import { ago } from '@/lib/format';
import { doubtsFor, editorHref } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function DoubtsPage() {
  const { s, set } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const doubts = doubtsFor(s, teacher.course, teacher.batch);
  // Open questions: longest-waiting first. A question is late after 24 hours.
  const isLate = (min: number) => min >= 24 * 60;
  const openL = doubts.filter((d) => !d.reply).sort((a, b) => b.agoMin - a.agoMin);
  const doneL = doubts.filter((d) => !!d.reply).sort((a, b) => a.agoMin - b.agoMin);
  const lateN = openL.filter((d) => isLate(d.agoMin)).length;
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
        <span className="t13 ink3">Reply within 24 h</span>
        <span className="ml-auto t13 w500 nowrap" style={{ color: lateN ? 'var(--margin)' : 'var(--ink-2)' }}>
          {lateN ? lateN + ' past 24 h' : openL.length ? 'All on time' : 'Nothing waiting'}
        </span>
      </div>
      <h1 className="d1" style={{ marginBottom: 16 }}>Student Doubts</h1>
      <div className="seg" role="tablist" style={{ display: 'inline-flex', marginBottom: 20 }}>
        {([['Open', 'open', openL.length], ['Answered', 'done', doneL.length]] as const).map(([label, id, count]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setOpenId(null); }}
            style={{ padding: '0 16px', fontSize: 14, fontWeight: tab === id ? 600 : 500 }}>{label} {count}</button>
        ))}
      </div>

      {list.length ? (
        <div className="stack">
          {list.map((d) => {
            const late = !d.reply && isLate(d.agoMin), open = openId === d.id, draft = drafts[d.id] || '';
            const where = s.catalog.courses[d.course].chapters[d.ch].lessons[d.li].t;
            return (
              <div key={d.id}>
                <button onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', border: 'none', background: 'var(--surface)', color: 'var(--ink)', textAlign: 'left', whiteSpace: 'normal' }}>
                  <span style={{ width: 3, alignSelf: 'stretch', flexShrink: 0, background: late ? 'var(--margin)' : open ? 'var(--brand)' : 'var(--line)' }} />
                  <span className="grow">
                    <span className="t12 ink3" style={{ display: 'block' }}>{d.who} · {where}</span>
                    <span className="t15 w500" style={{ display: 'block', lineHeight: 1.7 }}>{d.q}</span>
                  </span>
                  <span className="t12 nowrap" style={{ flexShrink: 0, lineHeight: 1.7, color: late ? 'var(--margin)' : 'var(--ink-3)' }}>{ago(d.agoMin)}</span>
                </button>
                {open ? (
                  <div style={{ padding: '0 16px 16px 31px' }}>
                    {d.reply ? (
                      <div style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                        <div className="t13 ink3" style={{ marginBottom: 4 }}>{d.by} · {ago(d.replyAgoMin ?? 0)}</div>
                        <div className="t15" style={{ lineHeight: 1.8 }}>{d.reply}</div>
                      </div>
                    ) : (
                      <div>
                        <textarea value={draft} placeholder="উত্তর লেখো" aria-label="Reply" onChange={(e) => setDrafts({ ...drafts, [d.id]: e.target.value })}
                          style={{ width: '100%', minHeight: 96, padding: '12px 14px', border: '1px solid var(--field-line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 16, resize: 'vertical' }} />
                        <div className="row wrap" style={{ gap: '8px 12px', marginTop: 10 }}>
                          <button onClick={() => router.push(editorHref(d.course + '|lesson:' + d.ch + ':' + d.li))}
                            style={{ height: 36, padding: 0, border: 'none', background: 'none', color: 'var(--brand)', fontSize: 13, fontWeight: 500 }}>Open Lesson</button>
                          <span className="t12 ink3">লেসনের Q&A ট্যাবে ব্যাচের সবাই দেখবে</span>
                          <button className="btn btn-primary ml-auto" style={{ padding: '0 18px', fontWeight: 500 }} disabled={!draft.trim()} onClick={() => send(d.id)}>Send Reply</button>
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
          <div style={{ fontSize: 17, fontWeight: 600 }}>{tab === 'open' ? (doubts.length ? 'সব প্রশ্নের উত্তর দেওয়া হয়েছে' : 'এখনো কোনো প্রশ্ন আসেনি') : 'এখনো কোনো উত্তর দাওনি'}</div>
          <div className="muted-p" style={{ maxWidth: '40ch' }}>{tab === 'open' ? 'ছাত্ররা লেসনের প্রশ্ন ট্যাব থেকে জিজ্ঞেস করলে এখানে আসবে।' : 'উত্তর দিলে এখানে জমা থাকবে।'}</div>
        </div>
      )}
    </Shell>
  );
}
