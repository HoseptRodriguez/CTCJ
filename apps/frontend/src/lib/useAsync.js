import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads one independent piece of a page. Each section of a dashboard owns
 * its own request, so one slow or failing source never blanks the others:
 * the section shows its own Skeleton, EmptyState or ErrorState.
 *
 * @template T
 * @param {() => Promise<T>} load   -- re-run when `deps` change or reload() is called
 * @param {unknown[]} deps
 * @param {{ enabled?: boolean }} [options] -- enabled:false never calls `load`
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', data: T|undefined, error: unknown, reload: () => void, setData: (fn: (d: T) => T) => void }}
 */
export function useAsync(load, deps, { enabled = true } = {}) {
  const [state, setState] = useState({
    status: enabled ? 'loading' : 'idle',
    data: undefined,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: undefined, error: null });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    loadRef
      .current()
      .then((data) => !cancelled && setState({ status: 'ready', data, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', data: undefined, error }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, attempt, ...deps]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  return { ...state, reload, setData };
}
