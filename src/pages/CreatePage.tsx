import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Upload, Wand2, X, Sparkles, Volume2, Square, Play, Pause, AlertCircle } from 'lucide-react';
import { EFFECTS_LIST, getAudioEffectsEngine, type EffectType } from '@/audio/AudioEffectsEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const visualEffects = [
  { id: 'light-rays', label: 'Rayos de luz', emoji: '✨' },
  { id: 'cross', label: 'Cruz', emoji: '✝️' },
  { id: 'clouds', label: 'Cielo', emoji: '☁️' },
  { id: 'candles', label: 'Velas', emoji: '🕯️' },
  { id: 'bible', label: 'Biblia', emoji: '📖' },
];

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const engineConnectedRef = useRef(false);

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
    if (tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
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
    if (!audioBlob) {
      toast({ title: 'Sin audio', description: 'Graba o sube un audio primero.', variant: 'destructive' });
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

      const ext = audioBlob.type.includes('webm') ? 'webm' : audioBlob.type.includes('mpeg') ? 'mp3' : 'audio';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('audios').upload(fileName, audioBlob, {
        contentType: audioBlob.type || 'audio/webm',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('audios').getPublicUrl(fileName);
      const { error: insErr } = await supabase.from('audios').insert({
        title,
        description,
        creator_name: user?.email?.split('@')[0] || 'Anónimo',
        creator_avatar: '🙏',
        tags,
        category: 'General',
        visual_effect: selectedEffect,
        audio_url: pub.publicUrl,
        allow_immersive_effects: allowImmersive,
        allow_voice_change: allowVoiceChange,
        user_id: user.id,
        duration: Math.round(recordSeconds || 0),
      });
      if (insErr) throw insErr;
      toast({ title: '🎉 Publicado', description: 'Tu audio ya está disponible.' });
      setTitle(''); setDescription(''); setTags([]); setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null); setRecordSeconds(0);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error al publicar', description: err.message ?? 'Inténtalo de nuevo.', variant: 'destructive' });
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

      {audioUrl && (
        <div className="p-3 rounded-xl glass-border space-y-2"
          style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.08), hsl(340 60% 70% / 0.06))' }}>
          <audio ref={previewAudioRef} src={audioUrl} crossOrigin="anonymous"
            onEnded={() => setPreviewPlaying(false)} className="hidden" />
          <div className="flex items-center gap-3">
            <button onClick={togglePreview}
              className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}>
              {previewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex gap-[2px] items-end h-6 flex-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="w-[2px] rounded-full" style={{
                  height: `${8 + Math.random() * 16}px`,
                  background: `hsl(${38 + i * 10} 70% 60%)`,
                  opacity: previewPlaying ? 1 : 0.5,
                }} />
              ))}
            </div>
            <span className="text-xs text-primary font-medium">
              {recordSeconds > 0 ? fmt(recordSeconds) : 'Audio'}
            </span>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
