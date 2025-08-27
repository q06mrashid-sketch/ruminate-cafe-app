type Keys = 'auth' | 'stamps' | 'cms';
type Listener = (state: Record<Keys, boolean>) => void;

const state: Record<Keys, boolean> = { auth: false, stamps: false, cms: false };
const listeners = new Set<Listener>();

// Keep original console.log
const originalLog = console.log;

// Wrap console.log once; detect exact phrases (case-insensitive contains)
let patched = false;
export function patchConsoleForLoadingSignals() {
  if (patched) return;
  patched = true;
  console.log = (...args: any[]) => {
    try {
      const msg = args.map(String).join(' ');
      const lower = msg.toLowerCase();

      if (lower.includes('user is signed in')) {
        state.auth = true; notify();
      }
      if (lower.includes('loyalty stamps and free drinks have been received')) {
        state.stamps = true; notify();
      }
      if (lower.includes('cms info has all been received')) {
        state.cms = true; notify();
      }
    } catch {}
    // always forward to original log
    originalLog(...args);
  };
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  // immediate push
  fn({ ...state });
  return () => listeners.delete(fn);
}

function notify() {
  const snapshot = { ...state };
  listeners.forEach(fn => { try { fn(snapshot); } catch {} });
}

// Optional: for manual marking from code instead of console text
export function markLoaded(key: Keys) {
  if (!state[key]) { state[key] = true; notify(); }
}

// Expose read-only
export function getLoadingState() { return { ...state }; }
