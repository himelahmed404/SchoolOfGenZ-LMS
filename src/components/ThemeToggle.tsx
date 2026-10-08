'use client';

import type { CSSProperties } from 'react';
import { useStore } from '@/lib/store';
import { Icon } from './ui';

/** Light/dark switch. The icon shows the mode a press switches to. */
export function ThemeToggle({ className = 'icon-btn', size = 22, style }: { className?: string; size?: number; style?: CSSProperties }) {
  const { theme, toggleTheme } = useStore();
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button className={className} style={style} onClick={toggleTheme} aria-pressed={dark} aria-label="Dark mode" title={label}>
      <Icon name={dark ? 'light_mode' : 'dark_mode'} size={size} />
    </button>
  );
}
