'use client';

import React, { useRef, useState, useCallback } from 'react';

interface MagnetProps {
  children: React.ReactNode;
  magnetStrength?: number; // Cuánto se mueve (p. ej. 0.2 a 0.5)
  active?: boolean;
  className?: string;
}

export default function Magnet({
  children,
  magnetStrength = 0.25,
  active = true,
  className = '',
}: MagnetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active || !ref.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const deltaX = (e.clientX - centerX) * magnetStrength;
      const deltaY = (e.clientY - centerY) * magnetStrength;

      setOffset({ x: deltaX, y: deltaY });
    },
    [active, magnetStrength]
  );

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out inline-flex justify-center items-center ${className}`}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
    >
      {children}
    </div>
  );
}
