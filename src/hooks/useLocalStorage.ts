import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error: any) {
      const isQuotaError = 
        error?.name === 'QuotaExceededError' || 
        error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error?.code === 22 ||
        error?.code === 1014 ||
        error?.number === -2147024882 ||
        (typeof error?.message === 'string' && error.message.toLowerCase().includes('quota'));

      if (isQuotaError) {
        console.warn(`localStorage quota exceeded for key "${key}". Safely clearing to prevent crashing.`);
        try {
          window.localStorage.removeItem(key);
        } catch (_) {}
      } else {
        console.warn(`Warning writing to localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

