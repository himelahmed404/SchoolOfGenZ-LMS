'use client';

import { useRouter } from 'next/navigation';
import { semNames } from '@/lib/data';
import { dateLabel, daysTo } from '@/lib/format';
import { examISO } from '@/lib/selectors';
import type { AppState } from '@/lib/state';
import { useStore } from '@/lib/store';

export default function SetupPage() {
  const { s, set, n, numerals, ready, theme } = useStore();
  const router = useRouter();
  if (!ready) return null;

  const p = s.prefs;
  const setPrefs = (patch: Partial<AppState['prefs']>) => set((x) => ({ ...x, prefs: { ...x.prefs, ...patch } }));
  const iso = examISO(s);
  const days = daysTo(iso);
  const finish = () => { setPrefs({ setupDone: true }); router.push('/'); };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: 'var(--test-pad) var(--test-pad) 56px' }}>
        <div className="row" style={{ gap: 10, marginBottom: 28 }}>
          <div className="logo" />
          <div className="t15 w600">School of GenZ</div>
        </div>
        <h1 className="h1" style={{ marginBottom: 8 }}>শুরুর আগে চারটা কথা</h1>
        <div className="muted-p" style={{ marginBottom: 36 }}>একবারই জিজ্ঞেস করবো। পরে সেটিংসে বদলাতে পারবে।</div>

        <label htmlFor="name" className="t13 w500 ink2" style={{ display: 'block', marginBottom: 6 }}>তোমার নাম</label>
        <input id="name" className="field field-sunk" value={p.name} onChange={(e) => setPrefs({ name: e.target.value })} placeholder="সার্টিফিকেটে এই নামটাই ছাপা হবে" style={{ padding: '0 14px' }} />

        <div className="t13 w500 ink2" style={{ margin: '28px 0 8px' }}>কোন সেমিস্টার</div>
        <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {semNames.map((label, i) => (
            <button key={label} role="radio" aria-checked={p.sem === i + 1} aria-pressed={p.sem === i + 1} className="pick"
              style={{ minWidth: 56, height: 44, padding: '0 14px', fontSize: 15 }}
              onClick={() => setPrefs({ sem: i + 1, examDate: null })}>{label}</button>
          ))}
        </div>

        <div className="t13 w500 ink2" style={{ margin: '28px 0 8px' }}>পরীক্ষা কবে</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span className="t17 w600">{dateLabel(iso, numerals)}</span>
            <span className="t13 ink3 ml-auto nowrap">{days > 0 ? n(days) + ' দিন বাকি' : days === 0 ? 'আজই পরীক্ষা' : 'শেষ হয়েছে'}</span>
          </div>
          <div className="fine" style={{ marginTop: 4 }}>{p.examDate ? 'তুমি নিজে দিয়েছ' : 'বোর্ড ক্যালেন্ডার অনুযায়ী — ' + semNames[p.sem - 1] + ' সেমিস্টার'}</div>
          <div className="row wrap" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <label htmlFor="exam" className="t13 ink2">তারিখ ঠিক না?</label>
            <input id="exam" type="date" value={iso} onChange={(e) => { if (e.target.value) setPrefs({ examDate: e.target.value }); }}
              className="mono" style={{ height: 44, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 2, background: 'var(--surface-sunk)', fontSize: 14 }} />
            {p.examDate ? <button className="btn btn-link t13" style={{ height: 44 }} onClick={() => setPrefs({ examDate: null })}>ক্যালেন্ডারে ফেরাও</button> : null}
          </div>
        </div>

        <div className="t13 w500 ink2" style={{ margin: '28px 0 8px' }}>সংখ্যা কোন লেখায় দেখতে চাও</div>
        <div role="radiogroup" style={{ display: 'flex', gap: 8 }}>
          {([['bn', '১২:৩০', 'বাংলা সংখ্যা'], ['latin', '12:30', 'ইংরেজি সংখ্যা']] as const).map(([id, sample, label]) => {
            const on = numerals === id;
            return (
              <button key={id} role="radio" aria-checked={on} onClick={() => setPrefs({ numerals: id })}
                style={{ flex: 1, minHeight: 56, padding: '8px 16px', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 2, background: on ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left' }}>
                <span className="mono" style={{ display: 'block', fontSize: 17, fontWeight: 500, color: on ? 'var(--brand)' : 'var(--ink)' }}>{sample}</span>
                <span className="t13 ink3" style={{ display: 'block' }}>{label}</span>
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 36 }} onClick={finish}>Start</button>
        <button className="btn btn-quiet btn-block t13 ink3" style={{ height: 44, marginTop: 8, fontWeight: 400 }} onClick={finish}>পরে দিই</button>
        {p.setupDone ? (
          <button className="btn btn-quiet btn-block t13 ink3" style={{ height: 44, fontWeight: 400 }}
            onClick={() => setPrefs({ theme: theme === 'dark' ? 'light' : 'dark' })}>{theme === 'dark' ? 'লাইট মোডে যাও' : 'ডার্ক মোডে যাও'}</button>
        ) : null}
      </div>
    </div>
  );
}
