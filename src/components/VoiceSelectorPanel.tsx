import { useState, useCallback } from 'react';
import { Mic2, X, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

export interface VoiceOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  pitch: number;      // playbackRate multiplier
  filterFreq: number; // lowpass filter freq (0 = disabled)
  gain: number;       // volume adjustment
}

export const VOICES: VoiceOption[] = [
  { id: 'original', label: 'Original', emoji: '🎵', description: 'Voz sin cambios', pitch: 1, filterFreq: 0, gain: 1 },
  { id: 'pastor-serene', label: 'Pastor Sereno', emoji: '🕊️', description: 'Tono grave y calmado', pitch: 0.92, filterFreq: 3500, gain: 1.1 },
  { id: 'warm-female', label: 'Voz Cálida', emoji: '💛', description: 'Femenina y acogedora', pitch: 1.12, filterFreq: 0, gain: 1 },
  { id: 'deep-narrator', label: 'Narrador Profundo', emoji: '📖', description: 'Grave y envolvente', pitch: 0.85, filterFreq: 2800, gain: 1.15 },
  { id: 'angelic', label: 'Voz Angelical', emoji: '👼', description: 'Etérea y brillante', pitch: 1.18, filterFreq: 0, gain: 0.95 },
  { id: 'child', label: 'Voz Juvenil', emoji: '✨', description: 'Fresca y clara', pitch: 1.25, filterFreq: 0, gain: 0.9 },
];

interface VoiceSelectorPanelProps {
  audioElement: HTMLAudioElement | null;
  audioId: string;
}

const VoiceSelectorPanel = ({ audioElement, audioId }: VoiceSelectorPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeVoice, setActiveVoice] = useState<string>(() => {
    return localStorage.getItem(`voxly-voice-${audioId}`) || 'original';
  });
  const { theme } = useTheme();

  const selectVoice = useCallback((voice: VoiceOption) => {
    setActiveVoice(voice.id);
    localStorage.setItem(`voxly-voice-${audioId}`, voice.id);
    
    if (audioElement) {
      // Apply pitch via playbackRate
      audioElement.playbackRate = voice.pitch;
      // Note: true voice morphing would require more advanced DSP,
      // but playbackRate gives a noticeable pitch shift
    }
  }, [audioElement, audioId]);

  const currentVoice = VOICES.find(v => v.id === activeVoice);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full card-luminous text-xs font-medium transition-all hover:shadow-md"
      >
        <Mic2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-foreground/80">
          {activeVoice === 'original' ? 'Voces IA' : currentVoice?.label}
        </span>
        {activeVoice !== 'original' && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 animate-fade-in-up"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(180deg, hsl(222 47% 14%) 0%, hsl(222 47% 10%) 100%)'
                : 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(210 40% 96%) 100%)'
            }}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-primary" />
                <h3 className="font-serif text-base font-semibold text-foreground">Selector de Voces IA</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {VOICES.map((voice) => {
                const isActive = activeVoice === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => selectVoice(voice)}
                    className={`relative p-3 rounded-xl text-left transition-all ${
                      isActive ? 'ring-1 ring-primary magic-glow' : 'hover:bg-card/60'
                    }`}
                    style={isActive ? {
                      background: theme === 'dark'
                        ? 'linear-gradient(135deg, hsl(38 60% 25% / 0.5), hsl(200 50% 25% / 0.3))'
                        : 'linear-gradient(135deg, hsl(38 80% 55% / 0.12), hsl(200 60% 60% / 0.08))'
                    } : {
                      background: theme === 'dark' ? 'hsl(222 30% 16% / 0.6)' : 'hsl(0 0% 100% / 0.5)'
                    }}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <span className="text-lg">{voice.emoji}</span>
                    <p className="text-xs font-semibold mt-1 text-foreground">{voice.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{voice.description}</p>
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

export default VoiceSelectorPanel;
