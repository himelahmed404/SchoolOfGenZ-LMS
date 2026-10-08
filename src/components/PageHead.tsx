import type { ReactNode } from 'react';

/** Title row of a list page. The title itself shows on desktop only; phones have it in the top bar. */
export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <h1 className="d1 only-desktop" style={{ margin: '0 0 6px' }}>{title}</h1>
        {sub ? <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink-2)', maxWidth: '60ch' }}>{sub}</div> : null}
      </div>
      {action}
    </div>
  );
}
