'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { pastCertificate } from '@/lib/data';
import { counts, myPrograms } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { Icon } from './ui';

export function CertRow({ icon, tone, title, meta, action }: { icon: string; tone: [string, string]; title: string; meta: string; action: ReactNode }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <span className="tile" style={{ width: 48, height: 48, borderRadius: 14, background: tone[0], color: tone[1] }}><Icon name={icon} size={26} fill /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta}</div>
      </div>
      {action}
    </div>
  );
}

/** Certificates the student holds, then one locked row per single course still in progress. Diploma subjects give none. */
export function CertificateList() {
  const { s } = useStore();
  const view = <Link href="/certificate" className="btn btn-sm">View</Link>;
  const earnedTone: [string, string] = ['var(--sun)', 'var(--on-sun)'];
  const singles = myPrograms(s).filter((m) => m.program.kind === 'single').flatMap((m) => m.courses);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--card-cols)', gap: 12 }}>
      <CertRow icon="workspace_premium" tone={earnedTone} title={pastCertificate.title} meta={pastCertificate.meta} action={view} />
      {singles.map((c) => {
        const id = c.id, cnt = counts(s, id);
        return cnt.done >= cnt.total ? (
          <CertRow key={id} icon="workspace_premium" tone={earnedTone} title={c.titleEn} meta="Completed · just now" action={view} />
        ) : (
          <CertRow key={id} icon="lock" tone={['var(--surface-sunk)', 'var(--ink-3)']} title={c.titleEn} meta={cnt.pct + '% complete · unlocks at 100%'}
            action={<Link href={`/course/${id}`} className="btn btn-sm">Continue</Link>} />
        );
      })}
    </div>
  );
}
