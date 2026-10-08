'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { ChapterList } from '@/components/ChapterList';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { courses, outcomeSets, testMeta, testQs } from '@/lib/data';
import { counts, frontier, isDone } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

const HERO_BG: Record<CourseId, string> = { cst: 'var(--hero)', eng: '#C2357A' };

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { s, n } = useStore();
  const valid = courseId in courses;
  const cid = (valid ? courseId : 'cst') as CourseId;
  // The resume lesson's chapter opens first; for other courses, the first unfinished chapter.
  const current: [number, number] | undefined = s.last.courseId === cid ? [s.last.ch, s.last.li] : undefined;
  const [open, setOpen] = useState<number | null>(() => (current ? current[0] : frontier(s, cid)[0]));
  if (!valid) notFound();

  const course = courses[cid];
  const cnt = counts(s, cid);

  return (
    <Shell role="student" title={course.title} back="/">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div className="hero" style={{ ['--hero-bg' as string]: HERO_BG[cid], color: '#FFFFFF', display: 'grid', gridTemplateColumns: 'var(--course-hero-cols)', gap: 20, alignItems: 'center' }}>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{course.kicker}</div>
            <h1 className="d1">{course.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, opacity: 0.9 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="person" size={18} />{course.instructor}</span>
              <span>{course.meta}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>
                <div style={{ height: 8, borderRadius: 999, width: cnt.pct + '%', background: 'var(--sun)', transition: 'width 400ms var(--ease)' }} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{n(cnt.pct)}% সম্পন্ন · {n(cnt.total)}টির মধ্যে {n(cnt.done)}টি লেসন</div>
          </div>
          <div className="only-desktop mono tile" style={{ aspectRatio: '4/3', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.45)', background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 8px, rgba(255,255,255,0.03) 8px 16px)', fontSize: 11 }}>course cover</div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">কোর্স শেষে তুমি পারবে</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
            {outcomeSets[cid].map((o, i) => {
              const chap = course.chapters[o.ch];
              const done = !!chap && chap.lessons.every((_, li) => isDone(s, cid, o.ch, li));
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 10 }}>
                  <Icon name={done ? 'check_circle' : 'radio_button_unchecked'} fill={done} style={{ color: done ? 'var(--ok)' : 'var(--ink-3)', marginTop: 2 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.6, color: done ? 'var(--ink)' : 'var(--ink-2)' }}>{o.t}</span>
                  {chap ? <span style={{ flexShrink: 0, padding: '1px 9px', borderRadius: 999, background: 'var(--surface-sunk)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>অধ্যায় {chap.n}</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="sec-h">Chapters</h2>
          <ChapterList variant="course" courseId={cid} open={open} current={current} onToggle={(ci) => setOpen(open === ci ? null : ci)} />
        </section>

        {course.track === 'batch' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '18px 20px', borderRadius: 20, background: 'var(--sun)', color: 'var(--on-sun)' }}>
            <span className="tile" style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(19,26,51,0.08)' }}><Icon name="timer" size={26} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="disp" style={{ fontSize: 19, lineHeight: 1.3, fontWeight: 700 }}>{testMeta.name}</div>
              <div style={{ fontSize: 13 }}>{n(testQs.length)} প্রশ্ন · {n(testMeta.seconds / 60)} মিনিট · অধ্যায় ০১–০৬</div>
            </div>
            <Link href="/test" className="btn" style={{ border: 'none', padding: '0 24px', background: '#131A33', color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>Start</Link>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
