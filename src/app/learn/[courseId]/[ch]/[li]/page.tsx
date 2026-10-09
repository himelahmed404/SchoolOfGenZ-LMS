'use client';

import Link from 'next/link';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChapterList } from '@/components/ChapterList';
import { NoteBlocks } from '@/components/NoteBlocks';
import { Penguin } from '@/components/Penguin';
import { Sheet, Shell } from '@/components/Shell';
import { Icon, initial } from '@/components/ui';
import { askDoubt, completeLesson, savePosition, setMyNote, toggleBookmark } from '@/lib/actions';
import { confusions, defaultStudent } from '@/lib/data';
import { ago, mmss, pad2, plural, secs } from '@/lib/format';
import { batchOf, chapterTest, doubtsFor, isLocked, isSingle, lessonKey, lessonRef, step, studentLesson, testFacts, testStatus, watermarkOn } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { CourseId } from '@/lib/types';

type Tab = 'notes' | 'stuck' | 'quiz' | 'ask' | 'mine';
const TABS: [string, Tab][] = [['Notes', 'notes'], ['Stuck?', 'stuck'], ['Quiz', 'quiz'], ['Q&A', 'ask'], ['My Note', 'mine']];
const isTab = (v: string | null): v is Tab => !!v && TABS.some((x) => x[1] === v);
const SPEEDS = [0.75, 1, 1.25, 1.5];
const QUALITIES = ['auto', '720p', '480p', '360p'];
const WM_SPOTS: React.CSSProperties[] = [
  { top: 12, right: 14 }, { bottom: 44, right: 14 }, { bottom: 44, left: 14 }, { top: 12, left: 14 },
];
const LETTERS = 'কখগঘ';

export default function LessonPage() {
  const p = useParams<{ courseId: string; ch: string; li: string }>();
  const router = useRouter();
  const { s, ready } = useStore();

  const cid = p.courseId as CourseId;
  const ci = Number(p.ch), li = Number(p.li);
  const exists = !!s.catalog.courses[cid]?.chapters[ci]?.lessons[li];
  const locked = exists && ready && isLocked(s, cid, ci, li);

  useEffect(() => { if (locked) router.replace('/course/' + cid); }, [locked, cid, router]);

  if (!exists) notFound();
  // The lesson starts from saved state (the resume position), so it waits for the store.
  if (!ready || locked) return <Shell role="student" title="Lesson" back={'/course/' + cid} lessonMode>{null}</Shell>;
  // Keyed by lesson, so moving to another lesson starts with fresh view state.
  return <Lesson key={cid + ':' + ci + ':' + li} cid={cid} ci={ci} li={li} />;
}

function Lesson({ cid, ci, li }: { cid: CourseId; ci: number; li: number }) {
  const query = useSearchParams();
  const router = useRouter();
  const { s, set, showToast } = useStore();

  const course = s.catalog.courses[cid];
  const lessonMeta = course.chapters[ci].lessons[li];
  // A single course has projects, not quizzes, so it has no Quiz tab.
  const tabs = isSingle(s, cid) ? TABS.filter((x) => x[1] !== 'quiz') : TABS;
  const dur = secs(lessonMeta.d);

  const [tab, setTab] = useState<Tab>(() => { const q = query.get('tab'); return isTab(q) && tabs.some((x) => x[1] === q) ? q : 'notes'; });
  const [playing, setPlaying] = useState(false);
  // Resume where "Continue" left off.
  const [t, setT] = useState(() => { const l = s.last; return l.courseId === cid && l.ch === ci && l.li === li ? Math.min(l.t, dur) : 0; });
  const tRef = useRef(t);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [wm, setWm] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [openCh, setOpenCh] = useState<number | null>(ci);
  const [stuckOpen, setStuckOpen] = useState<Record<number, boolean>>({});
  const [askText, setAskText] = useState('');
  /** Set when the last lesson of a chapter was just finished and its test has not been taken. */
  const [chapterEnd, setChapterEnd] = useState<{ next: [number, number] | null; courseDone: boolean } | null>(null);

  useEffect(() => { tRef.current = t; }, [t]);

  // Opening a lesson makes it the resume point; leaving it remembers the position.
  useEffect(() => {
    set((x) => (x.last.courseId === cid && x.last.ch === ci && x.last.li === li ? x : { ...x, last: { courseId: cid, ch: ci, li, t: 0 } }));
    return () => { const v = tRef.current; set((x) => savePosition(x, cid, ci, li, v)); };
  }, [cid, ci, li, set]);

  useEffect(() => {
    if (!playing) set((x) => savePosition(x, cid, ci, li, tRef.current));
  }, [playing, cid, ci, li, set]);

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

  const content = studentLesson(s, cid, ci, li);
  const lk = lessonKey(cid, ci, li);
  const answers = s.practiceAns[lk] || {};
  const stuck = confusions[lk] || [];
  const asks = doubtsFor(s, cid, batchOf(s, cid)?.id).filter((d) => d.ch === ci && d.li === li);
  const isLast = !step(s, cid, ci, li, 1);
  const bm = !!s.bookmarks[lk];
  const note = s.myNotes[lk] || '';
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;
  const pct = dur ? Math.round((t / dur) * 100) : 0;

  const moveOn = (nx: [number, number] | null, courseDone: boolean) => {
    if (courseDone) { showToast('big'); return; }
    showToast('small');
    if (nx) router.push(`/learn/${cid}/${nx[0]}/${nx[1]}`);
  };
  const next = () => {
    const r = completeLesson(s, cid, ci, li);
    set(() => r.s);
    // Finishing a chapter offers its test first. The test is optional and never blocks the next chapter.
    const endsChapter = !r.next || r.next[0] !== ci;
    if (endsChapter && testStatus(r.s, cid, ci) === 'ready') { setChapterEnd({ next: r.next, courseDone: r.courseDone }); return; }
    moveOn(r.next, r.courseDone);
  };
  const test = chapterTest(s, cid, ci);
  const prev = () => {
    const pv = step(s, cid, ci, li, -1);
    if (pv) router.push(`/learn/${cid}/${pv[0]}/${pv[1]}`);
  };
  const nextLabel = isLast ? 'Finish' : 'Next →';
  const togglePlay = () => setPlaying(!playing);
  const sendAsk = () => { const v = askText.trim(); if (!v) return; set((x) => askDoubt(x, cid, ci, li, v)); setAskText(''); };

  const spine = (variant: 'spine' | 'sheet') => (
    <ChapterList variant={variant} courseId={cid} open={openCh} current={[ci, li]}
      onToggle={(x) => setOpenCh(openCh === x ? null : x)} onOpenLesson={() => setSheet(false)} />
  );

  return (
    <Shell role="student" title="Lesson" back={'/course/' + cid} lessonMode
      topAction={<button className="btn btn-sm" onClick={() => setSheet(true)}><Icon name="list" size={18} />Chapters</button>}
      lessonBar={
        <>
          <button className="btn btn-round" style={{ width: 48, height: 48 }} onClick={prev} aria-label="Prev"><Icon name="arrow_back" /></button>
          <button className="btn" style={{ height: 48, padding: '0 16px', fontSize: 15 }} onClick={() => setSheet(true)}><Icon name="list" size={20} />Chapters</button>
          <button className="btn btn-primary" style={{ flex: 1, height: 48 }} onClick={next}>{nextLabel}</button>
        </>
      }
      aside={
        <aside className="spine" data-print="hide">
          <div className="disp" style={{ padding: '0 8px 12px', fontSize: 18, fontWeight: 700 }}>Chapters</div>
          {spine('spine')}
        </aside>
      }>
      <div className="video-wrap" data-print="hide">
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0C1020', borderRadius: 'var(--video-r)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {watermarkOn(s) ? <span className="mono" style={{ position: 'absolute', ...WM_SPOTS[wm], fontSize: 12, whiteSpace: 'nowrap', color: '#FFFFFF', opacity: 0.35 }}>{defaultStudent.masked}</span> : null}
          <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="tile"
            style={{ width: 68, height: 68, border: 'none', borderRadius: 999, background: '#FFFFFF', color: 'var(--hero)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
            <Icon name={playing ? 'pause' : 'play_arrow'} size={38} fill />
          </button>
          <span className="mono" style={{ position: 'absolute', bottom: 12, left: 14, fontSize: 11, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.7)' }}>bunny.net stream · {quality === 'auto' ? '720p' : quality}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 0 0' }}>
          <button className="tile" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
            style={{ width: 44, height: 44, border: 'none', borderRadius: 999, background: 'var(--brand)', color: 'var(--on-brand)' }}>
            <Icon name={playing ? 'pause' : 'play_arrow'} size={24} fill />
          </button>
          <button className="ctl ctl-round" onClick={() => setT(Math.max(0, t - 10))} aria-label="Back 10 seconds"><Icon name="replay_10" /></button>
          <button className="ctl ctl-round" onClick={() => setT(Math.min(dur, t + 10))} aria-label="Forward 10 seconds"><Icon name="forward_10" /></button>
          <div role="slider" aria-label="Video position" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(t)} tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') setT(Math.min(dur, t + 5)); if (e.key === 'ArrowLeft') setT(Math.max(0, t - 5)); }}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setT(Math.max(0, Math.min(dur, Math.round(((e.clientX - r.left) / r.width) * dur)))); }}
            style={{ flex: 1, minWidth: 120, height: 44, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '100%', height: 6, borderRadius: 999, background: 'var(--surface-sunk)' }}>
              <div style={{ height: 6, borderRadius: 999, width: pct + '%', background: 'var(--brand)' }} />
              <div style={{ position: 'absolute', top: '50%', left: pct + '%', width: 16, height: 16, margin: '-8px 0 0 -8px', borderRadius: 999, background: 'var(--surface)', border: '3px solid var(--brand)' }} />
            </div>
          </div>
          <span className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{mmss(t)} / {mmss(dur)}</span>
          <button className="ctl mono" style={{ fontSize: 12 }} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed}x</button>
          <button className="ctl mono" style={{ fontSize: 12 }} onClick={() => setQuality(QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length])}>{quality}</button>
          <button className="ctl" style={{ padding: 0 }} aria-label="Fullscreen"><Icon name="fullscreen" size={20} /></button>
        </div>
      </div>

      <div style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{lessonRef(ci, li)}</div>
      <h1 className="disp" style={{ margin: '2px 0 18px', fontSize: 'var(--d2)', lineHeight: 1.3, fontWeight: 800 }}>{content.title}</h1>

      <div data-print="hide" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="seg" role="tablist">
          {tabs.map(([label, id]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{ fontSize: 14, fontWeight: tab === id ? 600 : 400 }}>{label}</button>
          ))}
        </div>
        <button className="btn btn-sm only-tight" style={{ marginLeft: 'auto' }} onClick={() => setSheet(true)}><Icon name="list" size={18} />Chapters</button>
        <button className="btn btn-sm push-right" onClick={() => set((x) => toggleBookmark(x, lk))} aria-pressed={bm} aria-label="Bookmark"
          style={{ padding: '0 12px', borderColor: bm ? 'var(--sun)' : 'var(--line-strong)', background: bm ? 'var(--sun)' : 'var(--surface)', color: bm ? 'var(--on-sun)' : 'var(--ink)' }}>
          <Icon name="bookmark" size={18} fill={bm} /><span className="only-desktop">{bm ? 'Saved' : 'Save'}</span>
        </button>
        <button className="btn btn-sm" onClick={() => window.print()} aria-label="Download" style={{ padding: '0 12px' }}>
          <Icon name="download" size={18} /><span className="only-desktop">Download</span>
        </button>
      </div>

      {tab === 'mine' ? (
        <div style={{ maxWidth: '68ch', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="lock" size={16} />শুধু তুমি দেখতে পাবে · অটো-সেভ হয়</div>
          <textarea className="ruled" value={note} onChange={(e) => set((x) => setMyNote(x, lk, e.target.value))} placeholder="এই লেসনে যা মনে রাখতে চাও লিখে রাখো…" aria-label="My note" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{words ? plural(words, 'word') + ' · saved' : 'এখনো কিছু লেখোনি'}</span>
            <Link href="/profile" className="btn btn-sm" style={{ marginLeft: 'auto' }}><Icon name="bookmarks" size={18} />All Notes</Link>
          </div>
        </div>
      ) : null}

      {tab === 'notes' ? <NoteBlocks blocks={content.blocks} /> : null}

      {tab === 'stuck' ? (
        <div style={{ maxWidth: '68ch' }}>
          {stuck.length ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 16 }}>
                <Icon name="lightbulb" fill style={{ color: 'var(--warn)' }} />এই লেসনে সবাই যেখানে আটকায় — আগেই লিখে রাখা। জিজ্ঞেস করার দরকার নেই।
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stuck.map((c, i) => {
                  const open = !!stuckOpen[i];
                  return (
                    <div key={i} className="card" style={{ borderRadius: 18, borderColor: open ? 'var(--line-strong)' : 'var(--line)', overflow: 'hidden' }}>
                      <button onClick={() => setStuckOpen({ ...stuckOpen, [i]: !open })} aria-expanded={open}
                        style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, minHeight: 56, padding: '14px 16px', border: 'none', background: 'transparent', textAlign: 'left', whiteSpace: 'normal', color: 'var(--ink)' }}>
                        <span className="tile disp" style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 15, fontWeight: 800 }}>?</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.7, fontWeight: 600 }}>{c.q}</span>
                        <Icon name={open ? 'expand_less' : 'expand_more'} size={24} style={{ color: 'var(--ink-3)', marginTop: 2 }} />
                      </button>
                      {open ? <div style={{ padding: '0 18px 18px 56px', fontFamily: 'var(--font-read)', fontSize: 17, lineHeight: 1.85 }}>{c.a}</div> : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyCard title="এই লেসনে এখনো কিছু জমা হয়নি" body="যেখানে বেশি ছাত্র আটকায়, সেটা এখানে যোগ হয়। এখন পর্যন্ত এই লেসনে কেউ আটকায়নি।"
              action={<button className="btn" onClick={() => setTab('ask')}>Ask a Question</button>} />
          )}
        </div>
      ) : null}

      {tab === 'quiz' ? (
        content.quiz.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>Practice · {Object.keys(answers).length}/{content.quiz.length} answered</div>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => set((x) => ({ ...x, practiceAns: { ...x.practiceAns, [lk]: {} } }))}>
                <Icon name="restart_alt" size={18} />Retry
              </button>
            </div>
            {content.quiz.map((q, qi) => {
              const pick = answers[qi];
              const answered = pick !== undefined;
              return (
                <div key={qi} className="card" style={{ padding: 'var(--card-pad)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                    <span className="tile" style={{ minWidth: 34, height: 28, padding: '0 8px', borderRadius: 999, background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 700 }}>{pad2(qi + 1)}</span>
                    <span style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}>{q.stem}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {q.o.map((label, oi) => {
                      const right = oi === q.a, chosen = pick === oi, show = answered && (chosen || right);
                      const tone = right ? ['var(--ok)', 'var(--ok-soft)'] : ['var(--margin)', 'var(--margin-soft)'];
                      return (
                        <button key={oi} disabled={answered}
                          onClick={() => set((x) => ({ ...x, practiceAns: { ...x.practiceAns, [lk]: { ...(x.practiceAns[lk] || {}), [qi]: oi } } }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 54, padding: '8px 14px 8px 8px', border: '2px solid ' + (show ? tone[0] : 'var(--line)'), borderRadius: 14, background: show ? tone[1] : 'var(--surface)', textAlign: 'left', fontSize: 15, whiteSpace: 'normal', color: 'var(--ink)' }}>
                          <span className="tile" style={{ width: 36, height: 36, borderRadius: 10, background: show ? tone[0] : 'var(--surface-sunk)', color: show ? 'var(--surface)' : 'var(--ink-2)', fontSize: 15, fontWeight: 700 }}>{LETTERS[oi]}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
                          {show ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: tone[0] }}>
                              <Icon name={right ? 'check_circle' : 'cancel'} fill />{right ? 'Correct' : chosen ? 'Wrong' : ''}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {answered && q.why ? (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'var(--surface-sunk)', fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                      <Icon name="lightbulb" size={20} fill style={{ color: 'var(--warn)', marginTop: 3 }} /><span>{q.why}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyCard title="এই লেসনে এখনো কুইজ নেই" body="শিক্ষক কুইজ যোগ করলে এখানে অনুশীলন করতে পারবে।" />
        )
      ) : null}

      {tab === 'ask' ? (
        <div style={{ maxWidth: '68ch', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {asks.map((d) => {
            const who = d.mine ? 'You' : d.who.split(' ')[0];
            return (
              <div key={d.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="tile" style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--accent-2-soft)', color: 'var(--accent-2)', fontSize: 13, fontWeight: 700 }}>{initial(d.mine ? 'You' : d.who)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{who}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ago(d.agoMin)}</span>
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.7 }}>{d.q}</div>
                {d.reply ? (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--brand-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}><Icon name="verified" size={18} fill />{d.by} · Instructor</div>
                    <div style={{ fontSize: 15, lineHeight: 1.7 }}>{d.reply}</div>
                  </div>
                ) : d.mine ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="schedule" size={18} />Waiting · usually answered within 24 h</div>
                ) : null}
              </div>
            );
          })}
          <div className="card" style={{ padding: 14 }}>
            <label htmlFor="ask" style={{ display: 'block', margin: '0 4px 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Your question</label>
            <textarea id="ask" className="ask-box" value={askText} onChange={(e) => setAskText(e.target.value)} placeholder="যেটা বুঝোনি, লিখে ফেলো" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn-primary" disabled={!askText.trim()} onClick={sendAsk} style={{ padding: '0 20px' }}>Send<Icon name="send" size={18} /></button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Stays at the bottom of the reading area, so the next step is in reach however long the notes are. */}
      <div className="only-desktop lesson-foot" data-print="hide">
        <button className="btn" onClick={prev}><Icon name="arrow_back" size={20} />Prev</button>
        <span className="ellipsis" style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, color: 'var(--ink-3)' }}>{lessonRef(ci, li)}</span>
        <button className="btn btn-primary" style={{ padding: '0 24px' }} onClick={next}>{nextLabel}</button>
      </div>

      {sheet ? <Sheet title="Chapters" onClose={() => setSheet(false)}><div style={{ padding: '0 12px' }}>{spine('sheet')}</div></Sheet> : null}

      {chapterEnd && test ? (
        <div className="ov dialog-scrim" data-print="hide">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="chapter-end">
            <span className="tile" style={{ width: 48, height: 48, marginBottom: 14, borderRadius: 999, background: 'var(--ok-soft)', color: 'var(--ok)' }}><Icon name="task_alt" size={26} fill /></span>
            <div id="chapter-end" className="disp" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Chapter {pad2(ci + 1)} complete</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)' }}>চ্যাপ্টার টেস্টটা দিয়ে দেখবে কতটা শিখেছ? এটা ঐচ্ছিক — না দিলেও পরের অধ্যায় খোলা থাকবে।</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 22px', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}><Icon name="quiz" size={18} />{testFacts(test)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href={`/test/${cid}/${ci}`} className="btn btn-primary" style={{ height: 48 }} autoFocus>Take the test</Link>
              <button className="btn" style={{ height: 48, fontSize: 15 }} onClick={() => { const e = chapterEnd; setChapterEnd(null); moveOn(e.next, e.courseDone); }}>
                {chapterEnd.next ? 'Continue to Chapter ' + pad2(chapterEnd.next[0] + 1) : 'Finish the course'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

function EmptyCard({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '44px 24px', textAlign: 'center' }}>
      <Penguin size={84} />
      <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink-2)', maxWidth: '40ch' }}>{body}</div>
      {action}
    </div>
  );
}
