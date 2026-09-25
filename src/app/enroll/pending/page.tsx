'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Penguin } from '@/components/Penguin';
import { Shell } from '@/components/Shell';
import { resetPayment } from '@/lib/actions';
import { defaultStudent, newCourse, supportPhone } from '@/lib/data';
import { taka } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function PendingPage() {
  const { s, set, numerals } = useStore();
  const router = useRouter();
  const p = s.payment;

  if (p.status === 'none') {
    return (
      <Shell role="student" title="Pending" back="/enroll">
        <div className="card empty">
          <div className="t17 w600">এখনো কোনো পেমেন্ট জমা দাওনি</div>
          <Link href="/enroll/pay" className="btn btn-primary">Enroll</Link>
        </div>
      </Shell>
    );
  }

  const box: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 24px 32px', borderRadius: 4, background: 'var(--surface)', textAlign: 'center' };

  return (
    <Shell role="student" title="Pending" back="/">
      <div aria-live="polite">
        {p.status === 'pending' ? (
          <div style={{ ...box, border: '1px solid var(--line)' }}>
            <Penguin size={96} />
            <div className="h2">জমা হয়েছে</div>
            <div className="muted-p" style={{ maxWidth: '44ch' }}>আমরা তোমার পেমেন্ট মিলিয়ে দেখছি। অনুমোদন হলে SMS পাবে — সাধারণত ২-৪ ঘণ্টার মধ্যেই হয়ে যায়।</div>
          </div>
        ) : p.status === 'approved' ? (
          <div style={{ ...box, border: '1px solid var(--brand)' }}>
            <Penguin size={96} />
            <div className="h2" style={{ color: 'var(--brand)' }}>অনুমোদন হয়েছে</div>
            <div className="muted-p" style={{ maxWidth: '44ch' }}>{newCourse.title} এখন খোলা। যেকোনো সময় শুরু করতে পারো।</div>
            <Link href="/" className="btn btn-primary" style={{ padding: '0 24px' }}>Start Course</Link>
          </div>
        ) : (
          <div style={{ ...box, border: '1px solid var(--margin)' }}>
            <div className="h2" style={{ color: 'var(--margin)' }}>অনুমোদন হয়নি</div>
            {p.reason ? <div className="t13 w500" style={{ color: 'var(--margin)' }}>কারণ — {p.reason}</div> : null}
            <div className="muted-p" style={{ maxWidth: '44ch' }}>তোমার TrxID মেলেনি। আবার দেখে জমা দাও, নয়তো {supportPhone} নম্বরে যোগাযোগ করো।</div>
            <button className="btn" style={{ padding: '0 24px' }} onClick={() => { set(resetPayment); router.push('/enroll/pay'); }}>Resubmit</button>
          </div>
        )}
      </div>

      <div className="section-label">যা জমা দিয়েছ</div>
      <div className="stack">
        <Row k="Course" v={newCourse.title} />
        <Row k="Method" v={(p.method || '') + ' · ' + taka(newCourse.price, numerals)} />
        <Row k="TrxID" v={p.trxId || '—'} mono />
        <Row k="নম্বর" v={p.sender || defaultStudent.phone} mono />
      </div>
    </Shell>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '12px 16px' }}>
      <span className="t13 ink3" style={{ minWidth: 110 }}>{k}</span>
      <span className={'t15' + (mono ? ' mono' : '')}>{v}</span>
    </div>
  );
}
