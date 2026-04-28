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

  const saveLogos = (newLogos: Record<string, string>) => {
    setLogos(newLogos);
    localStorage.setItem('hotel_signage_logos', JSON.stringify(newLogos));
  };

  const addLogos = (newEntries: Record<string, string>) => {
    saveLogos({ ...logos, ...newEntries });
  };

  const removeLogo = (id: string) => {
    const next = { ...logos };
    delete next[id];
    saveLogos(next);
  };

  return { logos, addLogos, removeLogo };
}
