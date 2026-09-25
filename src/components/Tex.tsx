'use client';

import katex from 'katex';
import { useMemo } from 'react';

export function Tex({ src }: { src?: string }) {
  const s = (src || '').trim();
  const html = useMemo(() => {
    if (!s) return null;
    try { return katex.renderToString(s, { throwOnError: false }); } catch { return null; }
  }, [s]);
  if (!s) return <span className="t13 ink3" style={{ fontFamily: 'var(--font-ui)' }}>সূত্র লিখলে এখানে দেখাবে</span>;
  if (!html) return <span className="mono" style={{ fontSize: 14 }}>{s}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
