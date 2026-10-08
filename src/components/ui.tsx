import type { CSSProperties } from 'react';

/** Material Symbols Rounded glyph; `name` is the icon's ligature name (e.g. "home"). */
export function Icon({ name, size = 22, fill, style, className }: { name: string; size?: number; fill?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <span className={'ico' + (fill ? ' fill' : '') + (className ? ' ' + className : '')} style={{ fontSize: size, ...style }} aria-hidden>
      {name}
    </span>
  );
}

/** First letter of a name (code point, so Bangla conjunct bases stay intact). */
export const initial = (name: string) => Array.from(name.trim())[0] || '';

/** Sun-yellow initial disc used for the signed-in person. */
export function Avatar({ name, size, fontSize, style }: { name: string; size: number; fontSize: number; style?: CSSProperties }) {
  return (
    <div className="avatar-sun" style={{ width: size, height: size, fontSize, ...style }} aria-hidden>
      {initial(name)}
    </div>
  );
}
