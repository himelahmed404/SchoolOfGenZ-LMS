'use client';

import type { Me } from '@contract';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/AuthFrame';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useGuard } from '@/components/useGuard';
import { sayError } from '@/lib/api/messages';
import { SEMESTERS } from '@/lib/data';
import { dateEn, daysTo, ordinalEn, plural, semLabel, type Numerals } from '@/lib/format';
import { semesterOf, suggestedExam } from '@/lib/selectors';
import { useStore } from '@/lib/store';

const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', margin: '28px 0 8px' };

export default function SetupPage() {
  const { s, me } = useStore();
  const allowed = useGuard();
  // The answers start from the account, so the form waits for it.
  return allowed && me ? <SetupForm me={me} sem={semesterOf(s)} /> : null;
}

function SetupForm({ me, sem }: { me: Me; sem: number }) {
  const { saveProfile, n } = useStore();
  const router = useRouter();
  const [d, setD] = useState<{ name: string; semester: number; examDate: string | null; numerals: Numerals }>(
    () => ({ name: me.name, semester: sem, examDate: me.examDate, numerals: me.numerals }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edit = (patch: Partial<typeof d>) => setD((x) => ({ ...x, ...patch }));

  const iso = d.examDate || suggestedExam(d.semester);
  const days = daysTo(iso);

  /** Save the answers, or only that the questions were seen, and go on to the dashboard. */
  const finish = async (answers: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile(answers
        ? { name: d.name.trim() || me.name, semester: d.semester, examDate: d.examDate, numerals: d.numerals, setupDone: true }
        : { setupDone: true });
      router.push('/');
    } catch (e) {
      setError(sayError(e, n));
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: 'var(--col-pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 12, background: 'var(--brand)' }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>School of GenZ</div>
          <ThemeToggle style={{ marginLeft: 'auto', marginRight: -10 }} />
        </div>
        <h1 className="d1" style={{ marginBottom: 8 }}>Four Things Before You Start</h1>
        <div className="muted-p" style={{ marginBottom: 36 }}>একবারই জিজ্ঞেস করবো। পরে সেটিংসে বদলাতে পারবে।</div>

        <label htmlFor="name" style={{ ...LABEL, display: 'block', margin: '0 0 6px' }}>Your name</label>
        <input id="name" value={d.name} onChange={(e) => edit({ name: e.target.value })} placeholder="সার্টিফিকেটে এই নামটাই ছাপা হবে" maxLength={80}
          style={{ width: '100%', height: 48, padding: '0 14px', border: '1px solid var(--field-line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 16 }} />

        <div style={LABEL}>Semester</div>
        <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SEMESTERS.map((x) => (
            <button key={x} role="radio" aria-checked={d.semester === x} className="pick"
              style={{ minWidth: 56, height: 44, padding: '0 14px', fontSize: 15 }}
              onClick={() => edit({ semester: x, examDate: null })}>{ordinalEn(x)}</button>
          ))}
        </div>

        <div style={LABEL}>Exam date</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{dateEn(iso)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{days > 0 ? plural(days, 'day') + ' left' : days === 0 ? 'Exam today' : 'Exam over'}</span>
          </div>
          <div className="fine" style={{ marginTop: 4 }}>{d.examDate ? 'Set by you' : 'Board calendar · ' + semLabel(d.semester)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <label htmlFor="exam" style={{ fontSize: 13, color: 'var(--ink-2)' }}>Different date</label>
            <input id="exam" type="date" value={iso} onChange={(e) => { if (e.target.value) edit({ examDate: e.target.value }); }} className="mono"
              style={{ height: 44, padding: '0 12px', border: '1px solid var(--field-line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 14 }} />
            {d.examDate ? (
              <button onClick={() => edit({ examDate: null })}
                style={{ height: 44, padding: '0 12px', border: 'none', background: 'none', color: 'var(--brand)', fontSize: 13, fontWeight: 500 }}>Use the board date</button>
            ) : null}
          </div>
        </div>

        <div style={LABEL}>Digits inside Bangla text</div>
        <div role="radiogroup" style={{ display: 'flex', gap: 8 }}>
          {([['bn', '৩টা লেসন বাকি', 'Bangla digits'], ['latin', '3টা লেসন বাকি', 'English digits']] as const).map(([id, sample, label]) => {
            const on = d.numerals === id;
            return (
              <button key={id} role="radio" aria-checked={on} onClick={() => edit({ numerals: id })}
                style={{ flex: 1, minHeight: 56, padding: '8px 16px', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 999, background: on ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 500, color: on ? 'var(--on-brand-soft)' : 'var(--ink)' }}>{sample}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
              </button>
            );
          })}
        </div>

        {error ? <div style={{ marginTop: 20 }}><Alert>{error}</Alert></div> : null}
        <button className="btn btn-primary" style={{ width: '100%', height: 48, marginTop: error ? 16 : 36, fontWeight: 500 }} disabled={busy} onClick={() => finish(true)}>Start</button>
        <button style={{ width: '100%', height: 44, marginTop: 8, border: 'none', background: 'none', color: 'var(--ink-3)', fontSize: 13 }} disabled={busy} onClick={() => finish(false)}>Skip for now</button>
      </div>
    </div>
  );
}
