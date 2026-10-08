'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { courses } from '@/lib/data';
import { ago } from '@/lib/format';
import { lessonRef, myQuestions } from '@/lib/selectors';
import { useStore } from '@/lib/store';

type Filter = 'all' | 'waiting' | 'answered';

/** Every question the student asked in a lesson's Q&A tab, with the teacher's reply. */
export default function MyQuestionsPage() {
  const { s } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const all = myQuestions(s);
  const waiting = all.filter((d) => !d.reply).length;
  const list = all.filter((d) => (filter === 'all' ? true : filter === 'waiting' ? !d.reply : !!d.reply));
  const resume = `/learn/${s.last.courseId}/${s.last.ch}/${s.last.li}?tab=ask`;

  return (
    <Shell role="student" title="My Questions">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead title="My Questions" sub="লেসনের Q&A ট্যাবে যা জিজ্ঞেস করেছ, আর শিক্ষকের উত্তর — সব এক জায়গায়।"
          action={all.length ? (
            <div className="seg" role="group" aria-label="Status">
              <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {all.length}</button>
              <button aria-pressed={filter === 'waiting'} onClick={() => setFilter('waiting')}>Waiting {waiting}</button>
              <button aria-pressed={filter === 'answered'} onClick={() => setFilter('answered')}>Answered {all.length - waiting}</button>
            </div>
          ) : null} />

        {all.length === 0 ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '44px 24px', textAlign: 'center' }}>
            <Penguin size={84} />
            <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>এখনো কোনো প্রশ্ন করোনি</div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink-2)', maxWidth: '40ch' }}>কোনো লেসন না বুঝলে তার Q&A ট্যাবে লিখে ফেলো। শিক্ষক সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দেন।</div>
            <Link href={resume} className="btn btn-primary">প্রশ্ন করো</Link>
          </div>
        ) : null}

        {list.map((d) => {
          const lesson = courses[d.course].chapters[d.ch].lessons[d.li];
          return (
            <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{courses[d.course].code} · {lessonRef(d.ch, d.li)}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ago(d.agoMin)}</span>
                <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 999, background: d.reply ? 'var(--ok-soft)' : 'var(--warn-soft)', color: d.reply ? 'var(--ok)' : 'var(--warn)', fontSize: 12, fontWeight: 700 }}>{d.reply ? 'Answered' : 'Waiting'}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{lesson.t}</div>
              <div style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}>{d.q}</div>
              {d.reply ? (
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--brand-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4, fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>
                    <Icon name="verified" size={18} fill />{d.by} · Instructor
                    <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{ago(d.replyAgoMin ?? 0)}</span>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.7 }}>{d.reply}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="schedule" size={18} />উত্তরের অপেক্ষায় · সাধারণত ২৪ ঘণ্টার মধ্যে</div>
              )}
              <div><Link href={`/learn/${d.course}/${d.ch}/${d.li}?tab=ask`} className="btn btn-sm">Open lesson<Icon name="arrow_forward" size={18} /></Link></div>
            </div>
          );
        })}
        {all.length > 0 && list.length === 0 ? <div className="card" style={{ padding: '28px 20px', textAlign: 'center', fontSize: 15, color: 'var(--ink-2)' }}>এই তালিকায় কিছু নেই।</div> : null}
      </div>
    </Shell>
  );
}
