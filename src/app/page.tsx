'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CourseCard } from '@/components/CourseCard';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { chooseProgram } from '@/lib/actions';
import { boardExam, streakSeed } from '@/lib/data';
import { dateEn, daysTo, mmss, ordinalEn, pad2, plural, secs, taka } from '@/lib/format';
import { batchLine, boardRows, chapterTest, counts, courseKicker, examISO, lessonRef, myBatch, myCourses, nextOpenTest, offers, programName, studentName, testFacts, weekDots } from '@/lib/selectors';
import { useStore } from '@/lib/store';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'শুভ রাত্রি';
  if (h < 12) return 'শুভ সকাল';
  if (h < 16) return 'শুভ দুপুর';
  if (h < 18) return 'শুভ বিকেল';
  if (h < 21) return 'শুভ সন্ধ্যা';
  return 'শুভ রাত্রি';
}

export default function Dashboard() {
  const { s, set, ready } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !s.prefs.setupDone) router.replace('/setup');
  }, [ready, s.prefs.setupDone, router]);

  const { courseId, ch, li, t } = s.last;
  const course = s.catalog.courses[courseId];
  const lesson = course.chapters[ch].lessons[li];
  const lessonHref = `/learn/${courseId}/${ch}/${li}`;
  const coursePct = counts(s, courseId).pct;
  const minsLeft = Math.max(1, Math.round((secs(lesson.d) - t) / 60));

  const iso = examISO(s);
  const days = daysTo(iso);
  const urgent = days <= 21;

  // The rank and the live class belong to a diploma batch; a student with only single courses has neither.
  const batch = myBatch(s);
  const all = batch ? boardRows(s, batch.id, false) : [];
  const me = all.find((r) => r.live);
  // The course being resumed first, then the rest in order.
  const mine = [course].concat(myCourses(s).filter((c) => c.id !== courseId)).slice(0, 4);
  const offer = offers(s)[0];
  const dots = weekDots();
  // A finished chapter whose optional test is still untaken.
  const openCh = nextOpenTest(s, courseId);
  const openTest = openCh === null ? null : chapterTest(s, courseId, openCh);
  const hasTest = openCh !== null && !!openTest;

  return (
    <Shell role="student" title="Home">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-2)' }}>{greeting()},</div>
            <h1 className="disp" style={{ margin: '2px 0 0', fontSize: 'var(--d1)', lineHeight: 1.25, fontWeight: 800 }}>
              <span className="hl">{studentName(s)}</span>
            </h1>
          </div>
          <Link href="/profile" title="Open the streak calendar" className="tap hover-line"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px 10px 10px', border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', boxShadow: 'var(--lift)' }}>
            <span className="tile" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--sun)', color: '#D23B45' }}><Icon name="local_fire_department" size={26} fill /></span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="disp" style={{ fontSize: 19, fontWeight: 800 }}>{plural(streakSeed.current, 'day')}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>current streak</span>
            </span>
            <span style={{ display: 'flex', gap: 5, paddingLeft: 12, borderLeft: '1px solid var(--line)' }}>
              {dots.map((w) => (
                <span key={w.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 10, lineHeight: 1, color: 'var(--ink-3)' }}>{w.d}</span>
                  <span className="tile" style={{ width: 16, height: 16, borderRadius: 999, background: w.studied ? 'var(--sun)' : 'transparent', border: '2px solid ' + (w.today ? 'var(--brand)' : w.studied ? 'var(--sun)' : 'var(--line-strong)'), color: 'var(--on-sun)' }}>
                    <Icon name="check" size={11} style={{ fontWeight: 700, opacity: w.studied ? 1 : 0 }} />
                  </span>
                </span>
              ))}
            </span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'var(--hero-cols)', gap: 16 }}>
          <div className="hero" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <Icon name="history" size={18} />Resume · {lessonRef(ch, li)}
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <Link href={lessonHref} aria-label="Continue" className="tile"
                style={{ position: 'relative', width: 'var(--thumb-w)', aspectRatio: '16/10', borderRadius: 16, background: 'rgba(255,255,255,0.14)' }}>
                <span className="tile" style={{ width: 44, height: 44, borderRadius: 999, background: '#FFFFFF', color: 'var(--hero)' }}><Icon name="play_arrow" size={28} fill /></span>
                <span className="mono" style={{ position: 'absolute', left: 8, bottom: 8, padding: '1px 6px', borderRadius: 6, background: 'rgba(12,16,32,0.55)', color: '#FFFFFF', fontSize: 11, fontWeight: 600 }}>{mmss(t).replace(/^0/, '')}</span>
              </Link>
              <div style={{ minWidth: 0 }}>
                <div className="disp" style={{ fontSize: 'var(--d2)', lineHeight: 1.3, fontWeight: 700 }}>{lesson.t}</div>
                <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{courseKicker(s, course)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>
                <div style={{ height: 8, borderRadius: 999, width: coursePct + '%', background: 'var(--sun)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{coursePct}% complete</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Link href={lessonHref} className="btn btn-white" style={{ padding: '0 22px', gap: 8 }}>Continue<Icon name="arrow_forward" size={20} /></Link>
              <span style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.85, whiteSpace: 'nowrap' }}>{minsLeft} min left</span>
            </div>
          </div>

          <div className="exam-tile" style={{ minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 12, padding: 'var(--hero-pad)', borderRadius: 24, background: urgent ? '#D23B45' : 'var(--sun)', color: urgent ? '#FFFFFF' : 'var(--on-sun)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
                <Icon name="event" size={18} /><span>{boardExam.name}</span>
              </div>
              <div style={{ marginTop: 2, fontSize: 13 }}>{dateEn(iso)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="disp" style={{ fontSize: 'var(--exam-num)', lineHeight: 0.95, fontWeight: 800 }}>{Math.max(0, days)}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{days > 1 ? 'days left' : days === 1 ? 'day left' : days === 0 ? 'Exam today' : 'Exam over'}</span>
            </div>
          </div>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecHead title="My Courses" href="/courses" />
          <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 16 }}>
            {mine.map((c) => <CourseCard key={c.id} id={c.id} />)}
          </div>
        </section>

        {offer ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SecHead title="New Course" href="/explore" />
          <Link href="/enroll" onClick={() => set((x) => chooseProgram(x, offer.program.id))} className="card tap" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px' }}>
            <span className="tile disp" style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--sun)', color: 'var(--on-sun)', fontSize: 18, fontWeight: 800 }}>{offer.program.code}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="disp" style={{ display: 'block', fontSize: 17, lineHeight: 1.3, fontWeight: 700 }}>{programName(s, offer.program, 'bn')}</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{(offer.batch ? batchLine(offer.batch) : 'Skill course') + ' · ' + taka(offer.program.price)}</span>
            </span>
            <span style={{ flexShrink: 0, height: 36, display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--on-brand-soft)', fontSize: 13, fontWeight: 700 }}>
              Enroll<Icon name="arrow_forward" size={18} />
            </span>
          </Link>
        </section>
        ) : null}

        {hasTest || batch ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="sec-h">This Week</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {hasTest ? (
              <WeekRow badge={pad2(openCh + 1)} big tone={['var(--brand-soft)', 'var(--on-brand-soft)']} title={'Chapter ' + pad2(openCh + 1) + ' test'} sub={testFacts(openTest) + ' · optional'} last={!batch}
                action={<Link href={`/test/${courseId}/${openCh}`} className="btn btn-primary btn-sm" style={{ padding: '0 16px' }}>Take test</Link>} />
            ) : null}
            {batch ? (
              <WeekRow badge="Mon" tone={['var(--accent-2-soft)', 'var(--accent-2)']} title="Live Class" sub="7:00 PM" last={!me}
                action={<button className="btn btn-sm" disabled title="The link appears before class">Link</button>} />
            ) : null}
            {me ? (
              <WeekRow badge={String(me.rank)} big tone={['var(--sun)', 'var(--on-sun)']} title="Batch Rank" sub={ordinalEn(me.rank) + ' of ' + all.length} last
                action={<Link href="/leaderboard" className="btn btn-sm">View</Link>} />
            ) : null}
          </div>
        </section>
        ) : null}
      </div>
    </Shell>
  );
}

/** Section heading with a link to the full list. */
function SecHead({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <h2 className="sec-h">{title}</h2>
      <Link href={href} style={{ marginLeft: 'auto', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600 }}>See all<Icon name="chevron_right" size={18} /></Link>
    </div>
  );
}

function WeekRow({ badge, tone, big, title, sub, action, last }: { badge: string; tone: [string, string]; big?: boolean; title: string; sub: string; action: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className={'tile' + (big ? ' disp' : '')} style={{ width: 48, height: 48, borderRadius: 14, background: tone[0], color: tone[1], fontSize: big ? 20 : 14, fontWeight: big ? 800 : 700 }}>{badge}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}
