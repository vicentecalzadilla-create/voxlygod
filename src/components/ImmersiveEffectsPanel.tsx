import { useState, useCallback, useEffect } from 'react';
import { Sparkles, X, Volume2, Check } from 'lucide-react';
import { EFFECTS_LIST, getAudioEffectsEngine, type EffectType } from '@/audio/AudioEffectsEngine';
import { useTheme } from '@/contexts/ThemeContext';

interface ImmersiveEffectsPanelProps {
  audioId: string;
  isPlaying: boolean;
  allowEffects?: boolean;
}

const ImmersiveEffectsPanel = ({ audioId, isPlaying, allowEffects = true }: ImmersiveEffectsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectType>(() => {
    const saved = localStorage.getItem(`voxly-effect-${audioId}`);
    return (saved as EffectType) || 'none';
  });
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { theme } = useTheme();

  const engine = getAudioEffectsEngine();

  const selectEffect = useCallback((effect: EffectType) => {
    setActiveEffect(effect);
    localStorage.setItem(`voxly-effect-${audioId}`, effect);
    engine.applyEffect(effect);

    // Show preview indicator briefly
    setIsPreviewing(true);
    setTimeout(() => {
      setIsPreviewing(false);
    }, 2000);
  }, [audioId, engine]);

  if (!allowEffects) return null;

  const currentInfo = EFFECTS_LIST.find(e => e.id === activeEffect);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full card-luminous text-xs font-medium transition-all hover:shadow-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-foreground/80">
          {activeEffect === 'none' ? 'Efectos' : currentInfo?.label}
        </span>
        {activeEffect !== 'none' && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
        )}
      </button>

      {/* Panel overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 animate-fade-in-up"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(180deg, hsl(222 47% 14%) 0%, hsl(222 47% 10%) 100%)'
                : 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(210 40% 96%) 100%)'
            }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-serif text-base font-semibold text-foreground">Efectos Inmersivos</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Preview indicator */}
            {isPreviewing && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
                <Volume2 className="w-4 h-4 text-accent animate-pulse-glow" />
                <span className="text-xs text-accent font-medium">Previsualizando efecto...</span>
                <div className="flex gap-[2px] ml-auto">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-accent animate-wave"
                      style={{ height: `${8 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Effects grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {EFFECTS_LIST.map((effect) => {
                const isActive = activeEffect === effect.id;
                return (
                  <button
                    key={effect.id}
                    onClick={() => selectEffect(effect.id)}
                    className={`relative p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'ring-1 ring-accent magic-glow'
                        : 'hover:bg-card/60'
                    }`}
                    style={isActive ? {
                      background: theme === 'dark'
                        ? 'linear-gradient(135deg, hsl(270 40% 20% / 0.5), hsl(38 60% 30% / 0.3))'
                        : 'linear-gradient(135deg, hsl(270 50% 65% / 0.12), hsl(38 80% 55% / 0.08))'
                    } : {
                      background: theme === 'dark' ? 'hsl(222 30% 16% / 0.6)' : 'hsl(0 0% 100% / 0.5)'
                    }}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-3.5 h-3.5 text-accent" />
                      </div>
                    )}
                    <span className="text-lg">{effect.emoji}</span>
                    <p className="text-xs font-semibold mt-1 text-foreground">{effect.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{effect.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImmersiveEffectsPanel;
