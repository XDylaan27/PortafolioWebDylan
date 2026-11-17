'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SecretContact() {
  const router = useRouter();
  const sequence = useRef({ count: 0, startedAt: 0 });
  const activate = () => {
    const now = Date.now();
    if (now - sequence.current.startedAt > 3000) sequence.current = { count: 0, startedAt: now };
    sequence.current.count++;
    if (sequence.current.count === 4) {
      sequence.current = { count: 0, startedAt: 0 };
      router.push('/lab/cuenta-clara');
    }
  };
  return <button type="button" onClick={activate} className="cursor-pointer select-none touch-manipulation hover:text-neutral-900 dark:hover:text-white transition-colors">contacto</button>;
}
