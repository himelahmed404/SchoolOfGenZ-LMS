'use client';

import Link from 'next/link';
import { courses, defaultStudent } from '@/lib/data';
import { studentName } from '@/lib/selectors';
import { useStore } from '@/lib/store';

export default function CertificatePage() {
  const { s, ready } = useStore();
  if (!ready) return null;

  const share = () => {
    const url = window.location.href;
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ minHeight: 'calc(100dvh - var(--devbar-h, 0px))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--test-pad)', background: 'var(--paper)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 680, padding: 'var(--cert-pad)', textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          <div className="logo" style={{ width: 22, height: 22 }} />
          <span className="t15 w600">School of GenZ</span>
        </div>
        <div className="t13 ink2">এই সার্টিফিকেট দেওয়া হলো</div>
        <div className="h1" style={{ margin: '8px 0 20px' }}>{studentName(s)}</div>
        <div className="t13 ink2">সফলভাবে শেষ করার জন্য</div>
        <div className="h3" style={{ margin: '6px 0 32px' }}>{courses.cst.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 40px', paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          <Meta k="Issued" v="23 Aug 2026" />
          <Meta k="Certificate ID" v="SGZ-2026-04812" />
          <Meta k="Batch" v={defaultStudent.batch} />
        </div>
        <div className="row t13 ink2" style={{ justifyContent: 'center', gap: 8, marginTop: 28 }}>
          <span style={{ color: 'var(--brand)' }}>✓</span>
          <span>School of GenZ-এ যাচাই করা হয়েছে</span>
        </div>
      </div>
      <div data-print="hide" className="row" style={{ marginTop: 20 }}>
        <button className="btn" onClick={share}>Share on Facebook</button>
        <Link href="/" className="btn btn-link">Back to Home</Link>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="t12 ink3">{k}</div>
      <div className="mono t13 w500">{v}</div>
    </div>
  );
}
