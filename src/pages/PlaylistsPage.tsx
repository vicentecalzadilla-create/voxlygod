import { useState } from 'react';
import { Plus, Play, ChevronRight } from 'lucide-react';
import { mockPlaylists, mockAudios } from '@/data/mockData';

const PlaylistsPage = () => {
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine');

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 space-y-5 pointillist-bg">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold gold-gradient">Playlists</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['mine', 'saved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-9 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab ? 'text-primary-foreground shadow-sm' : 'bg-secondary/70 text-secondary-foreground'
            }`}
            style={activeTab === tab ? { background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' } : undefined}
          >
            {tab === 'mine' ? 'Mis Playlists' : 'Guardadas'}
          </button>
        ))}
      </div>

      {/* Devocional diario */}
      <div className="p-4 rounded-2xl glass-border space-y-2"
        style={{ background: 'linear-gradient(135deg, hsl(38 80% 65% / 0.12), hsl(340 60% 72% / 0.08), hsl(200 70% 70% / 0.06))' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌅</span>
          <div>
            <h3 className="text-sm font-serif font-semibold">Devocional del día</h3>
            <p className="text-[10px] text-muted-foreground">Personalizado para ti</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          "Vengan a mí todos ustedes que están cansados y agobiados, y yo les daré descanso." — Mateo 11:28
        </p>
        <button className="flex items-center gap-2 text-xs font-medium gold-text">
          <Play className="w-4 h-4" /> Escuchar devocional
        </button>
      </div>

      {/* Playlists grid */}
      <div className="space-y-3">
        {mockPlaylists.map(pl => (
          <div key={pl.id} className="flex items-center gap-3 p-3 rounded-xl card-luminous hover:shadow-md transition-all cursor-pointer">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' }}>
              {pl.coverEffect === 'clouds' ? '☁️' : pl.coverEffect === 'candles' ? '🕯️' : pl.coverEffect === 'bible' ? '📖' : '✝️'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{pl.title}</p>
              <p className="text-[10px] text-muted-foreground">{pl.audioCount} audios · {pl.creator}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>

      {/* Saved audios */}
      <div>
        <h2 className="font-serif text-base font-semibold mb-3">Mi devocional guardado</h2>
        <div className="space-y-2">
          {mockAudios.filter(a => a.isSaved).map(audio => (
            <div key={audio.id} className="flex items-center gap-3 p-3 rounded-xl card-luminous">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.12), hsl(200 70% 70% / 0.1))' }}>{audio.creatorAvatar}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{audio.title}</p>
                <p className="text-[10px] text-muted-foreground">{audio.creatorName}</p>
              </div>
              <Play className="w-4 h-4 text-primary shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaylistsPage;
