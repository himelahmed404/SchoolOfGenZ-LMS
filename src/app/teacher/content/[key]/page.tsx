'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Tex } from '@/components/Tex';
import { patchItem, startUpload, submitForReview, withdraw } from '@/lib/actions';
import { blockTypes, courses, fxKeys, MIN_TEST_QUESTIONS, teacher } from '@/lib/data';
import { pad2 } from '@/lib/format';
import { blockHasContent, issues, item, keyCourse, returnReason, revisionRef, statusOf } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { Block, BlockType, LessonRevision, QuizQ } from '@/lib/types';

type EdTab = 'video' | 'notes' | 'quiz';
const ADD: [BlockType, string][] = [['p', 'অনুচ্ছেদ'], ['h', 'শিরোনাম'], ['list', 'তালিকা'], ['img', 'ছবি'], ['fx', 'সূত্র'], ['code', 'কোড']];

function safeItem(s: Parameters<typeof item>[0], k: string): LessonRevision | null {
  try {
    const cid = keyCourse(k);
    if (!courses[cid]) return null;
    const it = item(s, k);
    return courses[cid].chapters[it.ch] ? it : null;
  } catch {
    return null;
  }
}

export default function EditorPage() {
  const { key } = useParams<{ key: string }>();
  const k = decodeURIComponent(key);
  const { s, set, numerals } = useStore();
  const [tab, setTab] = useState<EdTab>('notes');
  const [active, setActive] = useState(0);
  const [errs, setErrs] = useState<string[]>([]);

  const it = safeItem(s, k);
  if (!it) notFound();

  const locked = it.status === 'review';
  // A chapter test has questions and a time limit only: no video, notes or title of its own.
  const isTest = it.kind === 'test';
  const view: EdTab = isTest ? 'quiz' : tab;
  const [statusLabel, statusColor] = statusOf(it);
  const upPct = s.upload && s.upload.key === k ? s.upload.pct : 0;

  const patch = (p: Partial<LessonRevision>) => { set((x) => patchItem(x, k, p)); setErrs([]); };
  const editBlocks = (fn: (bs: Block[]) => Block[]) => set((x) => patchItem(x, k, { blocks: fn(item(x, k).blocks.slice()) }));
  const setBlock = (i: number, p: Partial<Block>) => editBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const setQ = (qi: number, fn: (q: QuizQ) => Partial<QuizQ>) =>
    set((x) => patchItem(x, k, { quiz: item(x, k).quiz.map((q, j) => (j === qi ? { ...q, ...fn(q) } : q)) }));

  const submit = () => {
    const e = issues(it, numerals);
    if (e.length) { setErrs(e); return; }
    set((x) => submitForReview(x, k, teacher.name));
    setErrs([]);
  };

  const tabs: [string, EdTab, string][] = [
    ['Video', 'video', it.video.state === 'done' ? '✓' : ''],
    ['Notes', 'notes', String(it.blocks.filter(blockHasContent).length)],
    ['Quiz', 'quiz', String(it.quiz.length)],
  ];

  return (
    <Shell role="teacher" title={isTest ? 'Chapter Test' : 'Lesson Editor'} back="/teacher/content" noTabs>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <Link href="/teacher/content" className="t13 w500 only-desktop" style={{ height: 32, display: 'inline-flex', alignItems: 'center', color: 'var(--brand)' }}>← Content</Link>
        <span className="kicker">{revisionRef(it)}</span>
        <span className="ml-auto t13 w500" style={{ color: statusColor }}>{it.status === 'published' ? 'Published · বদলালে আবার Review লাগবে' : statusLabel}</span>
      </div>
      {isTest ? (
        <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
          <h1 className="d1" style={{ fontWeight: 600 }}>Chapter test</h1>
          <div className="t15 ink2">{courses[keyCourse(k)].chapters[it.ch].name}</div>
        </div>
      ) : (
        <input value={it.title} onChange={(e) => patch({ title: e.target.value })} readOnly={locked} placeholder="লেসনের নাম" aria-label="লেসনের নাম"
          className="title-input" />
      )}

      {it.status === 'returned' ? <div className="alert" style={{ marginTop: 16 }}>ফেরত এসেছে — {returnReason(it, 'bn') || 'কারণ লেখা নেই'}। ঠিক করে আবার জমা দাও।</div> : null}
      {locked ? <div className="alert alert-warn" style={{ marginTop: 16 }}>অ্যাডমিন দেখছেন। অনুমোদন হলে ছাত্ররা দেখতে পাবে — ততক্ষণ বদলানো যাবে না।</div> : null}
      {it.status === 'draft' && it.update ? <div className="fine" style={{ marginTop: 16 }}>ছাত্ররা এখনো আগের সংস্করণ দেখছে। জমা দিয়ে অনুমোদন হলে নতুনটা যাবে।</div> : null}

      {isTest ? (
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '20px 0 16px' }}>
          <div style={{ minWidth: 0 }}>
            <div className="t15 w600">Time limit</div>
            <div className="t13 ink3">সময় শেষ হলে টেস্ট নিজে থেকেই জমা হয়ে যায়।</div>
          </div>
          <div className="seg" role="group" aria-label="Time limit" style={{ marginLeft: 'auto' }}>
            {[5, 8, 10, 15, 20].map((m) => (
              <button key={m} aria-pressed={it.seconds === m * 60} disabled={locked} onClick={() => patch({ seconds: m * 60 })}>{m} min</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="seg" role="tablist" style={{ display: 'inline-flex', margin: '20px 0 24px' }}>
          {tabs.map(([label, id, badge]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{ height: 36, padding: '0 16px', fontSize: 14, fontWeight: tab === id ? 600 : 500 }}>{label}{badge ? ' · ' + badge : ''}</button>
          ))}
        </div>
      )}

      {view === 'video' ? (
        <div>
          {it.video.state === 'none' ? (
            <button onClick={() => set((x) => startUpload(x, k))} disabled={locked || !!s.upload}
              style={{ width: '100%', aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px dashed var(--line-strong)', borderRadius: 20, background: 'var(--surface)', color: 'var(--ink)', whiteSpace: 'normal' }}>
              <span className="t17 w600">Choose Video</span>
              <span className="t13 ink3">MP4 · Wi-Fi-তে আপলোড করা ভালো</span>
            </button>
          ) : it.video.state === 'uploading' ? (
            <div className="card" style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: 24 }}>
              <div className="mono t13">{it.video.name}</div>
              <div role="progressbar" aria-valuenow={upPct} aria-valuemin={0} aria-valuemax={100} style={{ height: 3, background: 'var(--line)' }}>
                <div style={{ height: 3, width: upPct + '%', background: 'var(--brand)', transition: 'width 400ms var(--ease)' }} />
              </div>
              <div className="t13 ink3">Uploading · {upPct}% · 84 MB</div>
            </div>
          ) : (
            <div>
              <div className="ph" style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 20 }}>
                <span style={{ width: 56, height: 56, borderRadius: 9999, border: '1px solid var(--line-strong)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>▶</span>
                <span className="mono ink2" style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11 }}>bunny.net stream · {it.video.dur || ''}</span>
              </div>
              <div className="row wrap" style={{ marginTop: 10 }}>
                <span className="mono t13 ink2">{it.video.name}</span>
                {!locked ? <button className="btn btn-sm ml-auto" style={{ padding: '0 12px', fontWeight: 500 }} disabled={!!s.upload} onClick={() => set((x) => startUpload(x, k))}>বদলাও</button> : null}
              </div>
            </div>
          )}
          <div className="fine" style={{ marginTop: 14, maxWidth: '60ch' }}>আপলোডের পর ৩৬০p, ৪৮০p আর ৭২০p নিজে থেকেই তৈরি হবে — কম ডেটায় ছাত্ররা ছোটটা বেছে নিতে পারবে।</div>
        </div>
      ) : null}

      {view === 'notes' ? (
        <div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0' }}>
            {it.blocks.map((b, i) => (
              <BlockEditor key={i} b={b} i={i} count={it.blocks.length} active={active === i} locked={locked}
                onFocus={() => { if (active !== i) setActive(i); }}
                onChange={(p) => setBlock(i, p)}
                onMove={(dir) => {
                  const j = i + dir;
                  if (j < 0 || j >= it.blocks.length) return;
                  editBlocks((bs) => { const t = bs[j]; bs[j] = bs[i]; bs[i] = t; return bs; });
                  setActive(j);
                }}
                onDelete={() => { editBlocks((bs) => { bs.splice(i, 1); return bs.length ? bs : [{ t: 'p', x: '' }]; }); setActive(Math.max(0, i - 1)); }}
                onPickImage={() => { setBlock(i, { file: 'IMG_20260923_' + pad2(i + 10) + '.png' }); setActive(i); }}
              />
            ))}
          </div>
          {!locked ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {ADD.map(([t, label]) => (
                <button key={t} className="t13 ink2" style={{ height: 36, padding: '0 12px', border: '1px dashed var(--line-strong)', borderRadius: 999, background: 'none' }}
                  onClick={() => {
                    const at = Math.min(active + 1, it.blocks.length);
                    editBlocks((bs) => { bs.splice(at, 0, t === 'img' ? { t: 'img', file: '', cap: '' } : { t, x: '' }); return bs; });
                    setActive(at);
                  }}>+ {label}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {view === 'quiz' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isTest ? (
            <div className="t13 w500 ink2">Questions · {it.quiz.length}{it.quiz.length < MIN_TEST_QUESTIONS ? ' · at least ' + MIN_TEST_QUESTIONS + ' needed' : ''}</div>
          ) : null}
          {it.quiz.length === 0 ? (
            <div className="muted-p">{isTest
              ? 'এই অধ্যায়ের টেস্টে এখনো প্রশ্ন নেই। অধ্যায়ের সব লেসন শেষ করলে ছাত্ররা চাইলে টেস্টটা দিতে পারবে — দেওয়া বাধ্যতামূলক না।'
              : 'এই লেসনে এখনো কুইজ নেই। লেসন শেষে ছাত্ররা এগুলো অনুশীলন করবে — ভুল করলে তোমার ব্যাখ্যা দেখবে।'}</div>
          ) : null}
          {it.quiz.map((q, qi) => {
            const noA = q.a === null || q.a === undefined;
            return (
              <div key={qi} className="card card-pad">
                <div className="row" style={{ gap: 10, marginBottom: 10 }}>
                  <span className="mono t13 ink3">{pad2(qi + 1)}</span>
                  <span className="t12 w500" style={{ color: 'var(--warn)' }}>{noA ? 'সঠিক উত্তর বাছা হয়নি' : ''}</span>
                  {!locked ? <button className="t13 ink3 ml-auto" style={{ height: 32, padding: '0 10px', border: 'none', background: 'none' }} onClick={() => patch({ quiz: it.quiz.filter((_, j) => j !== qi) })}>Delete</button> : null}
                </div>
                <textarea value={q.stem} onChange={(e) => { const v = e.target.value; setQ(qi, () => ({ stem: v })); }} readOnly={locked} placeholder="প্রশ্ন লেখো" rows={1} aria-label="প্রশ্ন"
                  style={{ display: 'block', width: '100%', minHeight: 48, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-sunk)', fontSize: 15, lineHeight: 1.7, resize: 'none' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {q.o.map((o, oi) => {
                    const right = q.a === oi;
                    const border = right ? 'var(--brand)' : 'var(--line)';
                    return (
                      <div key={oi} className="row" style={{ gap: 8 }}>
                        <button onClick={() => { if (!locked) setQ(qi, () => ({ a: oi })); }} aria-label={'সঠিক উত্তর — অপশন ' + 'কখগঘ'[oi]} aria-pressed={right}
                          style={{ width: 44, height: 44, flexShrink: 0, border: '1px solid ' + border, borderRadius: 999, background: right ? 'var(--brand-soft)' : 'var(--surface)', color: 'var(--brand)', fontSize: 14 }}>{right ? '✓' : ''}</button>
                        <input value={o} readOnly={locked} placeholder={'অপশন ' + 'কখগঘ'[oi]}
                          onChange={(e) => { const v = e.target.value; setQ(qi, (x) => ({ o: x.o.map((y, j) => (j === oi ? v : y)) })); }}
                          style={{ flex: 1, minWidth: 0, height: 44, padding: '0 12px', border: '1px solid ' + border, borderRadius: 12, background: 'var(--surface)', fontSize: 15 }} />
                      </div>
                    );
                  })}
                </div>
                <input value={q.why || ''} readOnly={locked} placeholder={isTest ? 'ব্যাখ্যা — ভুল করলে ফলাফলের পাতায় ছাত্ররা দেখবে' : 'ব্যাখ্যা — উত্তর দেওয়ার পর ছাত্ররা দেখবে'} aria-label="ব্যাখ্যা"
                  onChange={(e) => { const v = e.target.value; setQ(qi, () => ({ why: v })); }}
                  style={{ width: '100%', height: 44, marginTop: 10, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-sunk)', fontSize: 14 }} />
              </div>
            );
          })}
          {!locked ? (
            <button className="t15 ink2" style={{ height: 'var(--btn-h)', border: '1px dashed var(--line-strong)', borderRadius: 999, background: 'none' }}
              onClick={() => patch({ quiz: it.quiz.concat([{ stem: '', o: ['', '', '', ''], a: null, why: '' }]) })}>+ Add Question</button>
          ) : null}
          <div className="t13 ink3">বাঁ দিকের ঘরে চাপ দিয়ে সঠিক উত্তর বাছো।</div>
        </div>
      ) : null}

      {errs.length ? (
        <div role="alert" style={{ marginTop: 24, border: '1px solid var(--margin)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="t13 w500" style={{ color: 'var(--margin)' }}>জমা দেওয়ার আগে ঠিক করো</div>
          {errs.map((e) => <div key={e} className="t13" style={{ lineHeight: 1.7 }}>– {e}</div>)}
        </div>
      ) : null}

      <div className="row wrap" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
        <span className="t13 ink3">{locked ? 'জমা দেওয়া হয়েছে' : it.status === 'published' ? 'কিছু বদলাওনি' : 'খসড়া এই ফোনে সেভ হয়েছে'}</span>
        {locked ? <button className="btn ml-auto" style={{ padding: '0 16px', fontSize: 15, fontWeight: 500 }} onClick={() => set((x) => withdraw(x, k))}>Withdraw</button> : null}
        {it.status === 'draft' || it.status === 'returned' ? (
          <button className="btn btn-primary ml-auto" style={{ padding: '0 20px', fontWeight: 500 }} onClick={submit}>{it.status === 'returned' ? 'Resubmit' : 'Submit for Review'}</button>
        ) : null}
      </div>
    </Shell>
  );
}

interface BlockEditorProps {
  b: Block; i: number; count: number; active: boolean; locked: boolean;
  onFocus: () => void; onChange: (p: Partial<Block>) => void; onMove: (dir: 1 | -1) => void; onDelete: () => void; onPickImage: () => void;
}

function BlockEditor({ b, i, count, active, locked, onFocus, onChange, onMove, onDelete, onPickImage }: BlockEditorProps) {
  const ti = blockTypes[b.t];
  const isText = b.t === 'h' || b.t === 'p' || b.t === 'list' || b.t === 'code';
  const ctl: React.CSSProperties = { width: 32, height: 28, border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surface)', fontSize: 12, color: 'var(--ink-2)' };

  return (
    <div onClick={onFocus} style={{ padding: '6px 16px 6px 14px', borderLeft: '2px solid ' + (active ? 'var(--brand)' : 'transparent') }}>
      {active ? (
        <div className="row" style={{ gap: 4, marginBottom: 4 }}>
          <span className="mono ink3" style={{ fontSize: 11 }}>{ti[0]}</span>
          {!locked ? (
            <span className="ml-auto" style={{ display: 'flex', gap: 4 }}>
              <button style={ctl} aria-label="উপরে" disabled={i === 0} onClick={(e) => { e.stopPropagation(); onMove(-1); }}>↑</button>
              <button style={ctl} aria-label="নিচে" disabled={i >= count - 1} onClick={(e) => { e.stopPropagation(); onMove(1); }}>↓</button>
              <button style={{ ...ctl, color: 'var(--margin)' }} aria-label="মুছে দাও" onClick={(e) => { e.stopPropagation(); onDelete(); }}>✕</button>
            </span>
          ) : null}
        </div>
      ) : null}

      {isText ? (
        <textarea value={b.x || ''} onChange={(e) => onChange({ x: e.target.value })} onFocus={onFocus} readOnly={locked} placeholder={ti[4]} rows={1} aria-label={ti[0]}
          style={{
            display: 'block', width: '100%', minHeight: b.t === 'h' ? 32 : 28, padding: b.t === 'code' ? '10px 12px' : 0, border: 'none', borderRadius: 12,
            background: b.t === 'code' ? 'var(--surface-sunk)' : 'transparent', resize: 'none', outline: 'none',
            fontFamily: ti[1], fontSize: b.t === 'h' ? 'var(--edit-h)' : b.t === 'code' ? 14 : 17, fontWeight: Number(ti[2]), lineHeight: ti[3], color: 'var(--ink)',
          }} />
      ) : null}

      {b.t === 'img' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {b.file ? (
            <div className="ph" style={{ height: 180, borderRadius: 12 }}>{b.file}</div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onPickImage(); }} disabled={locked}
              style={{ width: '100%', height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: '1px dashed var(--line-strong)', borderRadius: 999, background: 'var(--surface-sunk)', color: 'var(--ink)', whiteSpace: 'normal' }}>
              <span className="t15 w500">Choose Image</span>
              <span className="t12 ink3">২০০ KB-র মধ্যে ছোট করে নেওয়া হবে</span>
            </button>
          )}
          <input value={b.cap || ''} onChange={(e) => onChange({ cap: e.target.value })} onFocus={onFocus} readOnly={locked} placeholder="ছবির নিচের লেখা" aria-label="ছবির নিচের লেখা"
            style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', fontSize: 13 }} />
        </div>
      ) : null}

      {b.t === 'fx' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={b.x || ''} onChange={(e) => onChange({ x: e.target.value })} onFocus={onFocus} readOnly={locked} placeholder="LaTeX — যেমন: V = I \times R" aria-label="LaTeX"
            className="mono" style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface-sunk)', fontSize: 14 }} />
          {active && !locked ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {fxKeys.map(([label, ins]) => (
                <button key={label} onClick={(e) => { e.stopPropagation(); onChange({ x: (b.x || '') + ins }); }}
                  style={{ minWidth: 36, height: 32, padding: '0 8px', border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surface)', fontFamily: 'Georgia,serif', fontSize: 14 }}>{label}</button>
              ))}
            </div>
          ) : null}
          <div style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0', fontSize: 18, overflowX: 'auto' }}><Tex src={b.x} /></div>
        </div>
      ) : null}
    </div>
  );
}
