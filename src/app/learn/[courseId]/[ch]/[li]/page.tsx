'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChapterList } from '@/components/ChapterList';
import { NoteBlocks } from '@/components/NoteBlocks';
import { Penguin } from '@/components/Penguin';
import { Sheet, Shell } from '@/components/Shell';
import { askDoubt, completeLesson } from '@/lib/actions';
import { confusions, courses, defaultStudent } from '@/lib/data';
import { mmss, pad2, secs } from '@/lib/format';
import { doubtsFor, isLocked, lessonKey, step, studentLesson } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

type Tab = 'notes' | 'stuck' | 'quiz' | 'ask';
const TABS: [string, Tab][] = [['Notes', 'notes'], ['আটকে গেছি', 'stuck'], ['Quiz', 'quiz'], ['Q&A', 'ask']];
const SPEEDS = [0.75, 1, 1.25, 1.5];
const QUALITIES = ['auto', '720p', '480p', '360p'];
const WM_SPOTS: React.CSSProperties[] = [
  { top: 12, right: 14 }, { bottom: 44, right: 14 }, { bottom: 44, left: 14 }, { top: 12, left: 14 },
];

export default function LessonPage() {
  const p = useParams<{ courseId: string; ch: string; li: string }>();
  const router = useRouter();
  const { s, set, n, ready, showToast } = useStore();

  const cid = p.courseId as CourseId;
  const ci = Number(p.ch), li = Number(p.li);
  const course = courses[cid];
  const lessonMeta = course?.chapters[ci]?.lessons[li];

  const [tab, setTab] = useState<Tab>('notes');
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [wm, setWm] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [openCh, setOpenCh] = useState<number | null>(ci);
  const [stuckOpen, setStuckOpen] = useState<Record<number, boolean>>({});
  const [askText, setAskText] = useState('');

  const locked = !!lessonMeta && ready && isLocked(s, cid, ci, li);
  const dur = lessonMeta ? secs(lessonMeta.d) : 0;

  // Reset per-lesson view state when navigating between lessons.
  useEffect(() => {
    setTab('notes'); setPlaying(false); setT(0); setOpenCh(ci); setStuckOpen({}); setSheet(false);
  }, [cid, ci, li]);

  useEffect(() => {
    if (!ready || !lessonMeta) return;
    if (locked) { router.replace('/course/' + cid); return; }
    set((x) => (x.last.courseId === cid && x.last.ch === ci && x.last.li === li ? x : { ...x, last: { courseId: cid, ch: ci, li, t: 0 } }));
  }, [ready, locked, cid, ci, li, lessonMeta, router, set]);

  // Simulated playback clock; replace with the stream player's timeupdate events.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((v) => {
      const nv = Math.min(dur, v + speed);
      if (nv >= dur) setPlaying(false);
      return nv;
    }), 1000);
    return () => clearInterval(id);
  }, [playing, speed, dur]);

  // Watermark moves corner every 40s.
  useEffect(() => {
    const id = setInterval(() => setWm((v) => (v + 1) % 4), 40000);
    return () => clearInterval(id);
  }, []);

  if (!course || !lessonMeta) notFound();

  const content = studentLesson(s, cid, ci, li);
  const lk = lessonKey(cid, ci, li);
  const answers = s.practiceAns[lk] || {};
  const stuck = confusions[lk] || [];
  const batch = cid === 'cst' ? defaultStudent.batch : 'ENG-02-B07';
  const asks = doubtsFor(s, batch).filter((d) => d.course === cid && d.ch === ci && d.li === li);
  const isLast = !step(cid, ci, li, 1);

  const next = () => {
    const r = completeLesson(s, cid, ci, li);
    set(() => r.s);
    if (r.courseDone) { showToast('big'); return; }
    showToast('small');
    if (r.next) router.push(`/learn/${cid}/${r.next[0]}/${r.next[1]}`);
  };
  const prev = () => {
    const pv = step(cid, ci, li, -1);
    if (pv) router.push(`/learn/${cid}/${pv[0]}/${pv[1]}`);
  };
  const nextLabel = isLast ? 'Finish' : 'Next →';

  const spine = (variant: 'spine' | 'sheet') => (
    <ChapterList variant={variant} courseId={cid} open={openCh} current={[ci, li]}
      onToggle={(x) => setOpenCh(openCh === x ? null : x)} onOpenLesson={() => setSheet(false)} />
  );

  return (
    <Shell role="student" title="Lesson" back={'/course/' + cid} lessonMode
      topAction={<button className="btn btn-sm ml-auto" onClick={() => setSheet(true)}>Chapters</button>}
      lessonBar={
        <>
          <button className="btn" style={{ height: 44, padding: '0 14px' }} onClick={prev} aria-label="আগের লেসন">←</button>
          <button className="btn" style={{ height: 44 }} onClick={() => setSheet(true)}>Chapters</button>
          <button className="btn btn-primary grow" style={{ height: 44 }} onClick={next}>{nextLabel}</button>
        </>
      }
      aside={
        <aside className="spine" data-print="hide">
          <div className="t13 w500 ink2" style={{ padding: '0 20px 12px' }}>Chapters</div>
          {spine('spine')}
        </aside>
      }>
      <div className="video-wrap">
        <div data-print="hide" className="ph" style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 4, overflow: 'hidden' }}>
          <span className="mono" style={{ position: 'absolute', ...WM_SPOTS[wm], fontSize: 12, whiteSpace: 'nowrap', color: 'var(--ink)', opacity: 0.3 }}>{defaultStudent.masked}</span>
          <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'থামাও' : 'চালাও'}
            style={{ width: 56, height: 56, borderRadius: 9999, border: '1px solid var(--line-strong)', background: 'var(--surface)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{playing ? '❚❚' : '▶'}</button>
          <span className="mono ink2" style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, whiteSpace: 'nowrap' }}>bunny.net stream · {quality === 'auto' ? '720p' : quality}</span>
        </div>
        <div data-print="hide" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 0 0' }}>
          <button className="btn" style={{ width: 36, height: 36, padding: 0, fontSize: 12 }} onClick={() => setPlaying(!playing)} aria-label={playing ? 'থামাও' : 'চালাও'}>{playing ? '❚❚' : '▶'}</button>
          <button className="btn mono" style={{ height: 36, padding: '0 10px', fontSize: 12, fontWeight: 400 }} onClick={() => setT(Math.max(0, t - 10))}>−10s</button>
          <button className="btn mono" style={{ height: 36, padding: '0 10px', fontSize: 12, fontWeight: 400 }} onClick={() => setT(Math.min(dur, t + 10))}>+10s</button>
          <div role="slider" aria-label="ভিডিওর অবস্থান" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(t)} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') setT(Math.min(dur, t + 5)); if (e.key === 'ArrowLeft') setT(Math.max(0, t - 5)); }}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setT(Math.round(((e.clientX - r.left) / r.width) * dur)); }}
            style={{ flex: 1, minWidth: 120, height: 16, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div className="bar" style={{ width: '100%' }}><span style={{ width: Math.round((t / dur) * 100) + '%', transition: 'none' }} /></div>
          </div>
          <span className="mono t13 ink2 nowrap">{n(mmss(t))} / {n(mmss(dur))}</span>
          <button className="btn mono" style={{ height: 36, padding: '0 10px', fontSize: 12, fontWeight: 400 }} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % 4])}>{speed}x</button>
          <button className="btn mono" style={{ height: 36, padding: '0 10px', fontSize: 12, fontWeight: 400 }} onClick={() => setQuality(QUALITIES[(QUALITIES.indexOf(quality) + 1) % 4])}>{quality}</button>
          <button className="btn" style={{ width: 36, height: 36, padding: 0, fontSize: 13 }} aria-label="ফুল স্ক্রিন">⤢</button>
        </div>
      </div>

      <div className="kicker" style={{ marginTop: 20 }}>অধ্যায় {course.chapters[ci].n} · লেসন {lessonMeta.n}</div>
      <h1 className="h3" style={{ margin: '2px 0 16px' }}>{content.title}</h1>

      <div className="tabs" role="tablist" data-print="hide" style={{ marginBottom: 24 }}>
        {TABS.map(([label, id]) => (
          <button key={id} role="tab" className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
        <button className="btn btn-sm only-tight only-desktop" style={{ marginLeft: 'auto', alignSelf: 'center' }} onClick={() => setSheet(true)}>Chapters</button>
        <button className="btn btn-sm dl-btn" style={{ alignSelf: 'center' }} onClick={() => window.print()}>Download</button>
      </div>

      {tab === 'notes' ? <NoteBlocks blocks={content.blocks} /> : null}

      {tab === 'stuck' ? (
        <div style={{ maxWidth: '68ch' }}>
          {stuck.length ? (
            <>
              <div className="muted-p" style={{ marginBottom: 20 }}>এই লেসনে সবাই যেখানে আটকায় — আগেই লিখে রাখা। জিজ্ঞেস করার দরকার নেই।</div>
              <div className="stack">
                {stuck.map((c, i) => {
                  const open = !!stuckOpen[i];
                  return (
                    <div key={i}>
                      <button onClick={() => setStuckOpen({ ...stuckOpen, [i]: !open })} aria-expanded={open}
                        style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, minHeight: 56, padding: '14px 16px', border: 'none', background: 'var(--surface)', textAlign: 'left', whiteSpace: 'normal' }}>
                        <span style={{ width: 3, alignSelf: 'stretch', flexShrink: 0, background: open ? 'var(--margin)' : 'var(--line)' }} />
                        <span className="grow t15 w500" style={{ lineHeight: 1.7 }}>{c.q}</span>
                        <span className="t13 ink3" style={{ flexShrink: 0, lineHeight: 1.7 }}>{open ? '−' : '+'}</span>
                      </button>
                      {open ? <div className="read" style={{ padding: '0 16px 18px 31px' }}>{c.a}</div> : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="card empty">
              <Penguin size={72} />
              <div className="t17 w600">এই লেসনে এখনো কিছু জমা হয়নি</div>
              <div className="muted-p" style={{ maxWidth: '40ch' }}>যেখানে বেশি ছাত্র আটকায়, সেটা এখানে যোগ হয়। এখন পর্যন্ত এই লেসনে কেউ আটকায়নি।</div>
              <button className="btn" onClick={() => setTab('ask')}>প্রশ্ন করে দেখো</button>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'quiz' ? (
        content.quiz.length ? (
          <div>
            <div className="row" style={{ marginBottom: 16 }}>
              <div className="t13 w500 ink2">অনুশীলন · {n(Object.keys(answers).length)}/{n(content.quiz.length)} উত্তর দেওয়া</div>
              <button className="btn btn-xs ml-auto" style={{ fontWeight: 400 }} onClick={() => set((x) => ({ ...x, practiceAns: { ...x.practiceAns, [lk]: {} } }))}>আবার</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {content.quiz.map((q, qi) => {
                const pick = answers[qi];
                const answered = pick !== undefined;
                return (
                  <div key={qi} className="card card-pad">
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <span className="mono t13 ink3">{n(pad2(qi + 1))}</span>
                      <span className="t15">{q.stem}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.o.map((label, oi) => {
                        const right = oi === q.a, chosen = pick === oi, show = answered && (chosen || right);
                        return (
                          <button key={oi} disabled={answered}
                            onClick={() => set((x) => ({ ...x, practiceAns: { ...x.practiceAns, [lk]: { ...(x.practiceAns[lk] || {}), [qi]: oi } } }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '8px 14px', whiteSpace: 'normal', border: '1px solid ' + (show ? (right ? 'var(--brand)' : 'var(--margin)') : 'var(--line)'), borderRadius: 2, background: show ? (right ? 'var(--brand-soft)' : 'var(--margin-soft)') : 'var(--surface)', textAlign: 'left', fontSize: 15, color: 'var(--ink)' }}>
                            <span style={{ width: 20, flexShrink: 0, textAlign: 'center', color: right ? 'var(--brand)' : 'var(--margin)', fontSize: 14 }}>{show ? (right ? '✓' : '✗') : ''}</span>
                            <span className="grow">{label}</span>
                            <span className="t13 w500" style={{ color: right ? 'var(--brand)' : 'var(--margin)' }}>{show ? (right ? 'ঠিক' : chosen ? 'ভুল' : '') : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                    {answered && q.why ? <div className="t15 ink2" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>{q.why}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card empty">
            <Penguin size={72} />
            <div className="t17 w600">এই লেসনে এখনো কুইজ নেই</div>
            <div className="muted-p" style={{ maxWidth: '40ch' }}>শিক্ষক কুইজ যোগ করলে এখানে অনুশীলন করতে পারবে।</div>
          </div>
        )
      ) : null}

      {tab === 'ask' ? (
        <div style={{ maxWidth: '68ch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {asks.map((d) => (
              <div key={d.id} className="card" style={{ padding: 16 }}>
                <div className="t13 ink3" style={{ marginBottom: 4 }}>{d.mine ? 'তুমি' : d.who.split(' ')[0]} · {n(d.ago)}</div>
                <div className="t15">{d.q}</div>
                {d.reply ? (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <div className="t13 ink3" style={{ marginBottom: 4 }}>{d.by} · ইন্সট্রাক্টর</div>
                    <div className="t15">{d.reply}</div>
                  </div>
                ) : d.mine ? (
                  <div className="t13 ink3" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>উত্তরের অপেক্ষায় · সাধারণত ২৪ ঘণ্টার মধ্যে</div>
                ) : null}
              </div>
            ))}
          </div>
          <label htmlFor="ask" className="t13 w500 ink2" style={{ display: 'block', marginBottom: 6 }}>তোমার প্রশ্ন</label>
          <textarea id="ask" className="field field-sunk" style={{ minHeight: 88 }} value={askText} onChange={(e) => setAskText(e.target.value)} placeholder="যেটা বুঝোনি, লিখে ফেলো" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!askText.trim()}
            onClick={() => { const v = askText.trim(); if (!v) return; set((x) => askDoubt(x, cid, ci, li, v)); setAskText(''); }}>পাঠাও</button>
        </div>
      ) : null}

      <div className="only-desktop" data-print="hide" style={{ display: 'flex', gap: 12, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
        <button className="btn" onClick={prev}>← Prev</button>
        <button className="btn btn-primary ml-auto" onClick={next}>{nextLabel}</button>
      </div>

      {sheet ? <Sheet title="Chapters" onClose={() => setSheet(false)}>{spine('sheet')}</Sheet> : null}
    </Shell>
  );
}
