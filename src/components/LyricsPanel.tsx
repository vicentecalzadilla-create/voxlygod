import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Languages, Loader2 } from 'lucide-react';
import type { TranscriptSegment } from '@/audio/ttsVoices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  segments: TranscriptSegment[];
  currentTime: number;
  duration: number;
  audioId: string;
  cachedTranslations?: Record<string, TranscriptSegment[]>;
  onClose: () => void;
  onSeek?: (time: number) => void;
}

type Lang = 'original' | 'en' | 'fr' | 'es';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'original', label: 'Original', flag: '🌐' },
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

const LyricsPanel = ({ segments, currentTime, duration, audioId, cachedTranslations, onClose, onSeek }: Props) => {
  const [lang, setLang] = useState<Lang>('original');
  const [cache, setCache] = useState<Record<string, TranscriptSegment[]>>(cachedTranslations || {});
  const [loadingLang, setLoadingLang] = useState<Lang | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const displaySegments = useMemo(() => {
    if (lang === 'original') return segments;
    return cache[lang] || segments;
  }, [lang, cache, segments]);

  const activeIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < displaySegments.length; i++) {
      if (displaySegments[i].time <= currentTime + 0.05) idx = i;
      else break;
    }
    return idx;
  }, [displaySegments, currentTime]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  const handleLang = async (next: Lang) => {
    if (next === 'original' || cache[next]) { setLang(next); return; }
    setLoadingLang(next);
    try {
      const { data, error } = await supabase.functions.invoke('translate-transcript', {
        body: { segments, targetLang: next },
      });
      if (error) throw error;
      const translated: TranscriptSegment[] = data?.segments || [];
      setCache(c => ({ ...c, [next]: translated }));
      setLang(next);
      // Try to cache server-side (best-effort, owner only)
      supabase.from('audios').update({
        translations: { ...(cachedTranslations || {}), ...cache, [next]: translated },
      }).eq('id', audioId).then(() => {});
    } catch (e: any) {
      console.error(e);
      toast({ title: 'No se pudo traducir', description: e?.message, variant: 'destructive' });
    } finally {
      setLoadingLang(null);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold gold-text">Letra sincronizada</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary/70 flex items-center justify-center" aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Language chips */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
        {LANGS.map(l => {
          const active = lang === l.id;
          const isLoading = loadingLang === l.id;
          return (
            <button
              key={l.id}
              onClick={() => handleLang(l.id)}
              disabled={isLoading}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all ${
                active ? 'text-primary-foreground gold-glow' : 'bg-secondary/70 text-secondary-foreground'
              }`}
              style={active ? { background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' } : undefined}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          );
        })}
      </div>

      {/* Lyrics list */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
        {displaySegments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-10">No hay transcripción disponible para este audio.</p>
        )}
        {displaySegments.map((seg, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek?.(seg.time)}
              className={`cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'scale-[1.04] gold-text font-bold text-lg'
                  : isPast
                    ? 'text-muted-foreground/70 text-base'
                    : 'text-foreground/50 text-base'
              }`}
              style={isActive ? {
                textShadow: '0 0 18px hsl(var(--primary) / 0.55), 0 0 36px hsl(var(--primary) / 0.25)',
              } : undefined}
            >
              <p className="font-serif leading-relaxed">{seg.text}</p>
            </div>
          );
        })}
      </div>

      {/* Progress hint */}
      <div className="px-4 py-2 border-t border-border/40 text-center">
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {Math.floor(currentTime / 60)}:{(currentTime % 60 | 0).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60 | 0).toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  );
};

export default LyricsPanel;
