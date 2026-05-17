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

      {/* Light rays */}
      {effect === 'light-rays' && isPlaying && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={`ray-${i}`}
              className="absolute top-1/2 left-1/2 origin-top animate-pulse-glow"
              style={{
                width: '2px',
                height: '120%',
                background: 'linear-gradient(to bottom, hsl(38 90% 70% / 0.6), hsl(340 60% 72% / 0.2), transparent)',
                transform: `translate(-50%, -10%) rotate(${(i - 2) * 18}deg)`,
                animationDelay: `${i * 0.3}s`,
                filter: 'blur(1px)',
              }}
            />
          ))}
        </div>
      )}

      {/* Cross */}
      {effect === 'cross' && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative animate-pulse-glow" style={{ filter: 'drop-shadow(0 0 16px hsl(38 90% 65% / 0.7))' }}>
            <div className="w-2 h-40 rounded-full"
              style={{ background: 'linear-gradient(to bottom, hsl(38 90% 70%), hsl(340 60% 72%))' }} />
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-24 h-2 rounded-full"
              style={{ background: 'linear-gradient(to right, hsl(340 60% 72%), hsl(38 90% 70%))' }} />
          </div>
        </div>
      )}

      {/* Clouds / Sky */}
      {effect === 'clouds' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[0, 1, 2, 3].map(i => (
            <div
              key={`cloud-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${120 + i * 40}px`,
                height: `${60 + i * 16}px`,
                left: `${(i * 27) % 80}%`,
                top: `${15 + (i * 19) % 60}%`,
                background: 'radial-gradient(ellipse, hsl(200 80% 92% / 0.6), hsl(210 70% 88% / 0.2), transparent 70%)',
                filter: 'blur(8px)',
                animation: isPlaying ? `drift ${10 + i * 3}s ease-in-out infinite` : 'none',
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Candles */}
      {effect === 'candles' && (
        <div className="absolute inset-0 flex items-end justify-center gap-6 pb-12 pointer-events-none">
          {[0, 1, 2].map(i => (
            <div key={`candle-${i}`} className="relative flex flex-col items-center">
              <div
                className="w-2 h-3 rounded-full mb-0.5"
                style={{
                  background: 'radial-gradient(ellipse, hsl(45 100% 75%), hsl(25 90% 55%) 60%, transparent)',
                  boxShadow: '0 0 18px hsl(38 95% 60% / 0.9), 0 0 36px hsl(25 90% 55% / 0.6)',
                  animation: isPlaying ? `sparkle ${0.8 + i * 0.2}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
              <div className="w-3 h-20 rounded-sm" style={{ background: 'linear-gradient(to bottom, hsl(45 50% 88%), hsl(35 40% 70%))' }} />
            </div>
          ))}
        </div>
      )}

      {/* Bible */}
      {effect === 'bible' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative animate-pulse-glow" style={{ filter: 'drop-shadow(0 0 20px hsl(38 80% 60% / 0.7))' }}>
            <div className="w-32 h-40 rounded-md flex items-center justify-center text-5xl"
              style={{ background: 'linear-gradient(135deg, hsl(20 50% 25%), hsl(15 40% 18%))', boxShadow: 'inset 0 0 24px hsl(0 0% 0% / 0.4)' }}>
              <span style={{ filter: 'drop-shadow(0 0 8px hsl(38 90% 70%))' }}>✝️</span>
            </div>
            <div className="absolute inset-y-2 left-1/2 w-px bg-gold/40" />
          </div>
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
