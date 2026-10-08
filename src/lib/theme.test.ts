import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ThemeModule = typeof import('./theme');

/** A fresh copy of the module (it keeps a fallback value) over a fake window. */
async function load(storage: Partial<Storage> | null): Promise<ThemeModule> {
  vi.resetModules();
  vi.stubGlobal('window', storage ? { localStorage: storage, addEventListener: vi.fn(), removeEventListener: vi.fn() } : undefined);
  return import('./theme');
}

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { data, getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
}

beforeEach(() => { vi.unstubAllGlobals(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('theme', () => {
  it('is light when nothing was chosen', async () => {
    const t = await load(fakeStorage());
    expect(t.readTheme()).toBe('light');
  });

  it('is light for any saved value other than dark', async () => {
    expect((await load(fakeStorage({ 'sgz-theme': 'system' }))).readTheme()).toBe('light');
    expect((await load(fakeStorage({ 'sgz-theme': 'dark' }))).readTheme()).toBe('dark');
  });

  it('saves the choice and tells subscribers', async () => {
    const store = fakeStorage();
    const t = await load(store);
    const heard = vi.fn();
    const stop = t.subscribeTheme(heard);
    t.writeTheme('dark');
    expect(store.data['sgz-theme']).toBe('dark');
    expect(t.readTheme()).toBe('dark');
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    t.writeTheme('light');
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('still switches for the visit when storage is blocked', async () => {
    const t = await load({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(t.readTheme()).toBe('light');
    t.writeTheme('dark');
    expect(t.readTheme()).toBe('dark');
  });

  it('applies the same rule before first paint', async () => {
    const t = await load(null);
    expect(t.THEME_SCRIPT).toContain("localStorage.getItem('sgz-theme')==='dark'?'dark':'light'");
    expect(t.THEME_SCRIPT).not.toContain('prefers-color-scheme');
  });
});
