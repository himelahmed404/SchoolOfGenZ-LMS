'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { resetPayment } from '@/lib/actions';
import { defaultStudent, newCourse, supportPhone } from '@/lib/data';
import { taka } from '@/lib/format';
import { useStore } from '@/lib/store';

const BOX: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 24px 32px', borderRadius: 20, background: 'var(--surface)', textAlign: 'center' };

export default function PendingPage() {
  const { s, set } = useStore();
  const router = useRouter();
  const p = s.payment;

  if (p.status === 'none') {
    return (
      <Shell role="student" title="Pending" back="/enroll">
        <div className="card" style={{ ...BOX, padding: '44px 24px' }}>
          <Penguin size={84} />
          <div className="disp" style={{ fontSize: 19, fontWeight: 700 }}>এখনো কোনো পেমেন্ট জমা দাওনি</div>
          <Link href="/enroll/pay" className="btn btn-primary">Enroll</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role="student" title="Pending" back="/">
      <div aria-live="polite">
        {p.status === 'pending' ? (
          <div style={{ ...BOX, border: '1px solid var(--line)', boxShadow: 'var(--lift)' }}>
            <Penguin size={96} />
            <div style={{ fontSize: 'var(--d2)', lineHeight: 1.4, fontWeight: 600 }}>জমা হয়েছে</div>
            <div className="muted-p" style={{ maxWidth: '44ch' }}>আমরা তোমার পেমেন্ট মিলিয়ে দেখছি। অনুমোদন হলে SMS পাবে — সাধারণত ২-৪ ঘণ্টার মধ্যেই হয়ে যায়।</div>
          </div>
        ) : p.status === 'approved' ? (
          <div style={{ ...BOX, border: '1px solid var(--brand)' }}>
            <Penguin size={96} />
            <div style={{ fontSize: 'var(--d2)', lineHeight: 1.4, fontWeight: 600, color: 'var(--brand)' }}>অনুমোদন হয়েছে</div>
            <div className="muted-p" style={{ maxWidth: '44ch' }}>{newCourse.title} এখন খোলা। যেকোনো সময় শুরু করতে পারো।</div>
            <Link href="/" className="btn btn-primary" style={{ padding: '0 24px', fontWeight: 500 }}>Start Course</Link>
          </div>
        ) : (
          <div style={{ ...BOX, border: '1px solid var(--margin)' }}>
            <div style={{ fontSize: 'var(--d2)', lineHeight: 1.4, fontWeight: 600, color: 'var(--margin)' }}>অনুমোদন হয়নি</div>
            {p.reason ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--margin)' }}>কারণ — {p.reason}</div> : null}
            <div className="muted-p" style={{ maxWidth: '44ch' }}>তোমার TrxID মেলেনি। আবার দেখে জমা দাও, নয়তো {supportPhone} নম্বরে যোগাযোগ করো।</div>
            <button className="btn" style={{ padding: '0 24px', fontSize: 15, fontWeight: 500 }} onClick={() => { set(resetPayment); router.push('/enroll/pay'); }}>Resubmit</button>
          </div>
        )}
      </div>

      <h2 className="sec-h" style={{ margin: '36px 0 12px' }}>যা জমা দিয়েছ</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden' }}>
        <Row k="Course" v={newCourse.title} />
        <Row k="Method" v={(p.method || '') + ' · ' + taka(newCourse.price)} />
        <Row k="TrxID" v={p.trxId || '—'} mono />
        <Row k="Sent from" v={p.sender || defaultStudent.phone} mono />
      </div>
    </Shell>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: 'var(--surface)' }}>
      <span style={{ minWidth: 110, fontSize: 13, color: 'var(--ink-3)' }}>{k}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 15 }}>{v}</span>
    </div>
  );
}
