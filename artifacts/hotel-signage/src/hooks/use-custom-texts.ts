import { useState, useEffect } from 'react';

const STORAGE_KEY = 'hotel_signage_custom_texts';

export function useCustomTexts() {
  const [customTexts, setCustomTexts] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomTexts(parsed.filter((t): t is string => typeof t === 'string'));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const persist = (next: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  };

  const addCustomText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setCustomTexts((prev) => {
      if (prev.includes(trimmed)) return prev;
      return persist([...prev, trimmed]);
    });
  };

  const removeCustomText = (text: string) => {
    setCustomTexts((prev) => persist(prev.filter((t) => t !== text)));
  };

  return { customTexts, addCustomText, removeCustomText };
}
