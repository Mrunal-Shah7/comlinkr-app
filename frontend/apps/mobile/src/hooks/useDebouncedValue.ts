// src/hooks/useDebouncedValue.ts
import { useEffect, useState } from 'react';

/** The value, updated only after it has stayed the same for `ms` (search fields feeding a query key). */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
