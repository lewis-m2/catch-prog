import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Runs a database query and re-runs it whenever the data it read changes, so
 * screens update straight after a save. Undefined until the first result.
 * (A small version of `dexie-react-hooks`, to avoid another dependency.)
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [result, setResult] = useState<{ value: T } | undefined>(undefined);

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (value) => setResult({ value }),
      error: (error: unknown) => console.error('Database query failed', error),
    });
    return () => subscription.unsubscribe();
    // The caller lists what the query depends on, as with useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result?.value;
}
