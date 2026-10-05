"use client";

import { useCallback, useSyncExternalStore } from "react";

type Updater<T> = T | ((prev: T) => T);

type Store<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: Updater<T>) => void;
};

const stores = new Map<string, Store<unknown>>();

function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / disabled (private mode) — keep working in memory.
  }
}

function createStore<T>(key: string, initial: T, sanitize: (raw: unknown) => T | null): Store<T> {
  let state = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    const raw = readStorage(key);
    if (raw !== undefined) {
      const clean = sanitize(raw);
      if (clean !== null) state = clean;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    loaded = false;
    state = initial;
    load();
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      load();
      return state;
    },
    getServerSnapshot() {
      return initial;
    },
    set(next) {
      load();
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      writeStorage(key, state);
      emit();
    },
  };
}

/**
 * State mirrored to localStorage.
 *
 * Hydration-safe: the server render and the hydration pass both use `initial`,
 * then React re-renders with the stored value (useSyncExternalStore handles the
 * switch). `sanitize` validates whatever was found in storage — return null to
 * discard it.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  sanitize: (raw: unknown) => T | null,
): [T, (next: Updater<T>) => void] {
  let store = stores.get(key) as Store<T> | undefined;
  if (!store) {
    store = createStore(key, initial, sanitize);
    stores.set(key, store as Store<unknown>);
  }
  const s = store;
  const value = useSyncExternalStore(s.subscribe, s.getSnapshot, s.getServerSnapshot);
  const set = useCallback((next: Updater<T>) => s.set(next), [s]);
  return [value, set];
}

/** Current value of a persistent store outside render (e.g. in a mount effect). */
export function readPersistentState<T>(key: string): T | undefined {
  const store = stores.get(key) as Store<T> | undefined;
  return store?.getSnapshot();
}
