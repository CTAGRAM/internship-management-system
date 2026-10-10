import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data-fetching hook: runs `fn`, tracks loading/error, and exposes a
 * `reload`. Guards against setting state after unmount or out of order.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const runId = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (alive.current && id === runId.current) setData(result);
    } catch (e) {
      if (alive.current && id === runId.current) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      if (alive.current && id === runId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void run(); }, [run]);

  return { data, error, loading, reload: run, setData };
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
