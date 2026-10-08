'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyBrand, BRAND } from './brand';
import { digits, type Numerals } from './format';
import { item } from './selectors';
import { initialState, type AppState } from './state';

const STORAGE_KEY = 'sgz-lms-v1';

type Updater = (s: AppState) => AppState;
type Toast = 'small' | 'big' | null;

interface Store {
  s: AppState;
  ready: boolean;
  set: (fn: Updater) => void;
  /** Digits in the viewer's numeral preference. */
  n: (v: string | number) => string;
  numerals: Numerals;
  theme: 'light' | 'dark';
  toast: Toast;
  showToast: (t: Toast) => void;
  /** Notifications drawer (view state, not persisted). */
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

function load(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== initialState.version) return initialState;
    return { ...initialState, ...parsed, prefs: { ...initialState.prefs, ...parsed.prefs } };
  } catch {
    return initialState;
  }
}

function systemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [sys, setSys] = useState<'light' | 'dark'>('light');
  const [toast, setToast] = useState<Toast>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Saved state is read after mount: the server render has no localStorage, and the first client render must match it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setS(load());
    setSys(systemTheme());
    setReady(true);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSys(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    // Keep tabs in sync (e.g. student in one tab, admin in another) until there is a server.
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setS(load()); };
    window.addEventListener('storage', onStorage);
    return () => { mq.removeEventListener('change', on); window.removeEventListener('storage', onStorage); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }, [s, ready]);

  const theme = s.prefs.theme || sys;
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    applyBrand(el, BRAND, theme === 'dark');
  }, [theme]);

  // Simulated video upload progress (replace with real upload events).
  const uploading = !!s.upload;
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      setS((cur) => {
        if (!cur.upload) return cur;
        const pct = cur.upload.pct + 20;
        if (pct < 100) return { ...cur, upload: { ...cur.upload, pct } };
        const k = cur.upload.key, it = item(cur, k);
        return { ...cur, upload: null, tItems: { ...cur.tItems, [k]: { ...it, video: { state: 'done', name: it.video.name, dur: '14:05' } } } };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [uploading]);

  const set = useCallback((fn: Updater) => setS(fn), []);
  const showToast = useCallback((t: Toast) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(t);
    if (t === 'small') toastT.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const numerals = s.prefs.numerals;
  const value = useMemo<Store>(() => ({
    s, ready, set, numerals, theme, toast, showToast, notifOpen, setNotifOpen,
    n: (v) => digits(v, numerals),
  }), [s, ready, set, numerals, theme, toast, showToast, notifOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
