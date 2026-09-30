'use client';

import { useEffect } from 'react';

export default function PwaManager() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Error registrando Service Worker:', err);
      });
    }
  }, []);

  return null;
}
