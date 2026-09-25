'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { ChapterList } from '@/components/ChapterList';
import { Shell } from '@/components/Shell';
import { courses, outcomeSets, testMeta, testQs } from '@/lib/data';
import { counts, frontier, isDone } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { s, n } = useStore();
  const valid = courseId in courses;
  const cid = (valid ? courseId : 'cst') as CourseId;
  const [open, setOpen] = useState<number | null>(() => frontier(s, cid)[0]);
  if (!valid) notFound();

  const course = courses[cid];
  const cnt = counts(s, cid);

  return (
    <Shell role="student" title={course.title} back="/">
      <div className="ph" style={{ height: 'var(--cover-h)', borderRadius: 4, marginBottom: 20 }}>course cover</div>
      <div className="kicker">{course.kicker}</div>
      <h1 className="h1" style={{ margin: '2px 0 10px' }}>{course.title}</h1>
      <div className="t13 ink2" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
        <span>{course.instructor}</span>
        <span className="ink3">·</span>
        <span>{course.meta}</span>
      </div>
      <div className="row" style={{ margin: '20px 0 32px' }}>
        <div className="bar grow"><span style={{ width: cnt.pct + '%' }} /></div>
        <span className="t13 ink2 nowrap">{n(cnt.pct)}% সম্পন্ন · {n(cnt.total)}টির মধ্যে {n(cnt.done)}টি লেসন</span>
      </div>

      <div className="section-label first">কোর্স শেষে তুমি পারবে</div>
      <div className="card card-pad" style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {outcomeSets[cid].map((o, i) => {
          const chap = course.chapters[o.ch];
          const done = !!chap && chap.lessons.every((_, li) => isDone(s, cid, o.ch, li));
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 16, flexShrink: 0, textAlign: 'center', fontSize: 14, lineHeight: 1.7, color: done ? 'var(--brand)' : 'var(--ink-3)' }}>{done ? '✓' : '–'}</span>
              <span className="grow t15" style={{ lineHeight: 1.7, color: done ? 'var(--ink)' : 'var(--ink-2)' }}>{o.t}</span>
              <span className="mono t12 ink3 nowrap" style={{ lineHeight: 1.7 }}>{chap ? 'অধ্যায় ' + chap.n : ''}</span>
            </div>
          );
        })}
      </div>

      <div className="section-label first">Chapters</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <ChapterList variant="course" courseId={cid} open={open} onToggle={(ci) => setOpen(open === ci ? null : ci)} />
      </div>

      {course.track === 'batch' ? (
        <div className="card row wrap" style={{ marginTop: 16, padding: 16 }}>
          <div>
            <div className="t17 w600">{testMeta.name}</div>
            <div className="t12 ink3">{n(testQs.length)} প্রশ্ন · {n(testMeta.seconds / 60)} মিনিট · অধ্যায় ০১–০৬</div>
          </div>
          <Link href="/test" className="btn btn-primary ml-auto">Start</Link>
        </div>
      ) : null}
    </Shell>
  );
}
