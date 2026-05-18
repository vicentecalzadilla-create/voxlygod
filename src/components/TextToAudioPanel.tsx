import { useState, useMemo } from 'react';
import { Sparkles, Loader2, Type } from 'lucide-react';
import { TTS_VOICES, TTS_PROVIDERS, type TranscriptSegment, type TtsProvider } from '@/audio/ttsVoices';
import { detectLanguage, LANG_META, type DetectedLang } from '@/audio/detectLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TtsResult {
  audio_url: string;
  duration: number;
  transcript: TranscriptSegment[];
  source_text: string;
  voice: string;
  provider?: TtsProvider;
  lang?: DetectedLang;
}

type LangChoice = 'auto' | DetectedLang;
const LANG_OPTIONS: LangChoice[] = ['auto', 'es', 'en', 'fr', 'pt', 'it', 'de'];

interface Props {
  initialText?: string;
  initialVoice?: string;
  onGenerated: (result: TtsResult) => void;
}

const TextToAudioPanel = ({ initialText = '', initialVoice = 'pastor-sereno', onGenerated }: Props) => {
  const [text, setText] = useState(initialText);
  const [voice, setVoice] = useState(initialVoice);
  const [provider, setProvider] = useState<TtsProvider>('kokoro');
  const [langChoice, setLangChoice] = useState<LangChoice>('auto');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const detected = useMemo(() => detectLanguage(text), [text]);
  const effectiveLang: LangChoice = langChoice === 'auto' ? (detected.confidence > 0 ? detected.lang : 'es') : langChoice;

  const generate = async () => {
    if (!text.trim()) {
      toast({ title: 'Falta el texto', description: 'Escribe o pega el texto que quieres convertir.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const sendLang = langChoice === 'auto' ? (detected.confidence > 0 ? detected.lang : 'auto') : langChoice;
      const { data, error } = await supabase.functions.invoke('generate-tts', {
        body: { text: text.trim(), voice, provider, lang: sendLang },
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
        provider: data.provider,
        lang: data.lang,
      });
      const usedProvider = data.provider === 'elevenlabs' ? 'ElevenLabs' : 'Kokoro';
      const langLabel = data.lang && LANG_META[data.lang as DetectedLang]
        ? `${LANG_META[data.lang as DetectedLang].flag} ${LANG_META[data.lang as DetectedLang].label}`
        : '';
      const title = data.cached
        ? `⚡ Reutilizado del caché (${usedProvider})`
        : data.fellBack
          ? `✨ Audio generado · fallback a ${usedProvider}`
          : `✨ Audio generado con ${usedProvider}`;
      toast({ title, description: `${langLabel ? langLabel + ' · ' : ''}${data.cached ? 'Sin consumir créditos.' : 'Voz IA + transcripción sincronizada lista.'}` });
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
        <label className="text-[11px] font-medium text-muted-foreground">Motor de voz IA</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TTS_PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`py-2 px-2 rounded-xl flex items-center gap-2 transition-all text-left ${
                provider === p.id ? 'ring-1 ring-primary magic-glow' : 'bg-card/60'
              }`}
              style={provider === p.id ? { background: 'linear-gradient(135deg, hsl(38 80% 55% / 0.18), hsl(270 50% 65% / 0.12))' } : undefined}
            >
              <span className="text-lg">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] font-medium leading-tight truncate">{p.label}</p>
                  <span className="text-[8px] px-1 py-px rounded-full bg-primary/15 text-primary leading-none">{p.badge}</span>
                </div>
                <p className="text-[9px] text-muted-foreground truncate">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">Voz</label>
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
        Kokoro por defecto (gratis) · Fallback automático a ElevenLabs si falla · Caché activado
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
