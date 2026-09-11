import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';

export function useHybridState<T extends string>(
  key: string,
  initialValue: T,
  options?: { enabled?: boolean }
): [T, (val: T) => void] {
  const enabled = options?.enabled ?? true;
  const [searchParams, setSearchParams] = useSearchParams();
  const [lsValue, setLsValue] = useLocalStorage<T>(key, initialValue);

  // Derive active value from URL first, then LS, then initial
  const urlValue = searchParams.get(key) as T | null;
  const activeValue = (enabled && urlValue) ? urlValue : (lsValue || initialValue);

  const setValue = useCallback(
    (newValue: T) => {
      // Update LS
      setLsValue(newValue);
      
      if (enabled) {
        // Update URL without triggering a heavy navigation if possible, but React Router handles it well.
        setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set(key, newValue);
          return newParams;
        }, { replace: true });
      }
    },
    [key, setLsValue, setSearchParams, enabled]
  );

  // Hydrate URL on mount if it's missing but we have it in LS and it's not the initial default
  useEffect(() => {
    if (enabled && !urlValue && lsValue && lsValue !== initialValue) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set(key, lsValue);
        return newParams;
      }, { replace: true });
    }
  }, [key, urlValue, lsValue, initialValue, setSearchParams, enabled]);

  return [activeValue, setValue];
}
