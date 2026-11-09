import { useRef } from "react";

/** The latest non-null value, kept after it turns null: a sheet keeps showing its item while it slides away. */
export function useLastNonNull<T>(value: T | null | undefined): T | null {
  const last = useRef<T | null>(value ?? null);
  if (value != null) last.current = value;
  return last.current;
}
