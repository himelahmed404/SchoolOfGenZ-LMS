import { blockHasContent } from '@/lib/selectors';
import type { Block } from '@/lib/types';
import { Tex } from './Tex';

/** Lesson notes exactly as a student sees them. Used by the lesson player and the admin preview. */
export function NoteBlocks({ blocks }: { blocks: Block[] }) {
  const shown = blocks.filter(blockHasContent);
  return (
    <article className="read" style={{ maxWidth: '68ch', color: 'var(--ink)' }}>
      {shown.map((b, i) => {
        const last = i === shown.length - 1;
        switch (b.t) {
          case 'h':
            return <h2 key={i} className="h3" style={{ fontFamily: 'var(--font-ui)', margin: '0 0 12px' }}>{b.x}</h2>;
          case 'p':
            return <p key={i} style={{ margin: last ? 0 : '0 0 20px' }}>{b.x}</p>;
          case 'code':
            return (
              <pre key={i} className="mono" style={{ background: 'var(--surface-sunk)', border: '1px solid var(--line)', borderRadius: 2, padding: '14px 16px', margin: last ? 0 : '0 0 20px', fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{b.x}</pre>
            );
          case 'list':
            return (
              <ul key={i} style={{ margin: last ? 0 : '0 0 24px', paddingLeft: 22 }}>
                {(b.x || '').split('\n').filter((l) => l.trim()).map((l, j, arr) => (
                  <li key={j} style={{ marginBottom: j === arr.length - 1 ? 0 : 8 }}>{l}</li>
                ))}
              </ul>
            );
          case 'img':
            return (
              <figure key={i} style={{ margin: last ? 0 : '0 0 20px' }}>
                <div className="ph" style={{ height: 180, borderRadius: 2 }}>{b.file}</div>
                {b.cap ? <figcaption className="t13 ink3" style={{ marginTop: 6, fontFamily: 'var(--font-ui)' }}>{b.cap}</figcaption> : null}
              </figure>
            );
          case 'fx':
            return <div key={i} style={{ padding: '6px 0', overflowX: 'auto', margin: last ? 0 : '0 0 20px' }}><Tex src={b.x} /></div>;
        }
      })}
    </article>
  );
}
