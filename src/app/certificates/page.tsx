'use client';

import { CertificateList } from '@/components/Certificates';
import { PageHead } from '@/components/PageHead';
import { Shell } from '@/components/Shell';

export default function CertificatesPage() {
  return (
    <Shell role="student" title="Certificates">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHead title="Certificates" sub="কোর্সের সব লেসন শেষ করলে সার্টিফিকেট খুলে যায়। সেটা ডাউনলোড আর শেয়ার করতে পারবে।" />
        <CertificateList />
      </div>
    </Shell>
  );
}
