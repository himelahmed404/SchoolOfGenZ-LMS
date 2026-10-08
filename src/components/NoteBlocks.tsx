import { blockHasContent } from '@/lib/selectors';
import type { Block } from '@/lib/types';
import { Tex } from './Tex';
import { Icon } from './ui';

const SEP = ' — ';

/**
 * Lesson notes exactly as a student sees them (v6 article look). Used by the lesson player and the
 * admin content preview. A single-line code block reads as a key-point callout; a list whose lines are
 * all `term — meaning` becomes a term/definition grid.
 */
export function NoteBlocks({ blocks }: { blocks: Block[] }) {
  const shown = blocks.filter(blockHasContent);
  return (
    <article style={{ maxWidth: '68ch', fontFamily: 'var(--font-read)', fontSize: 17, lineHeight: 1.9, color: 'var(--ink)' }}>
      {shown.map((b, i) => {
        const gap = i === shown.length - 1 ? 0 : 24;
        switch (b.t) {
          case 'h':
            return <h2 key={i} className="disp" style={{ fontSize: 'var(--h1)', lineHeight: 1.3, fontWeight: 700, margin: (i ? '8px' : '0') + ' 0 10px' }}>{b.x}</h2>;
          case 'p':
            return <p key={i} style={{ margin: `0 0 ${gap ? 20 : 0}px` }}>{b.x}</p>;
          case 'code': {
            const text = b.x || '';
            if (!text.includes('\n')) {
              return (
                <div key={i} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: `0 0 ${gap}px`, padding: '14px 18px', borderRadius: 16, background: 'var(--sun)', color: 'var(--on-sun)', fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
                  <Icon name="layers" />{text}
                </div>
              );
            }
            return <pre key={i} className="mono" style={{ margin: `0 0 ${gap}px`, padding: '12px 16px', borderRadius: 14, background: 'var(--surface-sunk)', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</pre>;
          }
          case 'list': {
            const lines = (b.x || '').split('\n').map((l) => l.trim()).filter(Boolean);
            if (lines.every((l) => l.includes(SEP))) {
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', gap: '10px 14px', alignItems: 'baseline', margin: `0 0 ${gap ? 32 : 0}px` }}>
                  {lines.map((l, j) => {
                    const at = l.indexOf(SEP);
                    return [
                      <span key={j + 'k'} className="mono" style={{ justifySelf: 'start', fontSize: 14, fontWeight: 600, padding: '2px 10px', borderRadius: 8, background: 'var(--brand-soft)', color: 'var(--brand)', lineHeight: 1.6 }}>{l.slice(0, at)}</span>,
                      <span key={j + 'v'}>{l.slice(at + SEP.length)}</span>,
                    ];
                  })}
                </div>
              );
            }
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: `0 0 ${gap}px` }}>
                {lines.map((l, j) => <div key={j} style={{ display: 'flex', gap: 10 }}><span style={{ color: 'var(--ink-3)' }}>–</span><span>{l}</span></div>)}
              </div>
            );
          }
          case 'img':
            return (
              <figure key={i} style={{ margin: `0 0 ${gap}px` }}>
                <div className="mono" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, border: '1px solid var(--line)', background: 'var(--surface-sunk)', fontSize: 11, color: 'var(--ink-2)' }}>{b.file}</div>
                {b.cap ? <figcaption style={{ marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)' }}>{b.cap}</figcaption> : null}
              </figure>
            );
          case 'fx':
            return <div key={i} style={{ padding: '6px 0', overflowX: 'auto', fontSize: 18, margin: `0 0 ${gap}px` }}><Tex src={b.x} /></div>;
        }
      })}
    </article>
  );
}
