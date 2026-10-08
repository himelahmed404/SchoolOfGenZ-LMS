'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { submitPayment, trxTaken } from '@/lib/actions';
import { merchants, newCourse } from '@/lib/data';
import { taka } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { PayMethod } from '@/lib/types';

const METHOD_TILE: Record<PayMethod, [string, string]> = { bKash: ['#E2136E', 'b'], Nagad: ['#F26522', 'N'] };

export default function PayPage() {
  const { s, set, n, numerals } = useStore();
  const router = useRouter();
  const [error, setError] = useState('');
  const p = s.payment;
  const price = taka(newCourse.price, numerals);
  const canSubmit = !!p.method && p.trxId.trim().length >= 6;
  const setPay = (patch: Partial<typeof p>) => set((x) => ({ ...x, payment: { ...x.payment, ...patch } }));

  const steps = p.method ? [
    p.method + ' অ্যাপ খোলো, অথবা ডায়াল করো ' + (p.method === 'bKash' ? '*247#' : '*167#'),
    '"Send Money" বেছে নাও',
    'নম্বর — ' + merchants[p.method],
    'টাকার পরিমাণ — ' + price,
    'রেফারেন্স — তোমার নিজের ফোন নম্বর',
    'শেষে যে TrxID পাবে, সেটা নিচে লিখে দাও',
  ] : [];

  const submit = () => {
    if (!canSubmit) return;
    // Server must enforce this too; the client check only gives faster feedback.
    if (trxTaken(s, p.trxId)) { setError('এই TrxID আগেই জমা পড়েছে। SMS-এ আসা TrxID-টা আবার দেখো।'); return; }
    set(submitPayment);
    router.push('/enroll/pending');
  };

  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 10 };
  const input: React.CSSProperties = { width: '100%', height: 52, padding: '0 14px', border: '1px solid var(--line-strong)', borderRadius: 14, background: 'var(--paper)', color: 'var(--ink)', fontSize: 15 };

  return (
    <Shell role="student" title="Payment" back="/enroll">
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{newCourse.title}</div>
      <h1 className="d1" style={{ margin: '2px 0 6px' }}>{price} পাঠাও</h1>
      <div className="muted-p" style={{ maxWidth: '52ch', marginBottom: 24 }}>কোনটা দিয়ে পাঠাবে বেছে নাও। টাকা পাঠানোর পর TrxID-টা নিচে লিখে জমা দাও।</div>

      <div role="radiogroup" aria-label="পেমেন্ট মাধ্যম" style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 12, marginBottom: 28 }}>
        {(['bKash', 'Nagad'] as PayMethod[]).map((m) => {
          const on = p.method === m;
          return (
            <button key={m} role="radio" aria-checked={on} onClick={() => setPay({ method: m })}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '2px solid ' + (on ? 'var(--brand)' : 'var(--line)'), borderRadius: 18, background: on ? 'var(--brand-soft)' : 'var(--surface)', textAlign: 'left' }}>
              <span className="tile disp" style={{ width: 44, height: 44, borderRadius: 12, background: METHOD_TILE[m][0], color: '#FFFFFF', fontSize: 20, fontWeight: 800 }}>{METHOD_TILE[m][1]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{m}</span>
                <span className="mono" style={{ display: 'block', fontSize: 13, color: 'var(--ink-3)' }}>{merchants[m]}</span>
              </span>
              <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={24} fill={on} style={{ color: on ? 'var(--brand)' : 'var(--line-strong)' }} />
            </button>
          );
        })}
      </div>

      {p.method ? (
        <div>
          <div style={label}>কীভাবে পাঠাবে</div>
          <ol className="card" style={{ margin: '0 0 28px', padding: 'var(--card-pad)', listStyle: 'none' }}>
            {steps.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, padding: '6px 0' }}>
                <span className="tile" style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 14, fontWeight: 700 }}>{n(i + 1)}</span>
                <span style={{ fontSize: 15, lineHeight: 1.8 }}>{t}</span>
              </li>
            ))}
          </ol>

          <div style={label}>যা পাঠিয়েছ তার তথ্য</div>
          <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>TrxID</span>
              <input className="mono" style={input} value={p.trxId} autoComplete="off" spellCheck={false}
                onChange={(e) => { setError(''); setPay({ trxId: e.target.value.toUpperCase() }); }} placeholder="BKX7M2QP41" />
            </label>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>যে নম্বর থেকে পাঠিয়েছ</span>
              <input className="mono" style={input} inputMode="tel" value={p.sender} onChange={(e) => setPay({ sender: e.target.value })} placeholder="01712 445589" />
            </label>
            {error ? <div className="alert" role="alert">{error}</div> : null}
            <button className="btn btn-primary" style={{ height: 48, fontWeight: 500 }} disabled={!canSubmit} onClick={submit}>Submit</button>
            <div className="fine">ভুল TrxID দিলে অনুমোদন হবে না। SMS-এ যেটা এসেছে হুবহু সেটাই লেখো।</div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
