import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, SkipForward } from 'lucide-react';
import type { AudioPost } from '@/data/mockData';
import AudioVisualizer from './AudioVisualizer';
import ImmersiveEffectsPanel from './ImmersiveEffectsPanel';
import { useTheme } from '@/contexts/ThemeContext';

interface AudioCardProps {
  audio: AudioPost;
  isActive: boolean;
  onNext: () => void;
}

const AudioCard = ({ audio, isActive, onNext }: AudioCardProps) => {
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [liked, setLiked] = useState(audio.isLiked);
  const [saved, setSaved] = useState(audio.isSaved);
  const [progress, setProgress] = useState(0);
  const { theme } = useTheme();

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const bgGradient = theme === 'dark'
    ? 'linear-gradient(165deg, hsl(222 47% 8%) 0%, hsl(222 47% 10%) 25%, hsl(230 40% 12%) 55%, hsl(222 47% 8%) 100%)'
    : 'linear-gradient(165deg, hsl(200 70% 92%) 0%, hsl(210 40% 96%) 25%, hsl(340 40% 94%) 55%, hsl(38 50% 93%) 100%)';

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full snap-start flex flex-col">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: bgGradient }} />

      {/* Visualizer */}
      <div className="relative flex-1 flex items-center justify-center">
        <AudioVisualizer isPlaying={isPlaying && isActive} effect={audio.visualEffect} />
      </div>

      {/* Follow button - top right, above side actions */}
      <div className="absolute right-3 top-4 z-20">
        <button className="text-[10px] px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors font-medium bg-card/60 backdrop-blur-sm">
          Seguir
        </button>
      </div>

      {/* Content overlay */}
      <div className="relative px-4 pb-4 space-y-3">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-rose/30 flex items-center justify-center text-lg shadow-sm">{audio.creatorAvatar}</div>
          <div>
            <p className="text-sm font-semibold text-foreground">{audio.creatorName}</p>
            <p className="text-[10px] text-muted-foreground">{audio.category}</p>
          </div>
        </div>

        {/* Title & verse */}
        <div>
          <h3 className="font-serif text-lg font-semibold leading-tight text-foreground">{audio.title}</h3>
          {audio.verse && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 gold-text font-medium">{audio.verse}</span>
          )}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{audio.description}</p>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {audio.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground">#{tag}</span>
          ))}
        </div>

        {/* Immersive Effects */}
        <div className="flex items-center gap-2">
          <ImmersiveEffectsPanel audioId={audio.id} isPlaying={isPlaying && isActive} allowEffects={audio.allowImmersiveEffects} />
        </div>

        {/* Player controls */}
        <div className="space-y-2">
          <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="absolute h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, hsl(38 80% 55%), hsl(340 60% 70%), hsl(270 50% 65%))'
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(Math.floor(audio.duration * progress / 100))}</span>
            <span>{formatTime(audio.duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full flex items-center justify-center gold-glow transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
            >
              {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
            </button>
            <button onClick={onNext} className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center shadow-sm">
              <SkipForward className="w-5 h-5 text-secondary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Side actions */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-5 items-center">
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <Heart className={`w-6 h-6 transition-colors ${liked ? 'fill-rose text-rose' : 'text-foreground/50'}`} />
          <span className="text-[10px] text-foreground/70">{(audio.likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-6 h-6 text-foreground/50" />
          <span className="text-[10px] text-foreground/70">{audio.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Share2 className="w-6 h-6 text-foreground/50" />
          <span className="text-[10px] text-foreground/70">{audio.shares}</span>
        </button>
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-0.5">
          <Bookmark className={`w-6 h-6 transition-colors ${saved ? 'fill-primary text-primary' : 'text-foreground/50'}`} />
          <span className="text-[10px] text-foreground/70">{saved ? 'Guardado' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
};

export default AudioCard;
