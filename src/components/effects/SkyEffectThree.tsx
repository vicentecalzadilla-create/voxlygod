import { useEffect, useRef } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface SkyEffectThreeProps {
  isPlaying: boolean;
}

/**
 * "Cielo" — Ethereal Bloom Visualizer.
 * Deep blue→black radial sky with golden/cream bloom petals, a pulsing central
 * orb, soft rotating waveform rings and luminous floating particles, all
 * reacting to audio in real time via Web Audio API.
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

    type P = {
      x: number; y: number;
      r: number;
      baseAlpha: number;
      vx: number; vy: number;
      twPhase: number; twSpeed: number;
      tone: 0 | 1 | 2;
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const isMobile = width < 520;
    const COUNT = isMobile ? 110 : 200;
    const particles: P[] = Array.from({ length: COUNT }, () => {
      const t = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: rand(0.4, 2.2),
        baseAlpha: rand(0.45, 1),
        vx: rand(-0.08, 0.08),
        vy: rand(-0.28, -0.04),
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: rand(0.6, 1.9),
        tone: t < 0.6 ? 0 : t < 0.88 ? 1 : 2,
      };
    });

    let smoothLevel = 0;
    let smoothBass = 0;
    let smoothHigh = 0;
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

      const freq = engine.getFrequencyData();
      let highEnergy = 0;
      if (freq) {
        let s = 0;
        const start = Math.floor(freq.length * 0.6);
        for (let i = start; i < freq.length; i++) s += freq[i];
        highEnergy = s / ((freq.length - start) * 255);
      }
      smoothHigh += (highEnergy - smoothHigh) * Math.min(1, dt * 6);

      rotation += dt * (0.1 + smoothLevel * 0.55);

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const t = now / 1000;
      const baseRadius = Math.min(width, height) * 0.16;

      // --- Bloom halo behind everything ----------------------------------
      const haloR = baseRadius * 3.4 + smoothLevel * 80;
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      haloGrad.addColorStop(0, `rgba(255, 220, 160, ${0.18 + smoothLevel * 0.18})`);
      haloGrad.addColorStop(0.4, `rgba(255, 190, 120, ${0.08 + smoothLevel * 0.08})`);
      haloGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      if (freq && isPlaying) {
        const bins = freq.length;

        // --- Ethereal bloom petals (3 layers) ---------------------------
        const petalLayers = [
          { rot: rotation, scale: 1.0, color: 'rgba(255, 220, 150,', alphaBase: 0.55, blur: 22, width: 1.5 },
          { rot: -rotation * 0.7, scale: 0.78, color: 'rgba(255, 240, 210,', alphaBase: 0.45, blur: 16, width: 1.2 },
          { rot: rotation * 0.4, scale: 0.55, color: 'rgba(210, 230, 255,', alphaBase: 0.4, blur: 12, width: 1.0 },
        ];

        for (const layer of petalLayers) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(layer.rot);
          ctx.lineWidth = layer.width;
          ctx.strokeStyle = `${layer.color} ${layer.alphaBase + smoothLevel * 0.35})`;
          ctx.shadowBlur = layer.blur;
          ctx.shadowColor = `${layer.color} 0.55)`;
          ctx.beginPath();
          const ringR = (baseRadius + smoothBass * 26) * layer.scale;
          for (let i = 0; i <= bins; i++) {
            const a = (i / bins) * Math.PI * 2;
            const v = freq[i % bins] / 255;
            // Petal-like modulation: combine freq with sinusoidal lobes
            const lobes = 1 + 0.25 * Math.sin(a * 6 + t * 0.8);
            const r = ringR * lobes + v * (38 + smoothLevel * 50) * layer.scale;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        ctx.shadowBlur = 0;

        // --- Central pulsing orb ----------------------------------------
        const orbR = baseRadius * 0.5 + smoothBass * 34;
        const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
        orbGrad.addColorStop(0, `rgba(255, 248, 215, ${0.85 + smoothLevel * 0.15})`);
        orbGrad.addColorStop(0.35, `rgba(255, 210, 140, ${0.45 + smoothLevel * 0.25})`);
        orbGrad.addColorStop(0.75, `rgba(255, 170, 90, ${0.15 + smoothLevel * 0.15})`);
        orbGrad.addColorStop(1, 'rgba(255, 160, 80, 0)');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        const coreR = orbR * 0.28;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrad.addColorStop(0, `rgba(255, 255, 245, ${0.95})`);
        coreGrad.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Floating particles ------------------------------------------
      const speedBoost = 1 + smoothLevel * 1.8;
      for (const p of particles) {
        p.x += p.vx * speedBoost * 60 * dt + Math.sin(t * 0.4 + p.twPhase) * 0.12;
        p.y += p.vy * speedBoost * 60 * dt;
        if (p.y < -5) { p.y = height + 5; p.x = Math.random() * width; }
        if (p.x < -5) p.x = width + 5; else if (p.x > width + 5) p.x = -5;

        const tw = 0.5 + 0.5 * Math.sin(t * p.twSpeed + p.twPhase);
        const a = p.baseAlpha * tw * (0.7 + smoothLevel * 0.6 + smoothHigh * 0.3);
        const r = p.r * (1 + smoothLevel * 0.4);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
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
        ctx.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
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
            'radial-gradient(ellipse at 50% 45%, hsl(222 65% 16%) 0%, hsl(226 75% 7%) 50%, hsl(230 85% 2%) 100%)',
        }}
      />

      {/* Warm gold/cream wash from above */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 10%, hsl(42 95% 70% / 0.30), transparent 55%), radial-gradient(ellipse at 50% 100%, hsl(35 90% 55% / 0.18), transparent 50%)',
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
              width: i === 2 ? '150px' : '95px',
              height: '140%',
              transform: `translateX(-50%) rotate(${angle}deg)`,
              background: `linear-gradient(to bottom, hsl(45 100% 82% / ${0.34 - Math.abs(angle) * 0.008}) 0%, hsl(40 95% 70% / ${0.16 - Math.abs(angle) * 0.004}) 40%, transparent 80%)`,
              filter: 'blur(24px)',
              animation: `pulse-glow ${5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Canvas: bloom + particles */}
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
            'radial-gradient(ellipse at center, transparent 55%, hsl(230 85% 2% / 0.6) 100%)',
        }}
      />
    </div>
  );
};

export default SkyEffectThree;
