import { useState, useRef, useEffect } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { mockAudios, categories } from '@/data/mockData';
import AudioCard from '@/components/AudioCard';

const FeedPage = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoNext, setAutoNext] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Para ti');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    const next = (activeIndex + 1) % mockAudios.length;
    setActiveIndex(next);
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
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Math.round(el.scrollTop / el.clientHeight);
          if (index !== activeIndex) setActiveIndex(index);
        }}
      >
        {mockAudios.map((audio, i) => (
          <AudioCard key={audio.id} audio={audio} isActive={i === activeIndex} autoPlay={autoNext} onNext={handleNext} />
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
