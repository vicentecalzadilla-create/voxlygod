import { useEffect, useState } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  effect: string;
}

const AudioVisualizer = ({ isPlaying, effect }: AudioVisualizerProps) => {
  const [bars] = useState(() => Array.from({ length: 40 }, () => Math.random()));

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className={`absolute w-64 h-64 rounded-full bg-primary/10 blur-[80px] transition-all duration-1000 ${isPlaying ? 'animate-pulse-glow' : 'opacity-20'}`} />
      
      {/* Floating particles */}
      {isPlaying && Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40"
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${15 + Math.random() * 70}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}

      {/* Cross light rays */}
      {(effect === 'cross' || effect === 'light-rays') && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse-glow" />
          <div className="absolute w-32 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
        </div>
      )}

      {/* Audio bars */}
      <div className="relative flex items-end gap-[2px] h-24">
        {bars.map((h, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-primary/60 to-gold-glow/40 transition-all"
            style={{
              height: isPlaying ? `${20 + h * 76}px` : '8px',
              animation: isPlaying ? `wave ${0.8 + Math.random() * 0.8}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.05}s`,
              opacity: isPlaying ? 0.6 + h * 0.4 : 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AudioVisualizer;
