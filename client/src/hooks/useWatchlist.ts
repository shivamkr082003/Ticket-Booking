import { useCallback, useSyncExternalStore } from "react";
import { meApi } from "../api/index.api.ts";
import type { WatchlistState } from "../types/movie.types.ts";

// Watchlist of movie ids shared by every heart on the page. Guests keep it on the
// device; signed-in users get it from their account (device hearts merged in on sign-in).
const KEY = "cv_watchlist";
const listeners = new Set<() => void>();

function readLocal(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let state: WatchlistState = { watchlist: readLocal(), notify: [] };
let account = false;

function set(next: WatchlistState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next.watchlist)); } catch { /* storage blocked — keep in memory */ }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep guest tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && !account) { state = { ...state, watchlist: readLocal() }; listener(); }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Called by <WatchlistSync/> when the signed-in user changes */
export async function syncWatchlistAccount(signedIn: boolean) {
  account = signedIn;
  if (!signedIn) { set({ watchlist: readLocal(), notify: [] }); return; }
  try {
    const local = readLocal();
    set(local.length ? await meApi.mergeWatchlist(local) : await meApi.watchlist());
  } catch { /* offline / server down — keep device list */ }
}

export function useWatchlist() {
  const snap = useSyncExternalStore(subscribe, () => state);

  const toggle = useCallback((id: string) => {
    const prev = state;
    const on = !prev.watchlist.includes(id);
    set({
      watchlist: on ? [...prev.watchlist, id] : prev.watchlist.filter(x => x !== id),
      notify:    on ? prev.notify : prev.notify.filter(x => x !== id),
    });
    if (account) (on ? meApi.watch(id) : meApi.unwatch(id)).then(set).catch(() => set(prev));
  }, []);

  /** "Notify me when bookings open" — needs an account; returns false for guests */
  const toggleNotify = useCallback((id: string) => {
    if (!account) return false;
    const prev = state;
    const on = !prev.notify.includes(id);
    set({
      watchlist: on && !prev.watchlist.includes(id) ? [...prev.watchlist, id] : prev.watchlist,
      notify:    on ? [...prev.notify, id] : prev.notify.filter(x => x !== id),
    });
    (on ? meApi.notifyOn(id) : meApi.notifyOff(id)).then(set).catch(() => set(prev));
    return true;
  }, []);

  const has       = useCallback((id: string) => snap.watchlist.includes(id), [snap]);
  const notifying = useCallback((id: string) => snap.notify.includes(id), [snap]);

  return { ids: snap.watchlist, has, toggle, notifying, toggleNotify };
}
