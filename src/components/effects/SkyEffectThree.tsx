import { useEffect, useRef } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface SkyEffectThreeProps {
  isPlaying: boolean;
}

/**
 * Lightweight celestial "Cielo" effect using a single Canvas for particles
 * plus CSS layers for god rays, gradient sky and ethereal glow.
 * No Three.js — keeps things fast, smooth and premium.
 */
const SkyEffectThree = ({ isPlaying }: SkyEffectThreeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Particles
    const COUNT = 70;
    type P = {
      x: number; y: number;
      r: number;
      baseAlpha: number;
      vx: number; vy: number;
      twPhase: number; twSpeed: number;
      gold: boolean;
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: rand(0.6, 2.2),
      baseAlpha: rand(0.35, 0.9),
      vx: rand(-0.05, 0.05),
      vy: rand(-0.12, -0.02),
      twPhase: Math.random() * Math.PI * 2,
      twSpeed: rand(0.6, 1.6),
      gold: Math.random() > 0.45,
    }));

    let smoothLevel = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const target = isPlaying ? getAudioEffectsEngine().getLevel() : 0;
      smoothLevel += (target - smoothLevel) * Math.min(1, dt * 4);

      ctx.clearRect(0, 0, width, height);

      const t = now / 1000;
      const speedBoost = 1 + smoothLevel * 1.6;

      for (const p of particles) {
        p.x += p.vx * speedBoost * 60 * dt + Math.sin(t * 0.5 + p.twPhase) * 0.08;
        p.y += p.vy * speedBoost * 60 * dt;

        if (p.y < -5) {
          p.y = height + 5;
          p.x = Math.random() * width;
        }
        if (p.x < -5) p.x = width + 5;
        else if (p.x > width + 5) p.x = -5;

        const tw = 0.55 + 0.45 * Math.sin(t * p.twSpeed + p.twPhase);
        const a = p.baseAlpha * tw * (0.7 + smoothLevel * 0.5);
        const r = p.r * (1 + smoothLevel * 0.25);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
        if (p.gold) {
          g.addColorStop(0, `rgba(255, 232, 170, ${a})`);
          g.addColorStop(0.4, `rgba(255, 210, 130, ${a * 0.35})`);
          g.addColorStop(1, 'rgba(255, 200, 120, 0)');
        } else {
          g.addColorStop(0, `rgba(255, 250, 235, ${a})`);
          g.addColorStop(0.4, `rgba(255, 240, 210, ${a * 0.3})`);
          g.addColorStop(1, 'rgba(255, 240, 210, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [isPlaying]);

  return (
    <div
      className="absolute inset-0 pointer-events-none animate-fade-in"
      style={{ transition: 'opacity 700ms ease' }}
    >
      {/* Sky gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(45 100% 96% / 0.85) 0%, hsl(40 90% 90% / 0.7) 45%, hsl(35 80% 82% / 0.55) 100%)',
        }}
      />

      {/* God rays — pure CSS, very soft */}
      <div className="absolute inset-0 overflow-hidden" style={{ mixBlendMode: 'screen' }}>
        {[-22, -10, 0, 10, 22].map((angle, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 origin-top"
            style={{
              width: i === 2 ? '120px' : '80px',
              height: '140%',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              background: `linear-gradient(to bottom, hsl(45 100% 88% / ${0.32 - Math.abs(angle) * 0.006}) 0%, hsl(40 95% 78% / ${0.18 - Math.abs(angle) * 0.004}) 35%, transparent 75%)`,
              filter: 'blur(18px)',
              animation: `pulse-glow ${5 + i * 0.6}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Warm ethereal glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 18%, hsl(45 100% 92% / 0.55), transparent 55%), radial-gradient(ellipse at 50% 90%, hsl(35 85% 78% / 0.3), transparent 60%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, hsl(30 40% 30% / 0.18) 100%)',
        }}
      />
    </div>
  );
};

export default SkyEffectThree;
