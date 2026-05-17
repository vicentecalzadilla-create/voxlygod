import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, Wand2, X, Sparkles, Volume2, Square, AlertCircle, Type } from 'lucide-react';
import { EFFECTS_LIST, getAudioEffectsEngine, type EffectType } from '@/audio/AudioEffectsEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AudioEditTools, { type AudioEditToolsHandle } from '@/components/AudioEditTools';
import { VISUAL_EFFECTS } from '@/audio/audioEditUtils';
import TextToAudioPanel from '@/components/TextToAudioPanel';
import type { TranscriptSegment } from '@/audio/ttsVoices';

const visualEffects = VISUAL_EFFECTS;

const CreatePage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedEffect, setSelectedEffect] = useState('light-rays');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [allowVoiceChange, setAllowVoiceChange] = useState(true);
  const [allowImmersive, setAllowImmersive] = useState(true);
  const [previewEffect, setPreviewEffect] = useState<EffectType>('none');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [mode, setMode] = useState<'record' | 'upload' | 'text'>('record');
  const [ttsData, setTtsData] = useState<{ url: string; duration: number; transcript: TranscriptSegment[]; source: string; voice: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const engineConnectedRef = useRef(false);
  const editorRef = useRef<AudioEditToolsHandle>(null);

  const engine = getAudioEffectsEngine();

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Tu navegador no soporta acceso al micrófono.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => setRecordSeconds(s => s + 1), 1000);
      toast({ title: '🎙️ Grabando', description: 'Habla cerca del micrófono...' });
    } catch (err: any) {
      console.error(err);
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador.'
        : 'No se pudo acceder al micrófono.';
      setMicError(msg);
      toast({ title: 'Micrófono bloqueado', description: msg, variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Archivo inválido', description: 'Selecciona un archivo de audio.', variant: 'destructive' });
      return;
    }
    setAudioBlob(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
    toast({ title: '✅ Archivo cargado', description: file.name });
  };

  const togglePreview = () => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (previewPlaying) {
      el.pause();
      setPreviewPlaying(false);
    } else {
      if (!engineConnectedRef.current) {
        try { engine.connectAudio(el); engineConnectedRef.current = true; } catch {}
      }
      engine.resume();
      el.play().then(() => setPreviewPlaying(true)).catch(() => {});
    }
  };

  const addTag = () => {
    const v = tagInput.trim().slice(0, 50);
    if (v && tags.length < 5) {
      setTags([...tags, v]);
      setTagInput('');
    }
  };

  const handlePreviewEffect = (effect: EffectType) => {
    setPreviewEffect(effect);
    setIsPreviewing(true);
    engine.applyEffect(effect);
    setTimeout(() => setIsPreviewing(false), 2500);
  };

  const handlePublish = async () => {
    if (!audioBlob && !ttsData) {
      toast({ title: 'Sin audio', description: 'Graba, sube un archivo o genera desde texto.', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Falta el título', description: 'Agrega un título a tu audio.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: 'Inicia sesión',
          description: 'Debes entrar con una cuenta para publicar audios.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      let finalUrl: string;
      let finalDuration: number;
      let transcriptForRow: TranscriptSegment[] | null = null;
      let sourceTextForRow: string | null = null;
      let voiceForRow: string | null = null;

      if (mode === 'text' && ttsData) {
        finalUrl = ttsData.url;
        finalDuration = ttsData.duration;
        transcriptForRow = ttsData.transcript;
        sourceTextForRow = ttsData.source;
        voiceForRow = ttsData.voice;
      } else {
        if (!audioBlob) throw new Error('Sin audio');
        // Use edited version if user trimmed or appended a segment
        const edited = await editorRef.current?.buildEdited();
        const useEdited = !!(edited && edited.edited);
        const uploadBlob: Blob = useEdited ? edited!.blob : audioBlob;
        finalDuration = edited
          ? Math.round(edited.duration)
          : Math.round(recordSeconds || 0);

        const t = uploadBlob.type;
        const ext = useEdited ? 'wav'
          : t.includes('webm') ? 'webm'
          : t.includes('mpeg') || t.includes('mp3') ? 'mp3'
          : t.includes('ogg') ? 'ogg'
          : t.includes('wav') ? 'wav'
          : t.includes('m4a') || t.includes('mp4') ? 'm4a'
          : t.includes('aac') ? 'aac'
          : 'webm';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('audios').upload(fileName, uploadBlob, {
          contentType: uploadBlob.type || 'audio/webm',
          upsert: false,
        });
        if (upErr) throw upErr;
        finalUrl = supabase.storage.from('audios').getPublicUrl(fileName).data.publicUrl;
      }

      const { error: insErr } = await supabase.from('audios').insert({
        title,
        description,
        creator_name: 'Creador',
        creator_avatar: voiceForRow ? '✨' : '🙏',
        tags,
        category: 'General',
        visual_effect: selectedEffect,
        audio_url: finalUrl,
        allow_immersive_effects: allowImmersive,
        allow_voice_change: allowVoiceChange,
        user_id: user.id,
        duration: finalDuration,
        transcript: transcriptForRow,
        source_text: sourceTextForRow,
        tts_voice: voiceForRow,
      });
      if (insErr) throw insErr;
      toast({ title: '🎉 Publicado', description: 'Tu audio ya está disponible en el feed.' });
      setTitle(''); setDescription(''); setTags([]); setAudioBlob(null); setTtsData(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null); setRecordSeconds(0);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error al publicar', description: err?.message || 'Inténtalo de nuevo más tarde.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-5 pointillist-bg">
      <h1 className="font-serif text-xl font-bold gold-gradient">Crear Audio</h1>

      {micError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{micError}</p>
        </div>
      )}

      {/* Record / Upload */}
      <div className="flex gap-3">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex-1 h-32 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
            isRecording ? 'bg-destructive/10 border-2 border-destructive' : 'card-luminous'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRecording ? 'bg-destructive/80 animate-pulse-glow' : ''}`}
            style={!isRecording ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.2), hsl(340 60% 70% / 0.2))' } : undefined}
          >
            {isRecording
              ? <Square className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              : <Mic className="w-6 h-6 text-primary" />}
          </div>
          <span className="text-xs font-medium">
            {isRecording ? `Detener (${fmt(recordSeconds)})` : audioBlob ? 'Grabar de nuevo' : 'Grabar audio'}
          </span>
        </button>

        <label className="flex-1 h-32 rounded-2xl card-luminous flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all cursor-pointer">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(200 70% 70% / 0.2), hsl(270 50% 65% / 0.2))' }}>
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs font-medium">Subir archivo</span>
          <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {audioBlob && (
        <div className="p-3 rounded-xl glass-border"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.08), hsl(340 60% 70% / 0.06))' }}>
          <AudioEditTools ref={editorRef} source={audioBlob} />
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Ej: Reflexión sobre el amor de Dios"
          className="w-full h-11 px-3 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="Describe tu audio..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-sm"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            maxLength={50}
            placeholder="Ej: Fe, Salmos..."
            className="flex-1 h-10 px-3 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
          <button onClick={addTag} className="px-4 h-10 rounded-xl text-primary-foreground text-sm font-medium shadow-sm"
            style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>+</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/15 gold-text font-medium">
              #{tag}
              <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Visual effect */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Efecto visual</label>
        <div className="flex gap-2">
          {visualEffects.map(ef => (
            <button
              key={ef.id}
              onClick={() => setSelectedEffect(ef.id)}
              className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                selectedEffect === ef.id ? 'ring-1 ring-primary magic-glow' : 'bg-card/60'
              }`}
              style={selectedEffect === ef.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' } : undefined}
            >
              <span className="text-xl">{ef.emoji}</span>
              <span className="text-[9px] font-medium">{ef.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Immersive Effects Preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <label className="text-xs font-medium text-foreground">Previsualizar efectos inmersivos</label>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {audioUrl ? 'Reproduce el audio y prueba cada efecto en tiempo real.' : 'Graba o sube un audio para previsualizar.'}
        </p>

        {isPreviewing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
            <Volume2 className="w-4 h-4 text-accent animate-pulse-glow" />
            <span className="text-[10px] text-accent font-medium">
              {EFFECTS_LIST.find(e => e.id === previewEffect)?.label}
            </span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {EFFECTS_LIST.map(effect => (
            <button
              key={effect.id}
              onClick={() => handlePreviewEffect(effect.id)}
              className={`py-2.5 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                previewEffect === effect.id
                  ? 'ring-1 ring-accent magic-glow'
                  : 'bg-card/60 hover:bg-card/80'
              }`}
            >
              <span className="text-base">{effect.emoji}</span>
              <span className="text-[8px] font-medium text-center leading-tight">{effect.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-xl card-luminous">
          <div>
            <p className="text-xs font-medium">Permitir cambio de voz</p>
            <p className="text-[10px] text-muted-foreground">Los oyentes pueden elegir otra voz IA</p>
          </div>
          <button
            onClick={() => setAllowVoiceChange(!allowVoiceChange)}
            className={`w-10 h-6 rounded-full transition-colors relative ${allowVoiceChange ? 'bg-primary' : 'bg-secondary'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowVoiceChange ? 'left-5' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl card-luminous">
          <div>
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Permitir efectos inmersivos
            </p>
            <p className="text-[10px] text-muted-foreground">Los oyentes pueden aplicar efectos de audio</p>
          </div>
          <button
            onClick={() => setAllowImmersive(!allowImmersive)}
            className={`w-10 h-6 rounded-full transition-colors relative ${allowImmersive ? 'bg-accent' : 'bg-secondary'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-primary-foreground absolute top-1 transition-all ${allowImmersive ? 'left-5' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* AI suggest */}
      <button className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-md card-luminous text-accent">
        <Wand2 className="w-4 h-4" /> Sugerir efecto y tags con IA
      </button>

      {/* Publish */}
      <button
        disabled={uploading}
        onClick={handlePublish}
        className="w-full h-12 rounded-xl text-primary-foreground font-semibold text-sm gold-glow transition-transform active:scale-[0.98] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%), hsl(270 50% 65%))' }}
      >
        {uploading ? 'Publicando...' : 'Publicar Audio'}
      </button>
    </div>
  );
};

export default CreatePage;
