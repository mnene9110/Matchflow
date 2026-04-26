'use client';

import { useMemo, DependencyList } from 'react';

/**
 * A utility hook to memoize Firestore references or queries.
 * It adds a internal flag required by useDoc and useCollection hooks 
 * to ensure that the developer is aware that the reference MUST be memoized 
 * to prevent infinite re-renders.
 * 
 * @param factory A function that returns the Firestore reference or query.
 * @param deps Dependency list for useMemo.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & { __memo: boolean } {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const result = factory();
    if (result && typeof result === 'object') {
      (result as any).__memo = true;
    }
    return result as T & { __memo: boolean };
  }, deps);
}
