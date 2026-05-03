import { useEffect, useState } from 'react';

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
  const [bars] = useState(() => Array.from({ length: 40 }, () => Math.random()));

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointillist-bg">
      {/* Soft radial glows */}
      <div className={`absolute w-72 h-72 rounded-full transition-all duration-1000 ${isPlaying ? 'animate-pulse-glow' : 'opacity-10'}`}
        style={{ background: 'radial-gradient(circle, hsl(38 80% 65% / 0.25), hsl(340 60% 72% / 0.15), transparent 70%)' }} />
      <div className={`absolute w-56 h-56 rounded-full transition-all duration-1000 ${isPlaying ? 'animate-pulse-glow' : 'opacity-10'}`}
        style={{ background: 'radial-gradient(circle, hsl(200 70% 70% / 0.2), hsl(270 50% 68% / 0.1), transparent 70%)', animationDelay: '1.5s' }} />

      {/* Sparkle particles */}
      {isPlaying && Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            backgroundColor: particleColors[i % particleColors.length],
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite, drift ${4 + Math.random() * 5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 6px ${particleColors[i % particleColors.length]}`,
          }}
        />
      ))}

      {/* Stars */}
      {isPlaying && Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute text-gold/60"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${5 + Math.random() * 90}%`,
            fontSize: `${6 + Math.random() * 10}px`,
            animation: `sparkle ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
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
        {bars.map((h, i) => {
          const colorIdx = i % barColors.length;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full bg-gradient-to-t ${barColors[colorIdx]} transition-all`}
              style={{
                height: isPlaying ? `${20 + h * 88}px` : '8px',
                animation: isPlaying ? `wave ${0.8 + Math.random() * 0.8}s ease-in-out infinite` : 'none',
                animationDelay: `${i * 0.05}s`,
                opacity: isPlaying ? 0.65 + h * 0.35 : 0.2,
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
