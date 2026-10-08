'use client';

import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { taka } from '@/lib/format';
import { myPayments } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import type { PayStatus } from '@/lib/types';

const STATUS: Record<PayStatus, [string, string, string]> = {
  approved: ['Approved', 'var(--ok-soft)', 'var(--ok)'],
  pending: ['Pending', 'var(--warn-soft)', 'var(--warn)'],
  rejected: ['Not approved', 'var(--margin-soft)', 'var(--margin)'],
};

/** The student's own payments and where each one stands. */
export default function PaymentsPage() {
  const { s } = useStore();
  const rows = myPayments(s);
  const paid = rows.filter((r) => r.status === 'approved').reduce((a, r) => a + r.amount, 0);
  const waiting = rows.filter((r) => r.status === 'pending').length;

  return (
    <Shell role="student" title="Payments">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PageHead title="Payments" sub="তোমার পাঠানো সব পেমেন্ট, আর কোনটা কোন অবস্থায় আছে।"
          action={<Link href="/explore" className="btn btn-sm"><Icon name="explore" size={18} />Explore Courses</Link>} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Total paid</span>
            <span className="disp" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{taka(paid)}</span>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Waiting for approval</span>
            <span className="disp" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800, color: waiting ? 'var(--warn)' : 'var(--ink)' }}>{waiting}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const [label, bg, fg] = STATUS[r.status];
            const body = (
              <>
                <span className="tile disp" style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-sunk)', color: 'var(--ink-2)', fontSize: 14, fontWeight: 800 }}>{r.code}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.method} · {r.trx} · {r.when}</span>
                </span>
                <span className="disp" style={{ flexShrink: 0, fontSize: 17, fontWeight: 800 }}>{taka(r.amount)}</span>
                <span style={{ flexShrink: 0, padding: '2px 10px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700 }}>{label}</span>
                {r.href ? <Icon name="chevron_right" style={{ color: 'var(--ink-3)' }} /> : <span style={{ width: 22, flexShrink: 0 }} />}
              </>
            );
            const style: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 16px', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--line)' };
            return r.href
              ? <Link key={r.id} href={r.href} className="tap" style={style}>{body}</Link>
              : <div key={r.id} style={style}>{body}</div>;
          })}
        </div>
        <div className="fine" style={{ maxWidth: '60ch' }}>টাকা পাঠিয়ে TrxID জমা দিলে সাধারণত ২–৪ ঘণ্টার মধ্যে অনুমোদন হয়। কোনো সমস্যা হলে Help পাতায় সাপোর্টের নম্বর আছে।</div>
      </div>
    </Shell>
  );
}
