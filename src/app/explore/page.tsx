'use client';

import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { chooseProgram } from '@/lib/actions';
import { taka } from '@/lib/format';
import { offers, offerView, payingOffer, type Offer } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** What is open for enrollment: single courses, and diploma batches that are taking students. The enroll flow starts at /enroll. */
export default function ExplorePage() {
  const { s, set } = useStore();
  const st = s.payment.status;
  // The program being paid for stays on the list after it is approved, so its status is still visible here.
  const paying = st === 'none' ? undefined : payingOffer(s);
  const list: Offer[] = (paying ? [paying] : []).concat(offers(s).filter((o) => !paying || o.program.id !== paying.program.id));
  // One payment at a time: nothing else can be started while one is being checked or was sent back.
  const busy = st === 'pending' || st === 'rejected';
  const chip = st === 'pending' ? ['Payment pending', 'var(--warn-soft)', 'var(--warn)'] : st === 'approved' ? ['Enrolled', 'var(--ok-soft)', 'var(--ok)'] : st === 'rejected' ? ['Payment not approved', 'var(--margin-soft)', 'var(--margin)'] : null;

  return (
    <Shell role="student" title="Explore Courses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="Explore Courses" sub="এখন যে কোর্সগুলোতে ভর্তি চলছে।" />
        {list.map((o) => {
          const v = offerView(s, o), mine = !!paying && paying.program.id === o.program.id;
          const label = !mine ? 'Enroll' : st === 'pending' ? 'Payment status' : st === 'approved' ? 'Enrolled' : 'Try again';
          const primary = mine ? st === 'rejected' : !busy;
          return (
            <div key={o.program.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 96, padding: '12px 18px', background: 'repeating-linear-gradient(180deg, transparent 0 31px, rgba(19,26,51,0.06) 31px 32px), var(--sun)', color: 'var(--on-sun)' }}>
                <span className="disp" style={{ fontSize: 44, lineHeight: 0.9, fontWeight: 800 }}>{v.code}</span>
                {mine && chip ? <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 999, background: chip[1], color: chip[2], fontSize: 12, fontWeight: 700 }}>{chip[0]}</span> : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '18px 18px 20px' }}>
                <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{v.kicker}</div>
                  <div className="disp" style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 700 }}>{v.title}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--ink-2)' }}>
                    {v.who ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="person" size={18} />{v.who}</span> : null}
                    <span>{v.facts}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="disp" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{taka(v.price)}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>One-time</div>
                  </div>
                  {mine ? (
                    <Link href="/enroll/pending" className={'btn' + (primary ? ' btn-primary' : '')} style={{ padding: '0 22px' }}>{label}<Icon name="arrow_forward" size={20} /></Link>
                  ) : busy ? (
                    <button className="btn" style={{ padding: '0 22px' }} disabled>{label}</button>
                  ) : (
                    <Link href="/enroll" onClick={() => set((x) => chooseProgram(x, o.program.id))} className="btn btn-primary" style={{ padding: '0 22px' }}>{label}<Icon name="arrow_forward" size={20} /></Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {busy && list.length > 1 ? <div className="fine" style={{ maxWidth: '60ch' }}>একটা পেমেন্ট এখনো মীমাংসা হয়নি। সেটা শেষ হলে আরেকটায় ভর্তি হতে পারবে।</div> : null}
        <div className="fine" style={{ maxWidth: '60ch' }}>নতুন ব্যাচ বা কোর্স খুললে এখানে দেখাবে, আর নোটিফিকেশনেও জানিয়ে দেবো।</div>
      </div>
    </Shell>
  );
}
