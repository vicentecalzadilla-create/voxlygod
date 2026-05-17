import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { mockAudios, categories, type AudioPost } from '@/data/mockData';
import AudioCard from '@/components/AudioCard';
import AudioEditorDialog from '@/components/AudioEditorDialog';
import { supabase } from '@/integrations/supabase/client';

interface EditableInfo { id: string; title: string; audio_url: string }

const FeedPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playSignal, setPlaySignal] = useState(1);
  const [autoNext, setAutoNext] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Para ti');
  const [userAudios, setUserAudios] = useState<AudioPost[]>([]);
  const [ownedIds, setOwnedIds] = useState<Record<string, EditableInfo>>({});
  const [editing, setEditing] = useState<EditableInfo | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);

  const audios = useMemo(() => [...userAudios, ...mockAudios], [userAudios]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('audios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled || !data) return;
      const mapped: AudioPost[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        creatorName: row.creator_name,
        creatorAvatar: row.creator_avatar || '🙏',
        duration: row.duration || 0,
        likes: row.likes || 0,
        comments: row.comments || 0,
        shares: row.shares || 0,
        tags: row.tags || [],
        verse: row.verse || undefined,
        category: row.category || 'General',
        visualEffect: (row.visual_effect || 'light-rays') as AudioPost['visualEffect'],
        isLiked: false,
        isSaved: false,
        allowImmersiveEffects: row.allow_immersive_effects ?? true,
        audioUrl: row.audio_url,
      }));
      setUserAudios(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  // Autoplay first track once mounted
  useEffect(() => {
    setPlaySignal(s => s + 1);
  }, [audios.length]);

  const setActiveAudio = useCallback((index: number) => {
    const safeIndex = Math.max(0, Math.min(index, audios.length - 1));
    if (safeIndex === activeIndexRef.current) return;
    activeIndexRef.current = safeIndex;
    setActiveIndex(safeIndex);
    setPlaySignal(signal => signal + 1);
  }, [audios.length]);

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    let bestIndex = activeIndexRef.current;
    let bestScore = Number.NEGATIVE_INFINITY;

    Array.from(container.children).forEach((child, index) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
      const visibleRatio = visible / Math.max(1, rect.height);
      const centerDistance = Math.abs((rect.top + rect.height / 2) - containerCenter);
      const centeredScore = 1 - centerDistance / Math.max(1, containerRect.height / 2);
      const score = visibleRatio >= 0.6 ? centeredScore + visibleRatio : visibleRatio - 2;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    setActiveAudio(bestIndex);
  }, [setActiveAudio]);

  useEffect(() => () => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
  }, []);

  const handleNext = () => {
    const next = (activeIndex + 1) % audios.length;
    activeIndexRef.current = next;
    setActiveIndex(next);
    setPlaySignal(signal => signal + 1);
    const el = scrollRef.current?.children[next] as HTMLElement;
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 glass glass-border">
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <h1 className="font-serif text-lg gold-gradient font-bold">Voxly</h1>
          <button
            onClick={() => setAutoNext(!autoNext)}
            className="flex items-center gap-1.5 text-xs"
          >
            {autoNext ? (
              <ToggleRight className="w-6 h-6 text-primary" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-muted-foreground" />
            )}
            <span className={autoNext ? 'gold-text font-medium' : 'text-muted-foreground'}>Auto</span>
          </button>
        </div>
        {/* Categories */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap text-xs px-3 py-1 rounded-full transition-all font-medium ${
                activeCategory === cat
                  ? 'text-primary-foreground gold-glow'
                  : 'bg-secondary/70 text-secondary-foreground hover:bg-secondary'
              }`}
              style={activeCategory === cat ? { background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto snap-y snap-mandatory"
        onScroll={() => {
          if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = requestAnimationFrame(updateActiveFromScroll);
        }}
      >
        {audios.map((audio, i) => (
          <AudioCard key={audio.id} audio={audio} isActive={i === activeIndex} autoPlay={autoNext} playSignal={playSignal} onNext={handleNext} />
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
