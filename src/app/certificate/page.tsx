'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useGuard } from '@/components/useGuard';
import { pastCertificate } from '@/lib/data';
import { counts, isSingle, studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function CertificatePage() {
  const { s } = useStore();
  const allowed = useGuard();
  if (!allowed) return null;

  // Certificates belong to single courses: the one just finished, else the one the student already holds.
  const cur = s.catalog.courses[s.last.courseId];
  const cnt = cur ? counts(s, cur.id) : null;
  const title = cur && cnt && cnt.done >= cnt.total && isSingle(s, cur.id) ? cur.title : pastCertificate.title;

  const share = () => {
    const url = window.location.href;
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div data-print="sheet" style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--col-pad)', background: 'var(--paper)' }}>
      <div style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 720, padding: 'var(--cert-pad)', border: '1px solid var(--line)', borderRadius: 28, background: 'repeating-linear-gradient(180deg, transparent 0 31px, var(--rule) 31px 32px), var(--surface)', boxShadow: 'var(--overlay)', textAlign: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 'var(--cert-margin)', width: 2, background: 'var(--margin)', opacity: 0.4 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
          <div className="tile disp" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 18, fontWeight: 800 }}>G</div>
          <span className="disp" style={{ fontSize: 18, fontWeight: 700 }}>School of GenZ</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>এই সার্টিফিকেট দেওয়া হলো</div>
        <div className="disp" style={{ fontSize: 'var(--cert-name)', lineHeight: 1.25, fontWeight: 800, margin: '10px 0 22px' }}><span className="hl">{studentName(s)}</span></div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>সফলভাবে শেষ করার জন্য</div>
        <div className="disp" style={{ fontSize: 'var(--d2)', lineHeight: 1.3, fontWeight: 700, margin: '6px 0 32px' }}>{title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          <Meta k="Issued" v="23 Aug 2026" />
          <Meta k="Certificate ID" v="SGZ-2026-04812" />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 28, padding: '6px 14px', borderRadius: 999, background: 'var(--ok-soft)', color: 'var(--ok)', fontSize: 13, fontWeight: 700 }}>
          <Icon name="verified" size={18} fill />School of GenZ-এ যাচাই করা হয়েছে
        </div>
      </div>
      <div data-print="hide" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
        <button className="btn" style={{ padding: '0 20px' }} onClick={share}><Icon name="share" size={20} />Share on Facebook</button>
        <Link href="/" className="btn btn-primary" style={{ padding: '0 20px' }}>Back to Home</Link>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ padding: '10px 16px', borderRadius: 14, background: 'var(--surface-sunk)' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
    </div>
  );
}
