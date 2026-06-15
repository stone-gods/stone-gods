"use client";

import { useMemo, type CSSProperties } from "react";

type Particle = {
  id: string;
  angle: number;
  distance: number;
  color: string;
  size: number;
};

type Burst = {
  id: string;
  x: number;
  y: number;
  delay: number;
  particles: Particle[];
};

const COLORS = ["#fde047", "#fbbf24", "#f97316", "#ef4444", "#a78bfa", "#38bdf8", "#fff"];

function buildBurst(id: string, x: number, y: number, delay: number, count: number): Burst {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: `${id}-p${i}`,
      angle: (360 / count) * i + Math.random() * 18,
      distance: 48 + Math.random() * 72,
      color: COLORS[i % COLORS.length]!,
      size: 4 + Math.random() * 5,
    });
  }
  return { id, x, y, delay, particles };
}

export default function WinFireworks() {
  const bursts = useMemo(() => {
    const items: Burst[] = [];
    const positions = [
      [18, 22],
      [82, 18],
      [50, 12],
      [28, 55],
      [72, 48],
      [12, 78],
      [88, 72],
      [45, 38],
      [60, 65],
      [35, 30],
      [65, 28],
      [52, 82],
    ] as const;

    positions.forEach(([x, y], i) => {
      items.push(buildBurst(`b${i}`, x, y, i * 0.38, 10 + (i % 3) * 2));
    });
    return items;
  }, []);

  return (
    <div className="win-fireworks" aria-hidden>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="win-fireworks__burst"
          style={{
            left: `${burst.x}%`,
            top: `${burst.y}%`,
            animationDelay: `${burst.delay}s`,
          }}
        >
          {burst.particles.map((p) => (
            <span
              key={p.id}
              className="win-fireworks__particle"
              style={
                {
                  ["--fw-angle" as string]: `${p.angle}deg`,
                  ["--fw-dist" as string]: `${p.distance}px`,
                  ["--fw-size" as string]: `${p.size}px`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
      <div className="win-fireworks__sparkle win-fireworks__sparkle--a" />
      <div className="win-fireworks__sparkle win-fireworks__sparkle--b" />
      <div className="win-fireworks__sparkle win-fireworks__sparkle--c" />
    </div>
  );
}
