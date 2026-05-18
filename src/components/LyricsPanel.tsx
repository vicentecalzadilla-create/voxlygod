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
  audioElement?: HTMLAudioElement | null;
  duration?: number;
}

type Lang = 'original' | 'en' | 'fr' | 'es';

const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'original', label: 'Original', flag: '🌐' },
  { id: 'en', label: 'EN', flag: '🇺🇸' },
  { id: 'fr', label: 'FR', flag: '🇫🇷' },
  { id: 'es', label: 'ES', flag: '🇪🇸' },
];

// Small lookahead so the highlight feels in sync with what the listener hears.
// Browser audio output has ~80-150ms of latency; we anticipate slightly.
const LOOKAHEAD = 0.12;

const LyricsPanel = ({
  segments,
  currentTime,
  audioId,
  cachedTranslations,
  onSeek,
  audioElement,
  duration,
}: Props) => {
  const [lang, setLang] = useState<Lang>('original');
  const [cache, setCache] = useState<Record<string, TranscriptSegment[]>>(cachedTranslations || {});
  const [loadingLang, setLoadingLang] = useState<Lang | null>(null);

  const displaySegments = useMemo(() => {
    if (lang === 'original') return segments;
    return cache[lang] || segments;
  }, [lang, cache, segments]);

  // High-resolution clock: when an audio element is provided, read it via rAF
  // for frame-precise highlight updates instead of relying on the ~4Hz timeupdate event.
  const [hiResTime, setHiResTime] = useState(currentTime);
  useEffect(() => {
    if (!audioElement) {
      setHiResTime(currentTime);
      return;
    }
    let raf = 0;
    const tick = () => {
      setHiResTime(audioElement.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioElement, currentTime]);

  const effectiveTime = audioElement ? hiResTime : currentTime;

  const activeIndex = useMemo(() => {
    if (displaySegments.length === 0) return 0;
    const t = effectiveTime + LOOKAHEAD;
    // Force last segment when we're near the end of the audio.
    if (duration && duration > 0 && effectiveTime >= duration - 0.15) {
      return displaySegments.length - 1;
    }
    let idx = 0;
    for (let i = 0; i < displaySegments.length; i++) {
      if (displaySegments[i].time <= t) idx = i;
      else break;
    }
    return idx;
  }, [displaySegments, effectiveTime, duration]);

  // Scroll the active line into the vertical center of the panel smoothly.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const container = containerRef.current;
    const node = lineRefs.current[activeIndex];
    if (!container || !node) return;
    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const offset =
      (nodeRect.top - containerRect.top) - (containerRect.height / 2 - nodeRect.height / 2);
    container.scrollBy({ top: offset, behavior: 'smooth' });
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

      {/* Lyrics scroll area: full list with fade masks and smooth centered auto-scroll */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto px-6 scroll-smooth no-scrollbar"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
        }}
      >
        {displaySegments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">No hay transcripción disponible.</p>
        )}
        {/* Top/bottom spacers so first/last line can center */}
        <div aria-hidden style={{ height: '45%' }} />
        <div className="flex flex-col items-stretch gap-3">
          {displaySegments.map((seg, i) => {
            const isActive = i === activeIndex;
            const distance = Math.abs(i - activeIndex);
            const isPast = i < activeIndex;
            const opacity = isActive ? 1 : Math.max(0.18, 1 - distance * 0.18);
            return (
              <button
                key={i}
                ref={(el) => (lineRefs.current[i] = el)}
                onClick={() => onSeek?.(seg.time)}
                className={`block w-full text-center font-serif leading-snug transition-all duration-500 ease-out ${
                  isActive
                    ? 'gold-text font-bold text-xl scale-[1.04]'
                    : isPast
                      ? 'text-muted-foreground/70'
                      : 'text-foreground/60'
                }`}
                style={{
                  opacity,
                  fontSize: isActive ? undefined : distance === 1 ? '1rem' : distance === 2 ? '0.9rem' : '0.82rem',
                  textShadow: isActive
                    ? '0 0 18px hsl(var(--primary) / 0.55), 0 0 36px hsl(var(--primary) / 0.25)'
                    : undefined,
                  filter: !isActive && distance > 2 ? 'blur(0.3px)' : undefined,
                }}
              >
                {seg.text}
              </button>
            );
          })}
        </div>
        <div aria-hidden style={{ height: '45%' }} />
      </div>
    </div>
  );
};

export default LyricsPanel;
