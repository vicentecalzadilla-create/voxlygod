import { useEffect, useRef } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface SkyEffectThreeProps {
  isPlaying: boolean;
}

/**
 * "Cielo" — celestial audio visualizer inspired by Clément Roche's CodePen
 * (dgwavz). Dark blue-to-black sky with floating particles, soft glow and
 * concentric pulsing/rotating waveform rings that react to audio in real time.
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

    // Particles --------------------------------------------------------------
    type P = {
      x: number; y: number;
      r: number;
      baseAlpha: number;
      vx: number; vy: number;
      twPhase: number; twSpeed: number;
      tone: 0 | 1 | 2; // 0 gold, 1 white, 2 cream
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const isMobile = width < 520;
    const COUNT = isMobile ? 90 : 160;
    const particles: P[] = Array.from({ length: COUNT }, () => {
      const t = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: rand(0.5, 2.0),
        baseAlpha: rand(0.4, 0.95),
        vx: rand(-0.06, 0.06),
        vy: rand(-0.22, -0.04),
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: rand(0.6, 1.8),
        tone: t < 0.55 ? 0 : t < 0.85 ? 1 : 2,
      };
    });

    let smoothLevel = 0;
    let smoothBass = 0;
    let rotation = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const engine = getAudioEffectsEngine();
      const targetLevel = isPlaying ? engine.getLevel() : 0;
      const targetBass = isPlaying ? engine.getBass() : 0;
      smoothLevel += (targetLevel - smoothLevel) * Math.min(1, dt * 5);
      smoothBass += (targetBass - smoothBass) * Math.min(1, dt * 6);

      rotation += dt * (0.12 + smoothLevel * 0.6);

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const t = now / 1000;

      // --- Concentric waveform rings (CodePen-inspired) ---------------------
      const freq = engine.getFrequencyData();
      if (freq && isPlaying) {
        const baseRadius = Math.min(width, height) * 0.18;
        const ringRadius = baseRadius + smoothBass * 28;
        const bins = freq.length; // 64 with fftSize 128

        // Outer rotating waveform
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(255, 220, 150, ${0.55 + smoothLevel * 0.4})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255, 200, 120, 0.6)';
        ctx.beginPath();
        for (let i = 0; i <= bins; i++) {
          const a = (i / bins) * Math.PI * 2;
          const v = freq[i % bins] / 255;
          const r = ringRadius + v * (40 + smoothLevel * 50);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Inner counter-rotating mirrored ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-rotation * 0.6);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(200, 225, 255, ${0.35 + smoothLevel * 0.35})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(180, 210, 255, 0.5)';
        ctx.beginPath();
        const innerR = ringRadius * 0.62;
        for (let i = 0; i <= bins; i++) {
          const a = (i / bins) * Math.PI * 2;
          const v = freq[i % bins] / 255;
          const r = innerR - v * (18 + smoothLevel * 22);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;

        // Central pulsing orb
        const orbR = baseRadius * 0.45 + smoothBass * 30;
        const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
        orbGrad.addColorStop(0, `rgba(255, 240, 200, ${0.75 + smoothLevel * 0.25})`);
        orbGrad.addColorStop(0.4, `rgba(255, 200, 120, ${0.35 + smoothLevel * 0.25})`);
        orbGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Floating particles ----------------------------------------------
      const speedBoost = 1 + smoothLevel * 1.8;
      for (const p of particles) {
        p.x += p.vx * speedBoost * 60 * dt + Math.sin(t * 0.4 + p.twPhase) * 0.1;
        p.y += p.vy * speedBoost * 60 * dt;
        if (p.y < -5) { p.y = height + 5; p.x = Math.random() * width; }
        if (p.x < -5) p.x = width + 5; else if (p.x > width + 5) p.x = -5;

        const tw = 0.5 + 0.5 * Math.sin(t * p.twSpeed + p.twPhase);
        const a = p.baseAlpha * tw * (0.7 + smoothLevel * 0.6);
        const r = p.r * (1 + smoothLevel * 0.35);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 7);
        if (p.tone === 0) {
          g.addColorStop(0, `rgba(255, 224, 150, ${a})`);
          g.addColorStop(0.35, `rgba(255, 200, 110, ${a * 0.35})`);
          g.addColorStop(1, 'rgba(255, 190, 100, 0)');
        } else if (p.tone === 1) {
          g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
          g.addColorStop(0.35, `rgba(230, 240, 255, ${a * 0.3})`);
          g.addColorStop(1, 'rgba(220, 235, 255, 0)');
        } else {
          g.addColorStop(0, `rgba(255, 245, 220, ${a})`);
          g.addColorStop(0.35, `rgba(255, 230, 190, ${a * 0.3})`);
          g.addColorStop(1, 'rgba(255, 230, 190, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 7, 0, Math.PI * 2);
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
      {/* Deep night sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 15%, hsl(220 60% 18%) 0%, hsl(225 70% 8%) 45%, hsl(230 80% 3%) 100%)',
        }}
      />

      {/* Warm gold halo from above */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, hsl(42 90% 65% / 0.32), transparent 55%)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Soft god rays */}
      <div className="absolute inset-0 overflow-hidden" style={{ mixBlendMode: 'screen' }}>
        {[-24, -12, 0, 12, 24].map((angle, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 origin-top"
            style={{
              width: i === 2 ? '140px' : '90px',
              height: '140%',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              background: `linear-gradient(to bottom, hsl(45 100% 80% / ${0.35 - Math.abs(angle) * 0.008}) 0%, hsl(40 95% 70% / ${0.16 - Math.abs(angle) * 0.004}) 40%, transparent 80%)`,
              filter: 'blur(22px)',
              animation: `pulse-glow ${5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Canvas: particles + waveform rings */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, hsl(230 80% 2% / 0.55) 100%)',
        }}
      />
    </div>
  );
};

export default SkyEffectThree;
