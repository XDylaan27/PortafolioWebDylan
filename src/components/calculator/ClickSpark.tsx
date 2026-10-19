'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  speed: number;
  length: number;
  opacity: number;
  color: string;
}

export default function ClickSpark({
  sparkColor = '#38bdf8', // Tailwind sky-400
  sparkSize = 10,
  sparkRadius = 25,
  sparkCount = 8,
  duration = 450,
  children,
  className = '',
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const colors = [
    sparkColor,
    '#a855f7', // purple-500
    '#38bdf8', // sky-400
    '#34d399', // emerald-400
    '#f43f5e', // rose-500
  ];

  // Redimensionar canvas según contenedor
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sparksRef.current = sparksRef.current.filter((spark) => spark.opacity > 0);

    sparksRef.current.forEach((spark) => {
      spark.x += Math.cos(spark.angle) * spark.speed;
      spark.y += Math.sin(spark.angle) * spark.speed;
      spark.opacity -= 1 / (duration / 16.6);

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = spark.color;
      ctx.globalAlpha = Math.max(0, spark.opacity);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      const x2 = spark.x - Math.cos(spark.angle) * spark.length;
      const y2 = spark.y - Math.sin(spark.angle) * spark.length;

      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    });

    if (sparksRef.current.length > 0) {
      animationFrameId.current = requestAnimationFrame(draw);
    }
  }, [duration]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSparks: Spark[] = [];
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
      const speed = (sparkRadius / (duration / 16.6)) * (0.8 + Math.random() * 0.5);
      const color = colors[Math.floor(Math.random() * colors.length)];
      newSparks.push({
        x,
        y,
        angle,
        speed,
        length: sparkSize * (0.6 + Math.random() * 0.8),
        opacity: 1,
        color,
      });
    }

    sparksRef.current.push(...newSparks);
    if (!animationFrameId.current || sparksRef.current.length === newSparks.length) {
      animationFrameId.current = requestAnimationFrame(draw);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative inline-block w-full ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      />
      {children}
    </div>
  );
}
