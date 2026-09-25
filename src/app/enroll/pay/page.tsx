'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { submitPayment, trxTaken } from '@/lib/actions';
import { merchants, newCourse } from '@/lib/data';
import { taka } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { PayMethod } from '@/lib/types';

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

  return (
    <Shell role="student" title="Payment" back="/enroll">
      <div className="t13 w500 ink2">{newCourse.title}</div>
      <h1 className="h1" style={{ margin: '2px 0 6px' }}>{price} পাঠাও</h1>
      <div className="muted-p" style={{ maxWidth: '52ch', marginBottom: 24 }}>কোনটা দিয়ে পাঠাবে বেছে নাও। টাকা পাঠানোর পর TrxID-টা নিচে লিখে জমা দাও।</div>

      <div className="grid-2" role="radiogroup" aria-label="পেমেন্ট মাধ্যম" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12, marginBottom: 28 }}>
        {(['bKash', 'Nagad'] as PayMethod[]).map((m) => {
          const on = p.method === m;
          return (
            <button key={m} role="radio" aria-checked={on} onClick={() => setPay({ method: m })}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: 16, minHeight: 'var(--btn-h)', border: '1px solid ' + (on ? 'var(--brand)' : 'var(--line-strong)'), borderRadius: 2, background: on ? 'var(--brand-soft)' : 'var(--surface)', color: on ? 'var(--brand)' : 'var(--ink)', textAlign: 'left' }}>
              <span style={{ fontSize: 17, fontWeight: on ? 600 : 500 }}>{m}</span>
              <span className="mono t13 ink3">{merchants[m]}</span>
            </button>
          );
        })}
      </div>

      {p.method ? (
        <div>
          <div className="t13 w500 ink2" style={{ marginBottom: 10 }}>কীভাবে পাঠাবে</div>
          <ol className="card card-pad" style={{ margin: '0 0 28px', listStyle: 'none' }}>
            {steps.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, padding: '6px 0' }}>
                <span className="mono t13 ink3" style={{ width: 20, flexShrink: 0 }}>{n(i + 1)}</span>
                <span className="t15" style={{ lineHeight: 1.8 }}>{t}</span>
              </li>
            ))}
          </ol>

          <div className="t13 w500 ink2" style={{ marginBottom: 10 }}>যা পাঠিয়েছ তার তথ্য</div>
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'block' }}>
              <span className="t13 ink2" style={{ display: 'block', marginBottom: 6 }}>TrxID</span>
              <input className="field mono" value={p.trxId} autoComplete="off" spellCheck={false}
                onChange={(e) => { setError(''); setPay({ trxId: e.target.value.toUpperCase() }); }} placeholder="BKX7M2QP41" />
            </label>
            <label style={{ display: 'block' }}>
              <span className="t13 ink2" style={{ display: 'block', marginBottom: 6 }}>যে নম্বর থেকে পাঠিয়েছ</span>
              <input className="field mono" inputMode="tel" value={p.sender} onChange={(e) => setPay({ sender: e.target.value })} placeholder="01712 445589" />
            </label>
            {error ? <div className="alert" role="alert">{error}</div> : null}
            <button className="btn btn-primary btn-lg" disabled={!canSubmit} onClick={submit}>Submit</button>
            <div className="fine">ভুল TrxID দিলে অনুমোদন হবে না। SMS-এ যেটা এসেছে হুবহু সেটাই লেখো।</div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
