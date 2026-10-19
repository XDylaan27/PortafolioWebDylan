'use client';

import React from 'react';
import Calculator from '@/components/calculator/Calculator';
import MagnetLines from '@/components/calculator/MagnetLines';

export default function CalculatorPage() {
  return (
    <div className="relative h-[calc(100dvh-53px)] w-full flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden bg-neutral-950">
      {/* Fondo interactivo MagnetLines de React Bits para toda la página */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden opacity-45">
        <MagnetLines
          lineColor="#efefef"
          spacing={32}
          lineWidth={1}
          lineHeight={16}
          mode="orbit"
          shape="line"
          radius={70}
          fade={0.3}
          baseAngle={-45}
          edgeFade={0}
          stretch={0.4}
          reach={0}
          scatter={0}
          inertia={0.1}
          bounce={1}
          ripple={0.3}
          rainbow={false}
          tiltX={0}
          tiltY={0}
          clickPulse
          intro
          idle={false}
        />
      </div>

      {/* Calculadora en primer plano */}
      <div className="relative z-10 w-full flex justify-center">
        <Calculator />
      </div>
    </div>
  );
}
