import { InteractionManager } from 'react-native';

type Keys = 'auth' | 'stamps' | 'cms';
type Listener = (state: Record<Keys, boolean>) => void;

const state: Record<Keys, boolean> = { auth: false, stamps: false, cms: false };
const listeners = new Set<Listener>();

export function subscribe(fn: Listener) {
  listeners.add(fn);
  const t = setTimeout(() => {
    if (typeof InteractionManager?.runAfterInteractions === 'function') {
      InteractionManager.runAfterInteractions(() => fn({ ...state }));
    } else {
      fn({ ...state });
    }
  }, 0);
  return () => {
    listeners.delete(fn);
    clearTimeout(t);
  };
}

function notify() {
  const snapshot = { ...state };

  listeners.forEach(fn => {
    try { fn(snapshot); } catch {}
  });
}

function scheduleNotify() {
  // Defer until after commit so React isn't mid-insertion effect when listeners update state
  setTimeout(() => {
    if (typeof InteractionManager?.runAfterInteractions === 'function') {
      InteractionManager.runAfterInteractions(() => notify());
    } else {
      notify();
    }
  }, 0);
}

// Mark a loader as complete. Idempotent.
export function markLoaded(key: Keys) {
  if (!state[key]) {
    state[key] = true;
    scheduleNotify();
  }
}

// Expose read-only
export function getLoadingState() { return { ...state }; }
