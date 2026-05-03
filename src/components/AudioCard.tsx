import { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, SkipForward } from 'lucide-react';
import type { AudioPost } from '@/data/mockData';
import AudioVisualizer from './AudioVisualizer';
import visualizerBg from '@/assets/visualizer-bg.jpg';

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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full snap-start flex flex-col">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={visualizerBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      {/* Visualizer */}
      <div className="relative flex-1 flex items-center justify-center">
        <AudioVisualizer isPlaying={isPlaying && isActive} effect={audio.visualEffect} />
      </div>

      {/* Content overlay */}
      <div className="relative px-4 pb-4 space-y-3">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">{audio.creatorAvatar}</div>
          <div>
            <p className="text-sm font-semibold">{audio.creatorName}</p>
            <p className="text-[10px] text-muted-foreground">{audio.category}</p>
          </div>
          <button className="ml-auto text-xs px-3 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors">
            Seguir
          </button>
        </div>

        {/* Title & verse */}
        <div>
          <h3 className="font-serif text-lg font-semibold leading-tight">{audio.title}</h3>
          {audio.verse && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 gold-text">{audio.verse}</span>
          )}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{audio.description}</p>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap">
          {audio.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">#{tag}</span>
          ))}
        </div>

        {/* Player controls */}
        <div className="space-y-2">
          <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(Math.floor(audio.duration * progress / 100))}</span>
            <span>{formatTime(audio.duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center gold-glow transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
            </button>
            <button onClick={onNext} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <SkipForward className="w-5 h-5 text-secondary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Side actions */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-5 items-center">
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <Heart className={`w-6 h-6 transition-colors ${liked ? 'fill-primary text-primary' : 'text-foreground/70'}`} />
          <span className="text-[10px]">{(audio.likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-6 h-6 text-foreground/70" />
          <span className="text-[10px]">{audio.comments}</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Share2 className="w-6 h-6 text-foreground/70" />
          <span className="text-[10px]">{audio.shares}</span>
        </button>
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-0.5">
          <Bookmark className={`w-6 h-6 transition-colors ${saved ? 'fill-primary text-primary' : 'text-foreground/70'}`} />
          <span className="text-[10px]">{saved ? 'Guardado' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
};

export default AudioCard;
