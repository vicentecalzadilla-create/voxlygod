import { useEffect, useRef } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface StarfieldEffectProps {
  isPlaying: boolean;
}

/**
 * "Estrellas Celestiales" — inspired by https://codepen.io/noeldelgado/pen/EaNjBy
 * Starfield + pulsing central orb + rotating circular waveform.
 * Pure Canvas + Web Audio API (via AudioEffectsEngine analyser).
 */
const StarfieldEffect = ({ isPlaying }: StarfieldEffectProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      cx = width / 2;
      cy = height / 2;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    };

    // Star field
    type Star = { x: number; y: number; z: number; pz: number };
    const STAR_COUNT = Math.min(1500, Math.floor((window.innerWidth < 600 ? 700 : 1500)));
    const stars: Star[] = [];
    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: (Math.random() - 0.5) * width,
          y: (Math.random() - 0.5) * height,
          z: Math.random() * width,
          pz: 0,
        });
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const engine = getAudioEffectsEngine() as unknown as { analyserNode: AnalyserNode | null };

    let freqData: Uint8Array | null = null;
    let timeData: Uint8Array | null = null;
    const ensureBuffers = () => {
      const a = engine.analyserNode;
      if (a) {
        if (!freqData || freqData.length !== a.frequencyBinCount) {
          freqData = new Uint8Array(a.frequencyBinCount);
          timeData = new Uint8Array(a.fftSize);
        }
        return a;
      }
      return null;
    };

    let smoothLevel = 0;
    let hueShift = 220; // start in blue
    let rotation = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Background — deep blue-black with soft glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
      bg.addColorStop(0, 'rgba(20, 30, 70, 0.35)');
      bg.addColorStop(0.5, 'rgba(8, 12, 30, 0.55)');
      bg.addColorStop(1, 'rgba(2, 4, 12, 0.85)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Trails — slight dark overlay each frame (handled by gradient above instead of clear)

      const a = ensureBuffers();
      let level = 0;
      let bass = 0;
      if (isPlaying && a && freqData && timeData) {
        a.getByteFrequencyData(freqData as Uint8Array<ArrayBuffer>);
        a.getByteTimeDomainData(timeData as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i];
        level = Math.min(1, sum / (freqData.length * 180));
        let bsum = 0;
        const bn = Math.min(8, freqData.length);
        for (let i = 0; i < bn; i++) bsum += freqData[i];
        bass = Math.min(1, bsum / (bn * 220));
      }
      smoothLevel += (level - smoothLevel) * Math.min(1, dt * 6);
      hueShift = 200 + smoothLevel * 120; // blue -> violet/pink with audio
      rotation += dt * (0.15 + smoothLevel * 1.2);

      // ===== Starfield =====
      const speed = 1 + smoothLevel * 8;
      ctx.lineCap = 'round';
      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed * 4;
        if (s.z < 1) {
          s.x = (Math.random() - 0.5) * width;
          s.y = (Math.random() - 0.5) * height;
          s.z = width;
          s.pz = s.z;
        }
        const k = 128 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;
        const pk = 128 / s.pz;
        const opx = s.x * pk + cx;
        const opy = s.y * pk + cy;
        const size = (1 - s.z / width) * 2.2;
        const alpha = 0.4 + (1 - s.z / width) * 0.6;
        const hue = (hueShift + (s.z / width) * 60) % 360;
        ctx.strokeStyle = `hsla(${hue}, 90%, ${70 + smoothLevel * 20}%, ${alpha})`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(opx, opy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // ===== Central pulsing orb =====
      const baseR = Math.min(width, height) * 0.08;
      const orbR = baseR * (1 + smoothLevel * 0.9 + bass * 0.3);
      const orbGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.4);
      orbGrad.addColorStop(0, `hsla(${hueShift}, 95%, 92%, ${0.85})`);
      orbGrad.addColorStop(0.35, `hsla(${hueShift + 20}, 90%, 70%, ${0.45 + smoothLevel * 0.3})`);
      orbGrad.addColorStop(1, 'hsla(220, 80%, 30%, 0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${hueShift}, 100%, 95%, ${0.8 + smoothLevel * 0.2})`;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // ===== Circular waveform =====
      if (timeData && timeData.length) {
        const samples = 180;
        const ringR = baseR * 1.9;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.strokeStyle = `hsla(${hueShift + 30}, 90%, 75%, ${0.55 + smoothLevel * 0.4})`;
        ctx.lineWidth = 1.4 + smoothLevel * 1.5;
        ctx.shadowBlur = 12 + smoothLevel * 18;
        ctx.shadowColor = `hsla(${hueShift + 30}, 95%, 70%, 0.9)`;
        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const idx = Math.floor((i / samples) * timeData.length) % timeData.length;
          const v = (timeData[idx] - 128) / 128;
          const angle = (i / samples) * Math.PI * 2;
          const r = ringR + v * (baseR * 1.1) + smoothLevel * baseR * 0.4;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner mirrored ring
        ctx.strokeStyle = `hsla(${hueShift - 20}, 80%, 80%, ${0.35 + smoothLevel * 0.35})`;
        ctx.lineWidth = 1 + smoothLevel * 1.2;
        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const idx = Math.floor((i / samples) * timeData.length) % timeData.length;
          const v = (timeData[idx] - 128) / 128;
          const angle = -(i / samples) * Math.PI * 2;
          const r = ringR * 0.78 - v * (baseR * 0.7);
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
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
    <div className="absolute inset-0 pointer-events-none animate-fade-in" style={{ transition: 'opacity 700ms ease' }}>
      {/* Deep blue-black gradient backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(225 60% 12%) 0%, hsl(228 70% 6%) 55%, hsl(230 80% 3%) 100%)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Soft outer vignette glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, hsl(225 80% 4% / 0.7) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
};

export default StarfieldEffect;
