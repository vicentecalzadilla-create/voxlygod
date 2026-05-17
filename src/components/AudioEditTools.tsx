import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, Scissors, Plus, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  audioBufferToWav,
  concatBuffers,
  decodeSource,
  fmtTime,
  getEditCtx,
  sliceBuffer,
} from '@/audio/audioEditUtils';

export interface EditedResult {
  blob: Blob;
  duration: number;
  edited: boolean;
}

export interface AudioEditToolsHandle {
  /** Build a WAV blob of the trimmed + appended audio. */
  buildEdited: () => Promise<EditedResult | null>;
}

interface Props {
  source: Blob | string | null;
  onReady?: (duration: number) => void;
  className?: string;
}

const AudioEditTools = forwardRef<AudioEditToolsHandle, Props>(({ source, onReady, className }, ref) => {
  const [loading, setLoading] = useState(false);
  const [baseBuffer, setBaseBuffer] = useState<AudioBuffer | null>(null);
  const [appendBuffer, setAppendBuffer] = useState<AudioBuffer | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Load source whenever it changes
  useEffect(() => {
    let cancelled = false;
    setAppendBuffer(null);
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setPreviewPlaying(false);

    if (!source) {
      setBaseBuffer(null);
      setTrimStart(0); setTrimEnd(0);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const buf = await decodeSource(source);
        if (cancelled) return;
        setBaseBuffer(buf);
        setTrimStart(0);
        setTrimEnd(buf.duration);
        onReady?.(buf.duration);
      } catch (e) {
        console.error(e);
        toast({ title: 'No se pudo cargar el audio', variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const buf = await decodeSource(blob);
          setAppendBuffer(buf);
          toast({ title: '✅ Segmento grabado', description: `${fmtTime(buf.duration)} agregados al final` });
        } catch {
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

  const buildBuffer = (): AudioBuffer | null => {
    if (!baseBuffer) return null;
    const ctx = getEditCtx();
    const trimmed = sliceBuffer(ctx, baseBuffer, trimStart, trimEnd);
    return appendBuffer ? concatBuffers(ctx, trimmed, appendBuffer) : trimmed;
  };

  const buildPreview = () => {
    const buf = buildBuffer();
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

  const resetEdits = () => {
    if (baseBuffer) { setTrimStart(0); setTrimEnd(baseBuffer.duration); }
    setAppendBuffer(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewPlaying(false);
  };

  useImperativeHandle(ref, () => ({
    buildEdited: async () => {
      const buf = buildBuffer();
      if (!buf) return null;
      const edited =
        trimStart > 0.05 ||
        (baseBuffer && trimEnd < baseBuffer.duration - 0.05) ||
        !!appendBuffer;
      const blob = audioBufferToWav(buf);
      return { blob, duration: buf.duration, edited: !!edited };
    },
  }), [baseBuffer, trimStart, trimEnd, appendBuffer]);

  const totalDuration = baseBuffer?.duration || 0;
  const editedDuration = Math.max(0, trimEnd - trimStart) + (appendBuffer?.duration || 0);

  if (!source) return null;

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold gold-text flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5" /> Editor de audio
        </p>
        {(trimStart > 0 || (baseBuffer && trimEnd < baseBuffer.duration) || appendBuffer) && (
          <button onClick={resetEdits} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Restablecer
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground py-2">Procesando audio…</p>
      ) : !baseBuffer ? (
        <p className="text-xs text-destructive py-2">No se pudo cargar.</p>
      ) : (
        <>
          {/* Trim */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Inicio: {fmtTime(trimStart)}</span>
              <span>Fin: {fmtTime(trimEnd)}</span>
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
          <div className="p-2.5 rounded-xl card-luminous space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Pegar grabación al final
              </p>
              {appendBuffer && (
                <span className="text-[10px] text-primary">+{fmtTime(appendBuffer.duration)}</span>
              )}
            </div>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                isRecording ? 'bg-destructive/80 text-primary-foreground' : 'bg-primary/15 text-primary'
              }`}
            >
              {isRecording ? (
                <><Square className="w-3.5 h-3.5" fill="currentColor" /> Detener ({fmtTime(recordSeconds)})</>
              ) : (
                <><Mic className="w-3.5 h-3.5" /> {appendBuffer ? 'Regrabar segmento' : 'Grabar segmento'}</>
              )}
            </button>
          </div>

          {/* Preview */}
          <div className="p-2.5 rounded-xl glass-border space-y-2"
            style={{ background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.08), hsl(340 60% 70% / 0.06))' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">Previsualizar versión editada</span>
              <span className="text-[10px] text-muted-foreground">{fmtTime(editedDuration)}</span>
            </div>
            <audio ref={audioElRef} onEnded={() => setPreviewPlaying(false)} className="hidden" />
            <button
              onClick={togglePreview}
              className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%))' }}
            >
              {previewPlaying
                ? <><Pause className="w-3.5 h-3.5" /> Pausar previsualización</>
                : <><Play className="w-3.5 h-3.5" /> Previsualizar</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
});

AudioEditTools.displayName = 'AudioEditTools';
export default AudioEditTools;
