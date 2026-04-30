import { useState, useEffect } from 'react';

export function useLogos() {
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem('hotel_signage_logos');
    if (stored) {
      try {
        setLogos(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse logos', e);
      }
    }
  }, []);

  const persist = (next: Record<string, string>) => {
    localStorage.setItem('hotel_signage_logos', JSON.stringify(next));
    return next;
  };

  const addLogos = (newEntries: Record<string, string>) => {
    setLogos(prev => persist({ ...prev, ...newEntries }));
  };

  const removeLogo = (id: string) => {
    setLogos(prev => {
      const next = { ...prev };
      delete next[id];
      return persist(next);
    });
  };

  const clearLogos = () => {
    setLogos(persist({}));
  };

  return { logos, addLogos, removeLogo, clearLogos };
}
