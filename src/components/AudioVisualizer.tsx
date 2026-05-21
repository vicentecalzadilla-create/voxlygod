import { useEffect, useMemo, useState } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  effect: string;
}

const particleColors = [
  'hsl(45 90% 75%)',    // warm gold
  'hsl(38 95% 70%)',    // gold
  'hsl(340 70% 80%)',   // soft rose
  'hsl(210 80% 82%)',   // celestial blue
  'hsl(280 60% 80%)',   // soft violet
  'hsl(30 90% 78%)',    // peach gold
];

const AudioVisualizer = ({ isPlaying, effect }: AudioVisualizerProps) => {
  // Floating luminous orbs (the main ambient layer)
  const orbs = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    size: 3 + ((i * 13) % 7),
    left: ((i * 53) % 100),
    top: ((i * 67) % 100),
    duration: 6 + ((i * 7) % 6),
    drift: 8 + ((i * 11) % 7),
    delay: (i % 9) * 0.4,
    color: particleColors[i % particleColors.length],
    opacity: 0.4 + ((i * 7) % 5) / 10,
  })), []);

  // Tiny twinkling stars
  const stars = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: ((i * 41) % 100),
    top: ((i * 59) % 100),
    size: 4 + ((i * 3) % 8),
    delay: (i % 7) * 0.5,
    duration: 2.5 + ((i * 5) % 4),
  })), []);

  // God-ray angles for the celestial light effect (used as default ambience too)
  const rays = useMemo(() => [
    { angle: -22, width: 80, opacity: 0.35, delay: 0 },
    { angle: -10, width: 60, opacity: 0.25, delay: 0.8 },
    { angle: 0,   width: 100, opacity: 0.45, delay: 0.3 },
    { angle: 10,  width: 60, opacity: 0.25, delay: 1.2 },
    { angle: 22,  width: 80, opacity: 0.35, delay: 0.5 },
  ], []);

  // Rising sparks (for candles/ascending light)
  const sparks = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    left: 30 + ((i * 13) % 40),
    size: 2 + ((i * 3) % 3),
    duration: 3 + ((i * 5) % 4),
    delay: (i % 6) * 0.4,
    color: particleColors[i % particleColors.length],
  })), []);

  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setLevel(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      setLevel(getAudioEffectsEngine().getLevel());
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const intensity = isPlaying ? 0.6 + level * 0.8 : 0.35;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep ambient gradient base */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 40%, hsl(45 80% 75% / 0.18), hsl(340 60% 75% / 0.12) 40%, hsl(220 60% 70% / 0.08) 70%, transparent 100%)',
      }} />

      {/* Soft halos that breathe */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-1000"
        style={{
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, hsl(45 95% 75% / 0.30), hsl(38 90% 65% / 0.15) 45%, transparent 70%)',
          opacity: 0.5 + intensity * 0.4,
          filter: 'blur(8px)',
          animation: isPlaying ? 'pulse-glow 4s ease-in-out infinite' : 'none',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-1000"
        style={{
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, hsl(340 70% 80% / 0.25), hsl(280 60% 75% / 0.1) 50%, transparent 75%)',
          opacity: 0.5 + intensity * 0.3,
          filter: 'blur(6px)',
          animation: isPlaying ? 'pulse-glow 5.5s ease-in-out infinite' : 'none',
          animationDelay: '1.2s',
        }}
      />

      {/* God rays — always present as ambient default, stronger on 'light-rays' */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ mixBlendMode: 'screen' }}>
        {rays.map((ray, i) => {
          const isHero = effect === 'light-rays';
          const baseOpacity = (isHero ? ray.opacity * 1.6 : ray.opacity * 0.55) * (0.7 + intensity * 0.6);
          return (
            <div
              key={`ray-${i}`}
              className="absolute left-1/2 top-0 origin-top"
              style={{
                width: `${ray.width}px`,
                height: '140%',
                transform: `translateX(-50%) rotate(${ray.angle}deg)`,
                background: `linear-gradient(to bottom, hsl(45 95% 78% / ${baseOpacity}) 0%, hsl(38 90% 70% / ${baseOpacity * 0.5}) 30%, transparent 70%)`,
                filter: 'blur(14px)',
                opacity: isPlaying ? 1 : 0.6,
                animation: isPlaying ? `pulse-glow ${4 + i * 0.4}s ease-in-out infinite` : 'none',
                animationDelay: `${ray.delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Floating luminous orbs (ambient celestial particles) */}
      {orbs.map((orb, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${orb.size}px`,
            height: `${orb.size}px`,
            left: `${orb.left}%`,
            top: `${orb.top}%`,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            opacity: isPlaying ? orb.opacity : orb.opacity * 0.4,
            boxShadow: `0 0 ${8 + orb.size * 2}px ${orb.color}`,
            filter: 'blur(0.4px)',
            animation: isPlaying
              ? `drift ${orb.drift}s ease-in-out infinite, sparkle ${orb.duration}s ease-in-out infinite`
              : `drift ${orb.drift * 1.5}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s, ${orb.delay}s`,
          }}
        />
      ))}

      {/* Twinkling stars */}
      {isPlaying && stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="absolute"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            fontSize: `${star.size}px`,
            color: 'hsl(45 95% 80%)',
            textShadow: '0 0 8px hsl(45 95% 70% / 0.9), 0 0 16px hsl(38 90% 65% / 0.6)',
            animation: `sparkle ${star.duration}s ease-in-out infinite`,
            animationDelay: `${star.delay}s`,
          }}
        >
          ✦
        </div>
      ))}

      {/* CROSS */}
      {effect === 'cross' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative" style={{ filter: `drop-shadow(0 0 ${18 + intensity * 16}px hsl(45 95% 70% / 0.85))` }}>
            <div
              className="w-[6px] h-44 rounded-full"
              style={{
                background: 'linear-gradient(to bottom, hsl(45 95% 85%), hsl(38 90% 65%), hsl(340 60% 72%))',
                boxShadow: '0 0 24px hsl(45 95% 70% / 0.8), inset 0 0 8px hsl(45 100% 90% / 0.6)',
              }}
            />
            <div
              className="absolute top-12 left-1/2 -translate-x-1/2 w-28 h-[6px] rounded-full"
              style={{
                background: 'linear-gradient(to right, hsl(340 60% 72%), hsl(45 95% 85%), hsl(38 90% 65%))',
                boxShadow: '0 0 24px hsl(45 95% 70% / 0.8), inset 0 0 8px hsl(45 100% 90% / 0.6)',
              }}
            />
            {/* Soft halo behind cross */}
            <div className="absolute inset-0 -m-12 rounded-full animate-pulse-glow" style={{
              background: 'radial-gradient(circle, hsl(45 95% 75% / 0.4), transparent 65%)',
              filter: 'blur(20px)',
            }} />
          </div>
        </div>
      )}

      {/* CLOUDS — Cielo etéreo celestial */}
      {effect === 'clouds' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Sky gradient base — soft cream to gold */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, hsl(45 90% 95% / 0.55) 0%, hsl(40 80% 88% / 0.35) 35%, hsl(35 70% 82% / 0.2) 70%, transparent 100%)',
          }} />

          {/* Soft luminous clouds — multiple layers for depth */}
          {[
            { w: 220, h: 90, l: -5,  t: 8,  d: 22, delay: 0,   opacity: 0.85, tint: '45 95% 97%' },
            { w: 180, h: 75, l: 55,  t: 18, d: 28, delay: 2.5, opacity: 0.75, tint: '40 90% 95%' },
            { w: 260, h: 105, l: 20, t: 32, d: 32, delay: 1.2, opacity: 0.8,  tint: '42 85% 94%' },
            { w: 200, h: 85, l: 65,  t: 48, d: 26, delay: 4,   opacity: 0.7,  tint: '38 80% 92%' },
            { w: 240, h: 95, l: -10, t: 62, d: 34, delay: 3,   opacity: 0.65, tint: '45 85% 95%' },
            { w: 170, h: 70, l: 45,  t: 72, d: 24, delay: 1.8, opacity: 0.6,  tint: '40 80% 93%' },
          ].map((c, i) => (
            <div
              key={`cloud-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${c.w}px`,
                height: `${c.h}px`,
                left: `${c.l}%`,
                top: `${c.t}%`,
                background: `radial-gradient(ellipse, hsl(${c.tint} / ${c.opacity}) 0%, hsl(${c.tint} / ${c.opacity * 0.5}) 35%, hsl(45 90% 88% / ${c.opacity * 0.15}) 65%, transparent 80%)`,
                filter: `blur(${14 + (i % 3) * 4}px)`,
                animation: isPlaying
                  ? `drift ${c.d}s ease-in-out infinite, pulse-glow ${8 + i}s ease-in-out infinite`
                  : `drift ${c.d * 1.6}s ease-in-out infinite`,
                animationDelay: `${c.delay}s, ${c.delay * 0.7}s`,
                opacity: 0.85 + intensity * 0.15,
                mixBlendMode: 'screen',
              }}
            />
          ))}

          {/* Delicate god rays piercing through the clouds */}
          <div className="absolute inset-0" style={{ mixBlendMode: 'screen' }}>
            {[-18, -6, 6, 18].map((angle, i) => (
              <div
                key={`sky-ray-${i}`}
                className="absolute left-1/2 top-0 origin-top"
                style={{
                  width: `${70 + (i % 2) * 30}px`,
                  height: '130%',
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                  background: `linear-gradient(to bottom, hsl(45 100% 92% / ${(0.4 + intensity * 0.35) * (i % 2 ? 0.7 : 1)}) 0%, hsl(42 95% 85% / ${(0.2 + intensity * 0.2)}) 30%, transparent 75%)`,
                  filter: 'blur(18px)',
                  animation: isPlaying ? `pulse-glow ${5 + i * 0.6}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.7}s`,
                  opacity: 0.9,
                }}
              />
            ))}
          </div>

          {/* Fine floating gold & white particles */}
          {Array.from({ length: 22 }).map((_, i) => {
            const left = (i * 37) % 100;
            const top = (i * 53) % 100;
            const size = 1.5 + ((i * 7) % 4) * 0.6;
            const isGold = i % 2 === 0;
            const color = isGold ? 'hsl(45 95% 78%)' : 'hsl(45 100% 96%)';
            return (
              <div
                key={`sky-particle-${i}`}
                className="absolute rounded-full"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: color,
                  boxShadow: `0 0 ${6 + size * 2}px ${color}, 0 0 ${12 + size * 3}px hsl(45 95% 85% / 0.6)`,
                  opacity: (0.5 + ((i * 3) % 5) / 10) * (0.6 + intensity * 0.5),
                  animation: isPlaying
                    ? `drift ${10 + (i % 7)}s ease-in-out infinite, sparkle ${3 + (i % 4)}s ease-in-out infinite`
                    : `drift ${14 + (i % 5)}s ease-in-out infinite`,
                  animationDelay: `${(i % 6) * 0.5}s, ${(i % 5) * 0.4}s`,
                }}
              />
            );
          })}

          {/* Warm ethereal glow overlay */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 20%, hsl(45 100% 90% / 0.35) 0%, hsl(40 90% 85% / 0.15) 40%, transparent 75%)',
            mixBlendMode: 'screen',
            opacity: 0.7 + intensity * 0.3,
            transition: 'opacity 400ms ease-out',
          }} />
        </div>
      )}

      {/* CANDLES */}
      {effect === 'candles' && (
        <div className="absolute inset-0 flex items-end justify-center gap-8 pb-10 pointer-events-none">
          {[0, 1, 2].map(i => (
            <div key={`candle-${i}`} className="relative flex flex-col items-center">
              {/* Halo around flame */}
              <div className="absolute -top-2 w-12 h-12 rounded-full" style={{
                background: 'radial-gradient(circle, hsl(38 95% 70% / 0.6), transparent 65%)',
                filter: 'blur(8px)',
                animation: isPlaying ? `pulse-glow ${1.5 + i * 0.3}s ease-in-out infinite` : 'none',
              }} />
              <div
                className="w-[6px] h-4 rounded-full mb-0.5 relative z-10"
                style={{
                  background: 'radial-gradient(ellipse, hsl(45 100% 92%) 10%, hsl(38 95% 65%) 50%, hsl(20 90% 55%) 90%)',
                  boxShadow: '0 0 18px hsl(45 95% 70% / 0.95), 0 0 36px hsl(25 90% 55% / 0.7)',
                  animation: isPlaying ? `sparkle ${0.9 + i * 0.2}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.15}s`,
                  filter: 'blur(0.3px)',
                }}
              />
              <div className="w-3 h-20 rounded-sm" style={{
                background: 'linear-gradient(to bottom, hsl(45 60% 92%), hsl(35 40% 75%))',
                boxShadow: 'inset -2px 0 4px hsl(30 30% 50% / 0.3)',
              }} />
            </div>
          ))}
          {/* Rising sparks */}
          {isPlaying && sparks.map((spark, i) => (
            <div
              key={`spark-${i}`}
              className="absolute bottom-20 rounded-full"
              style={{
                left: `${spark.left}%`,
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                background: spark.color,
                boxShadow: `0 0 8px ${spark.color}`,
                animation: `amen-rise ${spark.duration}s ease-out infinite`,
                animationDelay: `${spark.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* BIBLE */}
      {effect === 'bible' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative" style={{ filter: `drop-shadow(0 0 ${20 + intensity * 14}px hsl(45 90% 65% / 0.8))` }}>
            <div
              className="w-36 h-44 rounded-md flex items-center justify-center text-5xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(20 55% 28%), hsl(15 45% 20%))',
                boxShadow: 'inset 0 0 28px hsl(0 0% 0% / 0.45), 0 0 40px hsl(45 90% 65% / 0.4)',
              }}
            >
              {/* Pages glow */}
              <div className="absolute inset-1 rounded-sm" style={{
                background: 'linear-gradient(180deg, hsl(45 80% 92% / 0.15), transparent 30%, transparent 70%, hsl(45 80% 92% / 0.15))',
              }} />
              <span style={{ filter: 'drop-shadow(0 0 10px hsl(45 95% 75%))', color: 'hsl(45 90% 78%)' }}>✝</span>
            </div>
            <div className="absolute inset-y-2 left-1/2 w-px bg-gold/50" />
            {/* Halo */}
            <div className="absolute inset-0 -m-10 rounded-full animate-pulse-glow" style={{
              background: 'radial-gradient(circle, hsl(45 95% 70% / 0.35), transparent 65%)',
              filter: 'blur(18px)',
            }} />
            {/* Floating particles around the book */}
            {[0,1,2,3,4,5].map(i => (
              <div
                key={`bp-${i}`}
                className="absolute rounded-full"
                style={{
                  width: '4px',
                  height: '4px',
                  left: `${20 + (i * 17) % 70}%`,
                  top: `${(i * 31) % 100}%`,
                  background: particleColors[i % particleColors.length],
                  boxShadow: `0 0 8px ${particleColors[i % particleColors.length]}`,
                  animation: `drift ${5 + i}s ease-in-out infinite, sparkle ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s, ${i * 0.4}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reactive shimmer ring — subtle audio-reactive */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          width: `${180 + level * 120}px`,
          height: `${180 + level * 120}px`,
          border: '1px solid hsl(45 95% 75% / 0.25)',
          boxShadow: `0 0 ${20 + level * 40}px hsl(45 95% 70% / ${0.15 + level * 0.3})`,
          opacity: isPlaying ? 0.6 : 0,
          transition: 'all 120ms ease-out',
        }}
      />
    </div>
  );
};

export default AudioVisualizer;
