'use client';

import type { Me, ProfileBody } from '@contract';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { api, ApiFailure } from './api/client';
import { ME_KEY } from './api/session';
import { applyBrand, BRAND } from './brand';
import { digits, type Numerals } from './format';
import { item } from './selectors';
import { initialState, type AppState } from './state';
import { readTheme, subscribeTheme, writeTheme, type Theme } from './theme';

const STORAGE_KEY = 'sgz-lms-v1';

type Updater = (s: AppState) => AppState;
type Toast = 'small' | 'big' | null;

interface Store {
  s: AppState;
  /** False until this browser's saved state is loaded and the API has said who is signed in. */
  ready: boolean;
  set: (fn: Updater) => void;
  /** The signed-in person, or null. The same as `s.me`; trust a null only once `ready`. */
  me: Me | null;
  /** The API could not be reached, so nobody can be signed in right now. */
  offline: boolean;
  /** True from Log out until someone signs in: the person left on purpose, their session did not just end. */
  left: boolean;
  /** Remember who just signed in (by password, a code, a link or the demo button). */
  signedIn: (user: Me) => void;
  /** Sign out on the server and forget the person here. Throws when the server cannot be reached. */
  signOut: () => Promise<void>;
  /** Save changes to the person's own profile. They show at once and go back if the server refuses. */
  saveProfile: (patch: ProfileBody) => Promise<Me>;
  /** Digits in the viewer's numeral preference. */
  n: (v: string | number) => string;
  numerals: Numerals;
  setNumerals: (v: Numerals) => void;
  theme: Theme;
  toggleTheme: () => void;
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
    return { ...initialState, ...parsed, prefs: { ...initialState.prefs, ...parsed.prefs }, catalog: initialState.catalog, me: null };
  } catch {
    return initialState;
  }
}

/** Who is signed in. Nobody is an answer, not a failure. */
async function fetchMe(): Promise<Me | null> {
  try {
    return await api<Me>('/auth/me');
  } catch (e) {
    if (e instanceof ApiFailure && e.status === 401) return null;
    throw e;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // What this browser keeps. The account is not part of it: `me` comes from the API.
  const [local, setLocal] = useState<AppState>(initialState);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [left, setLeft] = useState(false);
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qc = useQueryClient();
  const session = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 60_000 });
  const me = session.data ?? null;
  const ready = loaded && !session.isPending;
  const numerals = me?.numerals ?? local.prefs.numerals;
  const s = useMemo<AppState>(() => ({ ...local, me, prefs: { numerals } }), [local, me, numerals]);

  // The latest values, for callbacks that run later.
  const now = useRef({ me, numerals });
  useEffect(() => { now.current = { me, numerals }; }, [me, numerals]);

  useEffect(() => {
    // Saved state is read after mount: the server render has no localStorage, and the first client render must match it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(load());
    setLoaded(true);
    // Keep tabs in sync (e.g. student in one tab, admin in another) until each slice lives on the server.
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setLocal(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Left out: the catalog (it comes from the build) and the account (it comes from the API).
    // The numerals in use are kept, so the screens before sign-in show digits the way this person reads them.
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...local, prefs: { numerals }, catalog: undefined, me: undefined })); } catch { /* storage unavailable */ }
  }, [local, numerals, loaded]);

  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'light' as Theme);
  const toggleTheme = useCallback(() => writeTheme(readTheme() === 'dark' ? 'light' : 'dark'), []);
  useEffect(() => {
    // Until the store is ready the <head> script's choice stands; writing here earlier could flash the wrong theme.
    if (!loaded) return;
    const el = document.documentElement;
    el.dataset.theme = theme;
    applyBrand(el, BRAND, theme === 'dark');
  }, [theme, loaded]);

  // Simulated video upload progress (replace with real upload events).
  const uploading = !!local.upload;
  useEffect(() => {
    if (!uploading) return;
    const t = setInterval(() => {
      setLocal((cur) => {
        if (!cur.upload) return cur;
        const pct = cur.upload.pct + 20;
        if (pct < 100) return { ...cur, upload: { ...cur.upload, pct } };
        const k = cur.upload.key, it = item(cur, k);
        return { ...cur, upload: null, tItems: { ...cur.tItems, [k]: { ...it, video: { state: 'done', name: it.video.name, dur: '14:05' } } } };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [uploading]);

  // An action sees who is signed in, but can only change what this browser keeps.
  const set = useCallback((fn: Updater) => setLocal((cur) => ({ ...fn({ ...cur, me: now.current.me }), me: null })), []);
  const showToast = useCallback((t: Toast) => {
    if (toastT.current) clearTimeout(toastT.current);
    setToast(t);
    if (t === 'small') toastT.current = setTimeout(() => setToast(null), 2000);
  }, []);

  /** Another person's answers must not be shown to this one: everything fetched for the last account is fetched again. */
  const forgetFetched = useCallback(() => { void qc.resetQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] }); }, [qc]);

  const signedIn = useCallback((user: Me) => {
    setLeft(false);
    qc.setQueryData<Me | null>(ME_KEY, user);
    forgetFetched();
  }, [qc, forgetFetched]);

  const signOut = useCallback(async () => {
    try {
      await api('/auth/signout', { method: 'POST' });
    } catch (e) {
      // Already signed out on the server is the result that was wanted. Anything else leaves the cookie in place, so say so.
      if (!(e instanceof ApiFailure && e.status === 401)) throw e;
    }
    const keep = now.current.numerals;
    setLocal((cur) => ({ ...cur, prefs: { numerals: keep } }));
    setLeft(true);
    qc.setQueryData<Me | null>(ME_KEY, null);
    // Dropped, not fetched again: nobody is signed in to fetch it for.
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
  }, [qc]);

  const saveProfile = useCallback(async (patch: ProfileBody): Promise<Me> => {
    const before = qc.getQueryData<Me | null>(ME_KEY) ?? null;
    if (before) qc.setQueryData<Me | null>(ME_KEY, { ...before, ...patch } as Me);
    try {
      const saved = await api<Me>('/me/profile', { method: 'PATCH', body: patch });
      qc.setQueryData<Me | null>(ME_KEY, saved);
      return saved;
    } catch (e) {
      qc.setQueryData<Me | null>(ME_KEY, before);
      throw e;
    }
  }, [qc]);

  const setNumerals = useCallback((v: Numerals) => {
    if (now.current.me) void saveProfile({ numerals: v }).catch(() => { /* the old setting is back; nothing was lost */ });
    else setLocal((cur) => ({ ...cur, prefs: { numerals: v } }));
  }, [saveProfile]);

  const offline = session.isError && !me;
  const value = useMemo<Store>(() => ({
    s, ready, set, me, offline, left, signedIn, signOut, saveProfile, numerals, setNumerals, theme, toggleTheme, toast, showToast, notifOpen, setNotifOpen,
    n: (v) => digits(v, numerals),
  }), [s, ready, set, me, offline, left, signedIn, signOut, saveProfile, numerals, setNumerals, theme, toggleTheme, toast, showToast, notifOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
