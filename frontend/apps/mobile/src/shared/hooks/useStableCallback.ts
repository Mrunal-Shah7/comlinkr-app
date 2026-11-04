// src/shared/hooks/useStableCallback.ts
import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Returns a function with a permanent identity that always calls the latest `fn`.
 * Lets memoized list rows receive handlers without re-rendering on every parent render.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}
