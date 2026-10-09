'use client';

import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEMESTERS } from '@/lib/data';
import { dateEn, daysTo, ordinalEn, plural, semLabel } from '@/lib/format';
import { examISO } from '@/lib/selectors';
import type { AppState } from '@/lib/state';
import { useStore } from '@/lib/store';

const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', margin: '28px 0 8px' };

export default function SetupPage() {
  const { s, set, numerals, ready } = useStore();
  const router = useRouter();
  if (!ready) return null;

  const p = s.prefs;
  const setPrefs = (patch: Partial<AppState['prefs']>) => set((x) => ({ ...x, prefs: { ...x.prefs, ...patch } }));
  const iso = examISO(s);
  const days = daysTo(iso);
  const finish = () => { setPrefs({ setupDone: true }); router.push('/'); };

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
        <input id="name" value={p.name} onChange={(e) => setPrefs({ name: e.target.value })} placeholder="সার্টিফিকেটে এই নামটাই ছাপা হবে"
          style={{ width: '100%', height: 48, padding: '0 14px', border: '1px solid var(--field-line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 16 }} />

        <div style={LABEL}>Semester</div>
        <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SEMESTERS.map((sem) => (
            <button key={sem} role="radio" aria-checked={p.sem === sem} className="pick"
              style={{ minWidth: 56, height: 44, padding: '0 14px', fontSize: 15 }}
              onClick={() => setPrefs({ sem, examDate: null })}>{ordinalEn(sem)}</button>
          ))}
        </div>

        <div style={LABEL}>Exam date</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 600 }}>{dateEn(iso)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{days > 0 ? plural(days, 'day') + ' left' : days === 0 ? 'Exam today' : 'Exam over'}</span>
          </div>
          <div className="fine" style={{ marginTop: 4 }}>{p.examDate ? 'Set by you' : 'Board calendar · ' + semLabel(p.sem)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <label htmlFor="exam" style={{ fontSize: 13, color: 'var(--ink-2)' }}>Different date</label>
            <input id="exam" type="date" value={iso} onChange={(e) => { if (e.target.value) setPrefs({ examDate: e.target.value }); }} className="mono"
              style={{ height: 44, padding: '0 12px', border: '1px solid var(--field-line)', borderRadius: 12, background: 'var(--surface-sunk)', color: 'var(--ink)', fontSize: 14 }} />
            {p.examDate ? (
              <button onClick={() => setPrefs({ examDate: null })}
                style={{ height: 44, padding: '0 12px', border: 'none', background: 'none', color: 'var(--brand)', fontSize: 13, fontWeight: 500 }}>Use the board date</button>
            ) : null}
          </div>
        </div>

        <div style={LABEL}>Digits inside Bangla text</div>
        <div role="radiogroup" style={{ display: 'flex', gap: 8 }}>
          {([['bn', '৩টা লেসন বাকি', 'Bangla digits'], ['latin', '3টা লেসন বাকি', 'English digits']] as const).map(([id, sample, label]) => {
            const on = numerals === id;
            return (
              <button key={id} role="radio" aria-checked={on} onClick={() => setPrefs({ numerals: id })}
                style={{ flex: 1, minHeight: 56, padding: '8px 16px', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 999, background: on ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 500, color: on ? 'var(--on-brand-soft)' : 'var(--ink)' }}>{sample}</span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', height: 48, marginTop: 36, fontWeight: 500 }} onClick={finish}>Start</button>
        <button style={{ width: '100%', height: 44, marginTop: 8, border: 'none', background: 'none', color: 'var(--ink-3)', fontSize: 13 }} onClick={finish}>Skip for now</button>
      </div>
    </div>
  );
}
