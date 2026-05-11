import { useEffect, useMemo, useState } from 'react';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  effect: string;
}

const particleColors = [
  'hsl(38 80% 60%)',    // gold
  'hsl(340 60% 72%)',   // rose
  'hsl(200 70% 70%)',   // sky blue
  'hsl(270 50% 68%)',   // violet
  'hsl(175 50% 58%)',   // turquoise
  'hsl(25 80% 62%)',    // warm orange
];

const barColors = [
  'from-gold/80 to-rose/50',
  'from-rose/70 to-violet/50',
  'from-sky-blue/70 to-turquoise/50',
  'from-violet/70 to-gold/50',
  'from-turquoise/70 to-sky-blue/50',
  'from-warm-orange/70 to-gold/50',
];

const AudioVisualizer = ({ isPlaying, effect }: AudioVisualizerProps) => {
  const bars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    height: 0.25 + ((i * 17) % 31) / 40,
    speed: 0.8 + ((i * 7) % 8) / 10,
  })), []);
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    size: 2 + ((i * 11) % 4),
    left: 10 + ((i * 23) % 80),
    top: 10 + ((i * 31) % 80),
    duration: 2 + ((i * 5) % 3),
    drift: 4 + ((i * 7) % 5),
    delay: (i % 6) * 0.45,
  })), []);
  const stars = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    left: 5 + ((i * 29) % 90),
    top: 5 + ((i * 37) % 90),
    size: 6 + ((i * 5) % 10),
    delay: (i % 5) * 0.6,
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

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointillist-bg">
      {/* Soft radial glows */}
      <div className={`absolute w-72 h-72 rounded-full transition-all duration-1000 ${isPlaying ? 'animate-pulse-glow' : 'opacity-10'}`}
        style={{ background: 'radial-gradient(circle, hsl(38 80% 65% / 0.25), hsl(340 60% 72% / 0.15), transparent 70%)' }} />
      <div className={`absolute w-56 h-56 rounded-full transition-all duration-1000 ${isPlaying ? 'animate-pulse-glow' : 'opacity-10'}`}
        style={{ background: 'radial-gradient(circle, hsl(200 70% 70% / 0.2), hsl(270 50% 68% / 0.1), transparent 70%)', animationDelay: '1.5s' }} />

      {/* Sparkle particles */}
      {isPlaying && particles.map((particle, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particleColors[i % particleColors.length],
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationName: 'sparkle, drift',
            animationDuration: `${particle.duration}s, ${particle.drift}s`,
            animationTimingFunction: 'ease-in-out, ease-in-out',
            animationIterationCount: 'infinite, infinite',
            animationDelay: `${particle.delay}s, ${particle.delay}s`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 6px ${particleColors[i % particleColors.length]}`,
          }}
        />
      ))}

      {/* Stars */}
      {isPlaying && stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="absolute text-gold/60"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            fontSize: `${star.size}px`,
            animationName: 'sparkle',
            animationDuration: `${3 + (i % 2)}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${star.delay}s`,
          }}
        >
          ✦
        </div>
      ))}

      {/* Cross light rays */}
      {(effect === 'cross' || effect === 'light-rays') && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-40 animate-pulse-glow"
            style={{ background: 'linear-gradient(to bottom, transparent, hsl(38 80% 65% / 0.4), hsl(340 60% 72% / 0.2), transparent)' }} />
          <div className="absolute w-40 h-px animate-pulse-glow"
            style={{ background: 'linear-gradient(to right, transparent, hsl(200 70% 70% / 0.3), hsl(270 50% 68% / 0.2), transparent)', animationDelay: '0.5s' }} />
        </div>
      )}

      {/* Audio bars - multicolor pointillist */}
      <div className="relative flex items-end gap-[2px] h-28">
        {bars.map((bar, i) => {
          const colorIdx = i % barColors.length;
          const reactiveHeight = 8 + bar.height * 44 + level * (24 + (i % 7) * 7);
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full bg-gradient-to-t ${barColors[colorIdx]} transition-all`}
              style={{
                height: isPlaying ? `${Math.min(108, reactiveHeight)}px` : '8px',
                animationName: isPlaying ? 'wave' : 'none',
                animationDuration: `${bar.speed}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${i * 0.05}s`,
                opacity: isPlaying ? 0.65 + bar.height * 0.35 : 0.2,
                filter: isPlaying ? `drop-shadow(0 0 3px ${particleColors[i % particleColors.length]})` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default AudioVisualizer;
