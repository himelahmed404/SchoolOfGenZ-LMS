/*
 * Theme is light unless this device chose dark; it never follows the system setting.
 * It lives outside the app state because it belongs to the device, not the account.
 */

export type Theme = 'light' | 'dark';

const THEME_KEY = 'sgz-theme';

/** Inline <head> script: applies the saved theme before first paint, so a dark-mode user never sees a white flash. */
export const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem('${THEME_KEY}')==='dark'?'dark':'light'}catch(e){}`;

const listeners = new Set<() => void>();
/** Used when localStorage is unavailable, so the toggle still works for the visit. */
let memTheme: Theme | null = null;

export function readTheme(): Theme {
  if (memTheme) return memTheme;
  try { return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

export function writeTheme(t: Theme) {
  try { window.localStorage.setItem(THEME_KEY, t); memTheme = null; } catch { memTheme = t; }
  listeners.forEach((cb) => cb());
}

/** For useSyncExternalStore; also fires when another tab changes the theme. */
export function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) cb(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}
