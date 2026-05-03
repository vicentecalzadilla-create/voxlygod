import { useState } from 'react';
import { Search, TrendingUp, Clock, Star } from 'lucide-react';
import { mockAudios, mockPlaylists } from '@/data/mockData';

const DiscoverPage = () => {
  const [query, setQuery] = useState('');

  const trendingTags = ['#Salmo23', '#OraciónDeLaMañana', '#Fe', '#Esperanza', '#Gratitud', '#JesúsTeAma', '#Paz'];

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar versículo, tema o creador..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-secondary border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Trending tags */}
      <div>
        <h2 className="font-serif text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Tendencias
        </h2>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map(tag => (
            <button key={tag} className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Popular audios */}
      <div>
        <h2 className="font-serif text-base font-semibold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" /> Populares
        </h2>
        <div className="space-y-2">
          {mockAudios.slice(0, 4).map((audio, i) => (
            <div key={audio.id} className="flex items-center gap-3 p-3 rounded-xl bg-card glass-border transition-colors hover:bg-secondary/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg gold-text font-serif font-bold">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{audio.title}</p>
                <p className="text-[10px] text-muted-foreground">{audio.creatorName} · {Math.floor(audio.duration / 60)} min</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{audio.likes.toLocaleString()} ❤</span>
            </div>
          ))}
        </div>
      </div>

      {/* Playlists */}
      <div>
        <h2 className="font-serif text-base font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Playlists destacadas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {mockPlaylists.map(pl => (
            <div key={pl.id} className="p-3 rounded-xl bg-card glass-border space-y-2 hover:bg-secondary/30 transition-colors cursor-pointer">
              <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <span className="text-3xl">{pl.coverEffect === 'clouds' ? '☁️' : pl.coverEffect === 'candles' ? '🕯️' : pl.coverEffect === 'bible' ? '📖' : '✝️'}</span>
              </div>
              <p className="text-xs font-semibold truncate">{pl.title}</p>
              <p className="text-[10px] text-muted-foreground">{pl.audioCount} audios · {pl.creator}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
