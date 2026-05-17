import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { AudioPost } from '@/data/mockData';
import { getAudioEffectsEngine, type EffectType } from '@/audio/AudioEffectsEngine';

type RepeatMode = 'none' | 'one' | 'loop';

interface AudioPlaybackContextValue {
  audioElement: HTMLAudioElement | null;
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  endedTrackId: string | null;
  endedSignal: number;
  playTrack: (track: AudioPost, options?: { restart?: boolean }) => Promise<void>;
  pause: () => void;
  toggleTrack: (track: AudioPost) => Promise<void>;
  getRepeatMode: (trackId: string) => RepeatMode;
  cycleRepeatMode: (trackId: string) => RepeatMode;
  seekTo: (trackId: string, time: number) => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

export const AudioPlaybackProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionsRef = useRef<Record<string, number>>({});
  const currentTrackRef = useRef<AudioPost | null>(null);
  const pendingSeekRef = useRef(0);
  const repeatModesRef = useRef<Record<string, RepeatMode>>({});
  const [repeatVersion, setRepeatVersion] = useState(0);
  const [playerElement, setPlayerElement] = useState<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [endedTrackId, setEndedTrackId] = useState<string | null>(null);
  const [endedSignal, setEndedSignal] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/' && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [location.pathname]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    setPlayerElement(audio);

    const savePosition = () => {
      const track = currentTrackRef.current;
      if (track && Number.isFinite(audio.currentTime)) {
        positionsRef.current[track.id] = audio.currentTime;
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      if (pendingSeekRef.current > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(pendingSeekRef.current, Math.max(0, audio.duration - 0.25));
        pendingSeekRef.current = 0;
      }
    };

    const handleTimeUpdate = () => {
      savePosition();
      setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const track = currentTrackRef.current;
      if (!track) return;

      const repeatMode = repeatModesRef.current[track.id] || 'none';
      if (repeatMode === 'loop' || repeatMode === 'one') {
        if (repeatMode === 'one') {
          repeatModesRef.current[track.id] = 'none';
          setRepeatVersion(value => value + 1);
        }
        audio.currentTime = 0;
        positionsRef.current[track.id] = 0;
        audio.play().catch(() => setIsPlaying(false));
        return;
      }

      positionsRef.current[track.id] = 0;
      setIsPlaying(false);
      setProgress(0);
      setEndedTrackId(track.id);
      setEndedSignal(signal => signal + 1);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      savePosition();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
      setPlayerElement(null);
    };
  }, []);

  const applySavedVoice = useCallback((audio: HTMLAudioElement, trackId: string) => {
    const savedVoice = localStorage.getItem(`voxly-voice-${trackId}`);
    const pitchByVoice: Record<string, number> = {
      original: 1,
      'pastor-serene': 0.92,
      'warm-female': 1.12,
      'deep-narrator': 0.85,
      angelic: 1.18,
      child: 1.25,
    };
    audio.playbackRate = pitchByVoice[savedVoice || 'original'] || 1;
  }, []);

  const connectEffects = useCallback((audio: HTMLAudioElement, trackId: string) => {
    try {
      const engine = getAudioEffectsEngine();
      engine.connectAudio(audio);
      engine.applyEffect((localStorage.getItem(`voxly-effect-${trackId}`) as EffectType | null) || 'none');
      engine.resume();
    } catch (error) {
      console.warn('Could not connect audio effects:', error);
    }
  }, []);

  const playTrack = useCallback(async (track: AudioPost, options?: { restart?: boolean }) => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return;

    const previous = currentTrackRef.current;
    if (previous && previous.id !== track.id && Number.isFinite(audio.currentTime)) {
      positionsRef.current[previous.id] = audio.currentTime;
    }

    const isSameTrack = currentTrackRef.current?.id === track.id;
    currentTrackRef.current = track;
    setCurrentTrackId(track.id);
    setEndedTrackId(null);
    applySavedVoice(audio, track.id);

    if (!isSameTrack || audio.src !== new URL(track.audioUrl, window.location.href).href) {
      pendingSeekRef.current = options?.restart ? 0 : positionsRef.current[track.id] || 0;
      audio.src = track.audioUrl;
      audio.load();
      setCurrentTime(pendingSeekRef.current);
      setProgress(0);
    } else if (options?.restart) {
      audio.currentTime = 0;
      positionsRef.current[track.id] = 0;
    }

    connectEffects(audio, track.id);
    await audio.play();
  }, [applySavedVoice, connectEffects]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggleTrack = useCallback(async (track: AudioPost) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentTrackRef.current?.id === track.id && !audio.paused) {
      audio.pause();
      return;
    }
    await playTrack(track);
  }, [playTrack]);

  const getRepeatMode = useCallback((trackId: string) => repeatModesRef.current[trackId] || 'none', []);

  const cycleRepeatMode = useCallback((trackId: string) => {
    const current = repeatModesRef.current[trackId] || 'none';
    const next: RepeatMode = current === 'none' ? 'one' : current === 'one' ? 'loop' : 'none';
    repeatModesRef.current[trackId] = next;
    setRepeatVersion(value => value + 1);
    return next;
  }, []);

  const seekTo = useCallback((trackId: string, time: number) => {
    const audio = audioRef.current;
    const safeTime = Math.max(0, time);
    positionsRef.current[trackId] = safeTime;
    if (audio && currentTrackRef.current?.id === trackId) {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = Math.min(safeTime, audio.duration - 0.05);
      } else {
        pendingSeekRef.current = safeTime;
      }
      setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }
  }, []);

  const value = useMemo<AudioPlaybackContextValue>(() => ({
    audioElement: playerElement,
    currentTrackId,
    isPlaying,
    currentTime,
    duration,
    progress,
    endedTrackId,
    endedSignal,
    playTrack,
    pause,
    toggleTrack,
    getRepeatMode,
    cycleRepeatMode,
    seekTo,
  }), [playerElement, currentTrackId, isPlaying, currentTime, duration, progress, endedTrackId, endedSignal, repeatVersion, playTrack, pause, toggleTrack, getRepeatMode, cycleRepeatMode, seekTo]);

  return <AudioPlaybackContext.Provider value={value}>{children}</AudioPlaybackContext.Provider>;
};

export const useAudioPlayback = () => {
  const context = useContext(AudioPlaybackContext);
  if (!context) throw new Error('useAudioPlayback must be used within AudioPlaybackProvider');
  return context;
};