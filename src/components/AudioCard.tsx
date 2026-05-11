import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, SkipForward, Repeat, Repeat1 } from 'lucide-react';
import type { AudioPost } from '@/data/mockData';
import AudioVisualizer from './AudioVisualizer';
import ImmersiveEffectsPanel from './ImmersiveEffectsPanel';
import TranscriptionPanel from './TranscriptionPanel';
import VoiceSelectorPanel from './VoiceSelectorPanel';
import { useTheme } from '@/contexts/ThemeContext';
import { getAudioEffectsEngine } from '@/audio/AudioEffectsEngine';

interface AudioCardProps {
  audio: AudioPost;
  isActive: boolean;
  autoPlay?: boolean;
  onNext: () => void;
}

type RepeatMode = 'none' | 'one' | 'loop';

const AudioCard = ({ audio, isActive, autoPlay = true, onNext }: AudioCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(audio.isLiked);
  const [saved, setSaved] = useState(audio.isSaved);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio.duration);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const { theme } = useTheme();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectedRef = useRef(false);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60 | 0).toString().padStart(2, '0')}`;

  const connectToEngine = useCallback(() => {
    if (audioRef.current && !connectedRef.current) {
      try {
        const engine = getAudioEffectsEngine();
        engine.connectAudio(audioRef.current);
        connectedRef.current = true;
        const savedEffect = localStorage.getItem(`voxly-effect-${audio.id}`);
        if (savedEffect) engine.applyEffect(savedEffect as any);
      } catch (e) {
        console.warn('Could not connect audio to Web Audio API:', e);
      }
    }
  }, [audio.id]);

  // Restore voice setting on mount
  useEffect(() => {
    const savedVoice = localStorage.getItem(`voxly-voice-${audio.id}`);
    if (savedVoice && audioRef.current) {
      import('./VoiceSelectorPanel').then(({ VOICES }) => {
        const voice = VOICES?.find((v) => v.id === savedVoice);
        if (voice && audioRef.current) audioRef.current.playbackRate = voice.pitch;
      });
    }
  }, [audio.id]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isActive && isPlaying) {
      connectToEngine();
      getAudioEffectsEngine().resume();
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive, isPlaying, connectToEngine]);

  useEffect(() => {
    if (isActive && autoPlay) {
      setIsPlaying(true);
    } else if (!isActive) {
      setIsPlaying(false);
      audioRef.current?.pause();
    }
  }, [isActive, autoPlay]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      if (el.duration && isFinite(el.duration)) setProgress((el.currentTime / el.duration) * 100);
    };
    const onLoadedMetadata = () => {
      if (el.duration && isFinite(el.duration)) setDuration(el.duration);
    };
    const onEnded = () => {
      if (repeatMode === 'loop') {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else if (repeatMode === 'one') {
        el.currentTime = 0;
        el.play().catch(() => {});
        setRepeatMode('none'); // play once more then stop repeating
      } else {
        setIsPlaying(false);
        setProgress(0);
        onNext();
      }
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('ended', onEnded);
    };
  }, [onNext, repeatMode]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const cycleRepeat = () => {
    setRepeatMode(prev => prev === 'none' ? 'one' : prev === 'one' ? 'loop' : 'none');
  };

  const bgGradient = theme === 'dark'
    ? 'linear-gradient(165deg, hsl(222 47% 8%) 0%, hsl(222 47% 10%) 25%, hsl(230 40% 12%) 55%, hsl(222 47% 8%) 100%)'
    : 'linear-gradient(165deg, hsl(200 70% 92%) 0%, hsl(210 40% 96%) 25%, hsl(340 40% 94%) 55%, hsl(38 50% 93%) 100%)';

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full snap-start flex flex-col">
      <audio ref={audioRef} src={audio.audioUrl} preload="metadata" crossOrigin="anonymous" />
      <div className="absolute inset-0" style={{ background: bgGradient }} />

      {/* Visualizer */}
      <div className="relative flex-1 flex items-center justify-center">
        <AudioVisualizer isPlaying={isPlaying && isActive} effect={audio.visualEffect} />
      </div>

      {/* Content overlay */}
      <div className="relative px-4 pb-4 space-y-2.5">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-rose/30 flex items-center justify-center text-lg shadow-sm">{audio.creatorAvatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">{audio.creatorName}</p>
              <button className="shrink-0 text-[10px] px-2.5 py-0.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors font-medium bg-card/60 backdrop-blur-sm">
                Seguir
              </button>
            </div>
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

        {/* Transcription */}
        <TranscriptionPanel audioId={audio.id} currentTime={currentTime} isPlaying={isPlaying && isActive} />

        {/* Effects & Voice row */}
        <div className="flex items-center gap-2 flex-wrap">
          <ImmersiveEffectsPanel audioId={audio.id} isPlaying={isPlaying && isActive} allowEffects={audio.allowImmersiveEffects} />
          <VoiceSelectorPanel audioElement={audioRef.current} audioId={audio.id} />
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
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center justify-center gap-5">
            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                repeatMode !== 'none' ? 'bg-primary/15 text-primary' : 'bg-secondary/80 text-secondary-foreground'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className={`w-4 h-4 ${repeatMode === 'loop' ? 'text-primary' : ''}`} />
              )}
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center gold-glow transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
            >
              {isPlaying ? <Pause className="w-6 h-6 text-primary-foreground" /> : <Play className="w-6 h-6 text-primary-foreground ml-0.5" />}
            </button>

            {/* Next */}
            <button onClick={onNext} className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center shadow-sm">
              <SkipForward className="w-4 h-4 text-secondary-foreground" />
            </button>
          </div>
          {/* Repeat label */}
          {repeatMode !== 'none' && (
            <p className="text-center text-[10px] text-primary font-medium">
              {repeatMode === 'one' ? 'Repetir una vez' : 'Repetir en bucle'}
            </p>
          )}
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
