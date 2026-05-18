import { useState } from 'react';
import { Sparkles, Loader2, Type } from 'lucide-react';
import { TTS_VOICES, type TranscriptSegment } from '@/audio/ttsVoices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TtsResult {
  audio_url: string;
  duration: number;
  transcript: TranscriptSegment[];
  source_text: string;
  voice: string;
}

interface Props {
  initialText?: string;
  initialVoice?: string;
  onGenerated: (result: TtsResult) => void;
}

const TextToAudioPanel = ({ initialText = '', initialVoice = 'pastor-sereno', onGenerated }: Props) => {
  const [text, setText] = useState(initialText);
  const [voice, setVoice] = useState(initialVoice);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!text.trim()) {
      toast({ title: 'Falta el texto', description: 'Escribe o pega el texto que quieres convertir.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tts', {
        body: { text: text.trim(), voice },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.audio_url) throw new Error('Sin respuesta de audio');
      setPreviewUrl(data.audio_url);
      onGenerated({
        audio_url: data.audio_url,
        duration: data.duration || 0,
        transcript: data.transcript || [],
        source_text: text.trim(),
        voice,
      });
      toast({ title: data.cached ? '⚡ Reutilizado del caché' : '✨ Audio generado', description: data.cached ? 'Mismo texto + voz ya generados antes — sin consumir créditos.' : 'Voz IA + transcripción sincronizada lista.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'No se pudo generar', description: e?.message || 'Inténtalo de nuevo', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-2xl glass-border"
      style={{ background: 'linear-gradient(135deg, hsl(270 50% 65% / 0.08), hsl(38 80% 55% / 0.06))' }}
    >
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold gold-text">Crear desde texto</h3>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        maxLength={4500}
        placeholder="Escribe o pega aquí tu reflexión, salmo, oración..."
        className="w-full px-3 py-2 rounded-xl bg-card/80 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-sm"
      />
      <p className="text-[10px] text-muted-foreground text-right">{text.length}/4500</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Voz IA</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TTS_VOICES.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVoice(v.id)}
              className={`py-2 px-2 rounded-xl flex items-center gap-2 transition-all text-left ${
                voice === v.id ? 'ring-1 ring-primary magic-glow' : 'bg-card/60'
              }`}
              style={voice === v.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.15), hsl(270 50% 65% / 0.1))' } : undefined}
            >
              <span className="text-lg">{v.emoji}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-tight truncate">{v.label}</p>
                <p className="text-[9px] text-muted-foreground truncate">{v.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="w-full h-11 rounded-xl text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, hsl(38 80% 55%), hsl(340 60% 70%), hsl(270 50% 65%))' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Generando voz IA… (~10–20s)' : 'Generar audio con voz IA'}
      </button>
      <p className="text-[10px] text-muted-foreground text-center">
        Caché activado · Reutilizamos audios ya generados para ahorrar créditos · Límite: 8/día
      </p>

      {previewUrl && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Previsualización</p>
          <audio src={previewUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
};

export default TextToAudioPanel;
