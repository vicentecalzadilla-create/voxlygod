import { useEffect, useMemo, useRef, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import type { TranscriptSegment } from '@/audio/ttsVoices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  segments: TranscriptSegment[];
  currentTime: number;
  audioId: string;
  cachedTranslations?: Record<string, TranscriptSegment[]>;
  onSeek?: (time: number) => void;
}

type Lang = 'original' | 'en' | 'fr' | 'es';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'original', label: 'Original', flag: '🌐' },
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

const WINDOW = 2; // lines before/after active

const LyricsPanel = ({ segments, currentTime, audioId, cachedTranslations, onSeek }: Props) => {
  const [lang, setLang] = useState<Lang>('original');
  const [cache, setCache] = useState<Record<string, TranscriptSegment[]>>(cachedTranslations || {});
  const [loadingLang, setLoadingLang] = useState<Lang | null>(null);

  const displaySegments = useMemo(() => {
    if (lang === 'original') return segments;
    return cache[lang] || segments;
  }, [lang, cache, segments]);

  const activeIndex = useMemo(() => {
    let idx = 0;
    // Small lookahead so the highlight feels in sync with what the listener hears
    const t = currentTime + 0.25;
    for (let i = 0; i < displaySegments.length; i++) {
      if (displaySegments[i].time <= t) idx = i;
      else break;
    }
    return idx;
  }, [displaySegments, currentTime]);

  const visible = useMemo(() => {
    const start = Math.max(0, activeIndex - WINDOW);
    const end = Math.min(displaySegments.length, activeIndex + WINDOW + 1);
    return displaySegments.slice(start, end).map((seg, i) => ({ seg, absIdx: start + i }));
  }, [displaySegments, activeIndex]);

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
    <div className="absolute inset-0 flex flex-col items-stretch animate-fade-in">
      {/* Soft glow overlay backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.10), transparent 70%)',
        }}
      />

      {/* Language chips */}
      <div className="relative flex items-center justify-center gap-1.5 px-4 pt-3">
        <Languages className="w-3.5 h-3.5 text-accent mr-1" />
        {LANGS.map(l => {
          const active = lang === l.id;
          const isLoading = loadingLang === l.id;
          return (
            <button
              key={l.id}
              onClick={() => handleLang(l.id)}
              disabled={isLoading}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-all ${
                active ? 'text-primary-foreground gold-glow' : 'bg-secondary/60 text-secondary-foreground'
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

      {/* Lyrics window */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 gap-2 overflow-hidden">
        {displaySegments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">No hay transcripción disponible.</p>
        )}
        {visible.map(({ seg, absIdx }) => {
          const isActive = absIdx === activeIndex;
          const distance = Math.abs(absIdx - activeIndex);
          const isPast = absIdx < activeIndex;
          return (
            <button
              key={absIdx}
              onClick={() => onSeek?.(seg.time)}
              className={`block w-full text-center font-serif leading-snug transition-all duration-500 ${
                isActive
                  ? 'gold-text font-bold text-xl scale-105'
                  : isPast
                    ? 'text-muted-foreground/60'
                    : 'text-foreground/55'
              }`}
              style={{
                opacity: isActive ? 1 : Math.max(0.35, 1 - distance * 0.25),
                fontSize: isActive ? undefined : distance === 1 ? '0.95rem' : '0.8rem',
                textShadow: isActive
                  ? '0 0 18px hsl(var(--primary) / 0.55), 0 0 36px hsl(var(--primary) / 0.25)'
                  : undefined,
              }}
            >
              {seg.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsPanel;
