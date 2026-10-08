'use client';

import Link from 'next/link';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';
import { Icon } from '@/components/ui';
import { newCourse } from '@/lib/data';
import { plural, taka } from '@/lib/format';
import { batchLabel } from '@/lib/selectors';
import { useStore } from '@/lib/store';

/** Courses open for enrollment. The enroll flow itself starts at /enroll. */
export default function ExplorePage() {
  const { s } = useStore();
  const st = s.payment.status;
  const cta: { label: string; href: string; primary: boolean } =
    st === 'none' ? { label: 'Enroll', href: '/enroll', primary: true }
      : st === 'pending' ? { label: 'Payment status', href: '/enroll/pending', primary: false }
        : st === 'approved' ? { label: 'Enrolled', href: '/enroll/pending', primary: false }
          : { label: 'Try again', href: '/enroll/pending', primary: true };
  const chip = st === 'pending' ? ['Payment pending', 'var(--warn-soft)', 'var(--warn)'] : st === 'approved' ? ['Enrolled', 'var(--ok-soft)', 'var(--ok)'] : st === 'rejected' ? ['Payment not approved', 'var(--margin-soft)', 'var(--margin)'] : null;

  return (
    <Shell role="student" title="Explore Courses">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="Explore Courses" sub="এখন যে কোর্সগুলোতে ভর্তি চলছে।" />
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 96, padding: '12px 18px', background: 'repeating-linear-gradient(180deg, transparent 0 31px, rgba(19,26,51,0.06) 31px 32px), var(--sun)', color: 'var(--on-sun)' }}>
            <span className="disp" style={{ fontSize: 44, lineHeight: 0.9, fontWeight: 800 }}>{newCourse.code}</span>
            {chip ? <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 999, background: chip[1], color: chip[2], fontSize: 12, fontWeight: 700 }}>{chip[0]}</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '18px 18px 20px' }}>
            <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>Skill course · {batchLabel(newCourse.batchNo)}</div>
              <div className="disp" style={{ fontSize: 22, lineHeight: 1.3, fontWeight: 700 }}>{newCourse.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--ink-2)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="person" size={18} />{newCourse.instructor}</span>
                <span>{plural(newCourse.lessons, 'lesson')} · {plural(newCourse.weeks, 'week')} · {newCourse.livePerWeek} live {newCourse.livePerWeek === 1 ? 'class' : 'classes'} a week</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="disp" style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{taka(newCourse.price)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>One-time</div>
              </div>
              <Link href={cta.href} className={'btn' + (cta.primary ? ' btn-primary' : '')} style={{ padding: '0 22px' }}>{cta.label}<Icon name="arrow_forward" size={20} /></Link>
            </div>
          </div>
        </div>
        <div className="fine" style={{ maxWidth: '60ch' }}>নতুন ব্যাচ খুললে এখানে দেখাবে, আর নোটিফিকেশনেও জানিয়ে দেবো।</div>
      </div>
    </Shell>
  );
}
