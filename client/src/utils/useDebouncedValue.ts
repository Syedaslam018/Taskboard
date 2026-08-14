import { useEffect, useState } from "react";

/**
 * Returns a version of `value` that only updates after `delayMs` of no
 * further changes - used for the task search box so we don't fire a
 * request on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
