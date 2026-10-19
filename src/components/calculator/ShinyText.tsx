'use client';

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number; // Segundos por ciclo
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3.5,
  className = '',
}: ShinyTextProps) {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r from-neutral-400 via-white to-neutral-400 font-mono tracking-tight animate-shine ${className}`}
      style={{
        backgroundSize: '200% 100%',
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
}
