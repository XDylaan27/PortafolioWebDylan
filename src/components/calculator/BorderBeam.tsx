'use client';

import React from 'react';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  anchor?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
  className?: string;
}

export default function BorderBeam({
  size = 200,
  duration = 12,
  borderWidth = 1.5,
  colorFrom = '#38bdf8',
  colorTo = '#a855f7',
  delay = 0,
  className = '',
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--anchor': '90',
          '--border-width': `${borderWidth}px`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': `-${delay}s`,
        } as React.CSSProperties
      }
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] ${className}`}
    >
      <div
        className="absolute aspect-square w-[calc(var(--size))] bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent"
        style={{
          animation: 'border-beam-move var(--duration) infinite linear',
          animationDelay: 'var(--delay)',
          offsetPath: 'rect(0 auto auto 0 round var(--radius, 1.5rem))',
        }}
      />
      <style jsx>{`
        @keyframes border-beam-move {
          100% {
            offset-distance: 100%;
          }
        }
      `}</style>
    </div>
  );
}
