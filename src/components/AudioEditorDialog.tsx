import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Mic, Square, Play, Pause, Save, Scissors, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AudioEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audio: { id: string; title: string; audio_url: string };
  onSaved?: (updated: { id: string; audio_url: string; duration: number; title: string }) => void;
}

// Encode an AudioBuffer to a WAV blob (PCM 16-bit)
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// Concatenate two AudioBuffers (resamples the second to first's rate via simple mapping)
function concatBuffers(ctx: AudioContext, a: AudioBuffer, b: AudioBuffer): AudioBuffer {
  const numCh = Math.max(a.numberOfChannels, b.numberOfChannels);
  const sr = a.sampleRate;
  // Resample b to a.sampleRate by linear interpolation
  const ratio = b.sampleRate / sr;
  const bLen = Math.floor(b.length / ratio);
  const out = ctx.createBuffer(numCh, a.length + bLen, sr);
  for (let c = 0; c < numCh; c++) {
    const dst = out.getChannelData(c);
    const aData = a.getChannelData(Math.min(c, a.numberOfChannels - 1));
    const bData = b.getChannelData(Math.min(c, b.numberOfChannels - 1));
    dst.set(aData, 0);
    for (let i = 0; i < bLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const frac = srcIdx - i0;
      const v0 = bData[i0] || 0;
      const v1 = bData[i0 + 1] || v0;
      dst[a.length + i] = v0 + (v1 - v0) * frac;
    }
  }
  return out;
}

function sliceBuffer(ctx: AudioContext, buf: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sr = buf.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(buf.length, Math.floor(endSec * sr));
  const len = Math.max(1, end - start);
  const out = ctx.createBuffer(buf.numberOfChannels, len, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.getChannelData(c).set(buf.getChannelData(c).subarray(start, end));
  }
  return out;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60 | 0).toString().padStart(2, '0')}`;

const AudioEditorDialog = ({ open, onOpenChange, audio, onSaved }: AudioEditorDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [baseBuffer, setBaseBuffer] = useState<AudioBuffer | null>(null);
  const [appendBuffer, setAppendBuffer] = useState<AudioBuffer | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Load source audio
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setAppendBuffer(null);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPreviewPlaying(false);

    (async () => {
      try {
        const ctx = ctxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        ctxRef.current = ctx;
        const res = await fetch(audio.audio_url);
        const ab = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab.slice(0));
        if (cancelled) return;
        setBaseBuffer(buf);
        setTrimStart(0);
        setTrimEnd(buf.duration);
      } catch (e) {
        console.error(e);
        toast({ title: 'No se pudo cargar el audio', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, audio.audio_url]);

  // Cleanup on close
  useEffect(() => {
    if (open) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewPlaying(false);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setRecordSeconds(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        try {
          const ab = await blob.arrayBuffer();
          const ctx = ctxRef.current!;
          const buf = await ctx.decodeAudioData(ab);
          setAppendBuffer(buf);
          toast({ title: '✅ Segmento grabado', description: `${fmt(buf.duration)} agregados al final` });
        } catch (e) {
          toast({ title: 'No se pudo procesar el segmento', variant: 'destructive' });
        }
      };
      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      toast({ title: 'Micrófono no disponible', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const buildEditedBuffer = (): AudioBuffer | null => {
    if (!baseBuffer || !ctxRef.current) return null;
    const trimmed = sliceBuffer(ctxRef.current, baseBuffer, trimStart, trimEnd);
    if (!appendBuffer) return trimmed;
    return concatBuffers(ctxRef.current, trimmed, appendBuffer);
  };

  const buildPreview = () => {
    const buf = buildEditedBuffer();
    if (!buf) return;
    const blob = audioBufferToWav(buf);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
    setTimeout(() => {
      const el = audioElRef.current;
      if (el) { el.src = url; el.play().then(() => setPreviewPlaying(true)).catch(() => {}); }
    }, 50);
  };

  const togglePreview = () => {
    const el = audioElRef.current;
    if (!el || !previewUrl) { buildPreview(); return; }
    if (previewPlaying) { el.pause(); setPreviewPlaying(false); }
    else { el.play().then(() => setPreviewPlaying(true)).catch(() => {}); }
  };

  const save = async (asNewVersion: boolean) => {
    const buf = buildEditedBuffer();
    if (!buf) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Inicia sesión', variant: 'destructive' });
        return;
      }
      const blob = audioBufferToWav(buf);
      const fileName = `${user.id}/edited-${Date.now()}.wav`;
      const { error: upErr } = await supabase.storage.from('audios').upload(fileName, blob, {
        contentType: 'audio/wav', upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('audios').getPublicUrl(fileName);
      const newDuration = Math.round(buf.duration);

      if (asNewVersion) {
        // Read current row to copy metadata
        const { data: src } = await supabase.from('audios').select('*').eq('id', audio.id).maybeSingle();
        if (!src) throw new Error('Original no encontrado');
        const newTitle = `${src.title} (v2)`;
        const { data: ins, error: insErr } = await supabase.from('audios').insert({
          title: newTitle,
          description: src.description,
          creator_name: src.creator_name,
          creator_avatar: src.creator_avatar,
          tags: src.tags,
          category: src.category,
          visual_effect: src.visual_effect,
          audio_url: pub.publicUrl,
          allow_immersive_effects: src.allow_immersive_effects,
          allow_voice_change: src.allow_voice_change,
          user_id: user.id,
          duration: newDuration,
          verse: src.verse,
        }).select('id').maybeSingle();
        if (insErr) throw insErr;
        toast({ title: '✅ Nueva versión guardada' });
        onSaved?.({ id: ins?.id || audio.id, audio_url: pub.publicUrl, duration: newDuration, title: newTitle });
      } else {
        const { error: updErr } = await supabase.from('audios')
          .update({ audio_url: pub.publicUrl, duration: newDuration })
          .eq('id', audio.id);
        if (updErr) throw updErr;
        toast({ title: '✅ Audio actualizado' });
        onSaved?.({ id: audio.id, audio_url: pub.publicUrl, duration: newDuration, title: audio.title });
      }
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'No se pudo guardar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const totalDuration = baseBuffer?.duration || 0;
  const editedDuration = Math.max(0, trimEnd - trimStart) + (appendBuffer?.duration || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif gold-text flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Editar audio
          </DialogTitle>
          <DialogDescription className="text-xs">{audio.title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando audio…</p>
        ) : !baseBuffer ? (
          <p className="text-sm text-destructive py-6 text-center">No se pudo cargar.</p>
        ) : (
          <div className="space-y-4">
            {/* Trim */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Inicio: {fmt(trimStart)}</span>
                <span>Fin: {fmt(trimEnd)}</span>
              </div>
              <label className="block text-[10px] text-muted-foreground">Recortar inicio</label>
              <input
                type="range" min={0} max={totalDuration} step={0.1}
                value={trimStart}
                onChange={e => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.5))}
                className="w-full accent-primary"
              />
              <label className="block text-[10px] text-muted-foreground">Recortar fin</label>
              <input
                type="range" min={0} max={totalDuration} step={0.1}
                value={trimEnd}
                onChange={e => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.5))}
                className="w-full accent-primary"
              />
              <div className="h-2 rounded-full bg-secondary relative overflow-hidden">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    left: `${(trimStart / totalDuration) * 100}%`,
                    width: `${((trimEnd - trimStart) / totalDuration) * 100}%`,
                    background: 'linear-gradient(90deg, hsl(38 80% 55%), hsl(340 60% 70%))',
                  }}
                />
              </div>
            </div>

            {/* Append recording */}
            <div className="p-3 rounded-xl card-luminous space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Pegar grabación al final
                </p>
                {appendBuffer && (
                  <span className="text-[10px] text-primary">+{fmt(appendBuffer.duration)}</span>
                )}
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  isRecording ? 'bg-destructive/80 text-primary-foreground' : 'bg-primary/15 text-primary'
                }`}
              >
                {isRecording ? (
                  <><Square className="w-3.5 h-3.5" fill="currentColor" /> Detener ({fmt(recordSeconds)})</>
                ) : (
                  <><Mic className="w-3.5 h-3.5" /> {appendBuffer ? 'Regrabar segmento' : 'Grabar segmento'}</>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl glass-border space-y-2"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.08), hsl(340 60% 70% / 0.06))' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Vista previa</span>
                <span className="text-[10px] text-muted-foreground">{fmt(editedDuration)}</span>
              </div>
              <audio ref={audioElRef} onEnded={() => setPreviewPlaying(false)} className="hidden" />
              <button
                onClick={togglePreview}
                className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-primary-foreground"
                style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
              >
                {previewPlaying
                  ? <><Pause className="w-3.5 h-3.5" /> Pausar vista previa</>
                  : <><Play className="w-3.5 h-3.5" /> Reproducir versión editada</>}
              </button>
            </div>

            {/* Save */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="h-10 rounded-xl text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Reemplazar'}
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="h-10 rounded-xl bg-secondary/80 text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Nueva versión
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AudioEditorDialog;
