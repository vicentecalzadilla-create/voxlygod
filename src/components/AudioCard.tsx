import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Share2, Bookmark, Play, Pause, SkipForward, Repeat, Repeat1, Scissors, Type } from 'lucide-react';
import type { AudioPost } from '@/data/mockData';
import AudioVisualizer from './AudioVisualizer';
import ImmersiveEffectsPanel from './ImmersiveEffectsPanel';
import TranscriptionPanel from './TranscriptionPanel';
import VoiceSelectorPanel from './VoiceSelectorPanel';
import LyricsPanel from './LyricsPanel';
import { useTheme } from '@/contexts/ThemeContext';
import { useAudioPlayback } from '@/audio/AudioPlaybackContext';

// Fallback transcripts for mock audios (synced with TranscriptionPanel mocks)
const MOCK_TRANSCRIPTS: Record<string, { time: number; text: string }[]> = {
  '1': [
    { time: 0, text: 'El Señor es mi pastor, nada me faltará.' },
    { time: 8, text: 'En lugares de delicados pastos me hará descansar.' },
    { time: 15, text: 'Junto a aguas de reposo me pastoreará.' },
    { time: 22, text: 'Confortará mi alma.' },
    { time: 28, text: 'Me guiará por sendas de justicia por amor de su nombre.' },
    { time: 38, text: 'Aunque ande en valle de sombra de muerte,' },
    { time: 45, text: 'no temeré mal alguno, porque tú estarás conmigo.' },
    { time: 55, text: 'Tu vara y tu cayado me infundirán aliento.' },
    { time: 65, text: 'Aderezas mesa delante de mí en presencia de mis angustiadores.' },
    { time: 78, text: 'Unges mi cabeza con aceite; mi copa está rebosando.' },
    { time: 88, text: 'Ciertamente el bien y la misericordia me seguirán todos los días de mi vida.' },
    { time: 100, text: 'Y en la casa del Señor moraré por largos días.' },
  ],
};


interface AudioCardProps {
  audio: AudioPost;
  isActive: boolean;
  autoPlay?: boolean;
  playSignal?: number;
  onNext: () => void;
  onEdit?: () => void;
}

const AudioCard = ({ audio, isActive, autoPlay = true, playSignal = 0, onNext, onEdit }: AudioCardProps) => {
  const [amen, setAmen] = useState(audio.isLiked);
  const [amenBurstKey, setAmenBurstKey] = useState(0);
  const [iconPulseKey, setIconPulseKey] = useState(0);
  const [saved, setSaved] = useState(audio.isSaved);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const lyricsSegments = useMemo(
    () => audio.transcript && audio.transcript.length ? audio.transcript : (MOCK_TRANSCRIPTS[audio.id] || []),
    [audio.id, audio.transcript]
  );
  const hasLyrics = lyricsSegments.length > 0;
  const { theme } = useTheme();
  const playback = useAudioPlayback();
  const { playTrack, toggleTrack, cycleRepeatMode, seekTo } = playback;
  const isCurrent = playback.currentTrackId === audio.id;
  const isPlaying = isCurrent && playback.isPlaying;
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const liveTime = isCurrent ? playback.currentTime : 0;
  const currentTime = scrubbing ? scrubTime : liveTime;
  const duration = (isCurrent ? playback.duration : 0) || audio.duration;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const repeatMode = playback.getRepeatMode(audio.id);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60 | 0).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (isActive && autoPlay && playSignal > 0) {
      // Always restart from 0:00 when track becomes active via scroll/auto
      playTrack(audio, { restart: true }).catch(() => {});
    }
  }, [audio, autoPlay, isActive, playSignal, playTrack]);

  useEffect(() => {
    if (isActive && playback.endedTrackId === audio.id && playback.endedSignal > 0) {
        onNext();
    }
  }, [audio.id, isActive, onNext, playback.endedSignal, playback.endedTrackId]);

  const togglePlay = () => toggleTrack(audio).catch(() => {});

  const cycleRepeat = () => {
    cycleRepeatMode(audio.id);
  };

  const bgGradient = theme === 'dark'
    ? 'linear-gradient(165deg, hsl(222 47% 8%) 0%, hsl(222 47% 10%) 25%, hsl(230 40% 12%) 55%, hsl(222 47% 8%) 100%)'
    : 'linear-gradient(165deg, hsl(200 70% 92%) 0%, hsl(210 40% 96%) 25%, hsl(340 40% 94%) 55%, hsl(38 50% 93%) 100%)';

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full snap-start flex flex-col">
      <div className="absolute inset-0" style={{ background: bgGradient }} />

      {/* Visualizer / Lyrics swap area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${lyricsOpen ? 'opacity-0' : 'opacity-100'}`}
        >
          <AudioVisualizer isPlaying={isPlaying && isActive} effect={audio.visualEffect} />
        </div>
        {lyricsOpen && hasLyrics && (
          <LyricsPanel
            segments={lyricsSegments}
            currentTime={currentTime}
            audioId={audio.id}
            cachedTranslations={audio.translations}
            onSeek={(t) => seekTo(audio.id, t)}
          />
        )}
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
          <VoiceSelectorPanel audioElement={isCurrent ? playback.audioElement : null} audioId={audio.id} />
          {hasLyrics && (
            <button
              onClick={() => setLyricsOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full card-luminous font-medium transition-all hover:gold-glow"
              aria-label="Mostrar letra sincronizada"
            >
              <Type className="w-3.5 h-3.5 text-accent" />
              <span className="gold-text">Letra</span>
            </button>
          )}
        </div>

        {/* Player controls */}
        <div className="space-y-2">
          <div
            role="slider"
            aria-label="Posición del audio"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, Math.floor(duration))}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
            className="relative h-6 flex items-center cursor-pointer touch-none select-none group"
            onPointerDown={(e) => {
              const target = e.currentTarget;
              target.setPointerCapture(e.pointerId);
              const updateFromEvent = (clientX: number) => {
                const rect = target.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
                const t = ratio * (duration || 0);
                setScrubTime(t);
              };
              setScrubbing(true);
              if (!isCurrent) {
                playTrack(audio).catch(() => {});
              }
              updateFromEvent(e.clientX);
              const onMove = (ev: PointerEvent) => updateFromEvent(ev.clientX);
              const onUp = (ev: PointerEvent) => {
                updateFromEvent(ev.clientX);
                target.removeEventListener('pointermove', onMove);
                target.removeEventListener('pointerup', onUp);
                target.removeEventListener('pointercancel', onUp);
                const rect = target.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
                seekTo(audio.id, ratio * (duration || 0));
                setScrubbing(false);
              };
              target.addEventListener('pointermove', onMove);
              target.addEventListener('pointerup', onUp);
              target.addEventListener('pointercancel', onUp);
            }}
            onKeyDown={(e) => {
              if (!duration) return;
              const step = e.shiftKey ? 10 : 5;
              if (e.key === 'ArrowRight') seekTo(audio.id, Math.min(duration, currentTime + step));
              if (e.key === 'ArrowLeft') seekTo(audio.id, Math.max(0, currentTime - step));
            }}
          >
            <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-visible">
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, hsl(38 80% 55%), hsl(340 60% 70%), hsl(270 50% 65%))'
                }}
              />
              <div
                className="absolute top-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background shadow-md transition-transform group-hover:scale-110 active:scale-125"
                style={{
                  left: `${progress}%`,
                  background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))'
                }}
              />
            </div>
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
        <button
          onClick={() => {
            setAmen(!amen);
            setAmenBurstKey(k => k + 1);
            setIconPulseKey(k => k + 1);
          }}
          className="relative flex flex-col items-center gap-0.5 group"
        >
          <span
            key={`icon-${iconPulseKey}`}
            className={`text-xl transition-all duration-300 ${amen ? 'scale-110' : 'opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0'} ${iconPulseKey > 0 ? 'animate-amen-pulse' : ''}`}
            style={amen ? { filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))' } : undefined}
          >🙏</span>
          <span className={`text-[10px] tabular-nums transition-colors ${amen ? 'text-primary font-semibold' : 'text-foreground/70'}`}>
            {(audio.likes + (amen ? 1 : 0)).toLocaleString()}
          </span>
          {amenBurstKey > 0 && (
            <span
              key={`burst-${amenBurstKey}`}
              aria-hidden
              className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 font-serif text-sm font-semibold tracking-wide animate-amen-rise"
              style={{
                color: 'hsl(var(--primary))',
                textShadow: '0 0 10px hsl(var(--primary) / 0.7), 0 0 20px hsl(var(--primary) / 0.4)',
              }}
            >
              Amén
            </span>
          )}
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
        {onEdit && (
          <button onClick={onEdit} className="flex flex-col items-center gap-0.5" aria-label="Editar audio">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground gold-glow"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
            >
              <Scissors className="w-4 h-4" />
            </span>
            <span className="text-[10px] text-primary font-medium">Editar</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default AudioCard;
