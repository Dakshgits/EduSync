import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';

/** Runs an async loader on mount (and when deps change). Returns { data, loading, error, reload, setData }. */
export default function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const ref = useRef(loader);
  ref.current = loader;

  const run = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await ref.current();
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
    }
  }, []);

  useEffect(() => { alive.current = true; run(); return () => { alive.current = false; }; }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: () => run(true), retry: () => run(false), setData: (data) => setState((s) => ({ ...s, data })) };
}
