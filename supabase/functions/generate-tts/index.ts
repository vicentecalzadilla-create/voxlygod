import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ELEVEN_VOICE_MAP: Record<string, string> = {
  'pastor-sereno': 'JBFqnCBsd6RMkjVDRZzb',
  'voz-calida-femenina': 'EXAVITQu4vr4xnSDxMaL',
  'narrador-profundo': 'nPczCjzI2devNBz1zQrb',
  'voz-angelical': 'XB0fDUnXU5powFXDhCwa',
};

// Kokoro voice mapping per language (open source TTS)
// Prefixes: a=US-EN, b=UK-EN, e=ES, f=FR, p=PT-BR, i=IT
type Lang = 'es' | 'en' | 'fr' | 'pt' | 'it' | 'de' | 'auto';
const KOKORO_VOICE_MAP: Record<string, Partial<Record<Lang, string>>> = {
  'pastor-sereno':        { en: 'am_michael', es: 'em_alex',  fr: 'ff_siwis', pt: 'pm_alex',    it: 'im_nicola' },
  'voz-calida-femenina':  { en: 'af_bella',   es: 'ef_dora',  fr: 'ff_siwis', pt: 'pf_dora',    it: 'if_sara'   },
  'narrador-profundo':    { en: 'bm_george',  es: 'em_santa', fr: 'ff_siwis', pt: 'pm_santa',   it: 'im_nicola' },
  'voz-angelical':        { en: 'bf_emma',    es: 'ef_dora',  fr: 'ff_siwis', pt: 'pf_dora',    it: 'if_sara'   },
};
// Kokoro lang_code parameter
const KOKORO_LANG_CODE: Record<Lang, string> = { en: 'a', es: 'e', fr: 'f', pt: 'p', it: 'i', de: 'a', auto: 'a' };
// Languages NOT supported by Kokoro 82M — force ElevenLabs fallback
const KOKORO_UNSUPPORTED: Lang[] = ['de'];

type Segment = { time: number; text: string };
type Provider = 'kokoro' | 'elevenlabs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function handledError(error: string, detail: Record<string, unknown> = {}) {
  return json(200, { ok: false, error, fallback: true, ...detail });
}

function redactHeaders(headers: Headers) {
  const safe: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    safe[key] = /key|token|authorization|cookie/i.test(key) ? '[redacted]' : value;
  }
  return safe;
}

function buildSegmentsFromAlignment(alignment: any): Segment[] {
  const chars: string[] = alignment.characters || [];
  const starts: number[] = alignment.character_start_times_seconds || [];
  const segments: Segment[] = [];
  let buf = '';
  let bufStartIdx = 0;
  const flush = (endIdx: number) => {
    const trimmed = buf.trim();
    if (trimmed) {
      const t = starts[bufStartIdx] ?? 0;
      segments.push({ time: Math.round(t * 10) / 10, text: trimmed });
    }
    buf = '';
    bufStartIdx = endIdx;
  };
  for (let i = 0; i < chars.length; i++) {
    if (!buf) bufStartIdx = i;
    buf += chars[i];
    const c = chars[i];
    const isBreak = /[.!?¿¡;:\n]/.test(c);
    const longEnough = buf.length > 70 && /\s/.test(c);
    if (isBreak || longEnough) flush(i + 1);
  }
  flush(chars.length);
  return segments;
}

// Approximate segments from text alone (when provider doesn't return timestamps).
// Splits into sentence-like chunks and distributes time proportionally by char count.
function approximateSegments(text: string, duration: number): Segment[] {
  const raw = text.trim().split(/(?<=[.!?¡¿;:\n])\s+/).filter(Boolean);
  // Merge very short chunks
  const chunks: string[] = [];
  for (const r of raw) {
    if (chunks.length && (chunks[chunks.length - 1].length < 40 || r.length < 25)) {
      chunks[chunks.length - 1] += ' ' + r;
    } else {
      chunks.push(r);
    }
  }
  const totalChars = chunks.reduce((s, c) => s + c.length, 0) || 1;
  const segs: Segment[] = [];
  let acc = 0;
  for (const c of chunks) {
    const t = (acc / totalChars) * duration;
    segs.push({ time: Math.round(t * 10) / 10, text: c.trim() });
    acc += c.length;
  }
  return segs.length ? segs : [{ time: 0, text }];
}

const DAILY_LIMIT = 8;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Kokoro via public HF Space (Remsky/Kokoro-TTS-Zero) ---
const KOKORO_SPACE = 'https://remsky-kokoro-tts-zero.hf.space';
async function generateWithKokoro(text: string, voice: string, lang: Lang): Promise<{ bytes: Uint8Array; contentType: string }> {
  const effectiveLang: Lang = lang === 'auto' || lang === 'de' ? 'en' : lang;
  const kokoroVoice = KOKORO_VOICE_MAP[voice]?.[effectiveLang] || KOKORO_VOICE_MAP['pastor-sereno']?.[effectiveLang] || 'am_michael';
  console.log('[kokoro] lang', effectiveLang, 'voice', kokoroVoice);
  // Step 1: POST to start job, returns event_id
  const startResp = await fetch(`${KOKORO_SPACE}/gradio_api/call/generate_speech_from_ui`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [text, [kokoroVoice], 1.0] }),
  });
  if (!startResp.ok) {
    const t = await startResp.text();
    throw new Error(`Kokoro Space start ${startResp.status}: ${t.slice(0, 200)}`);
  }
  const startJson = await startResp.json();
  const eventId = startJson?.event_id;
  if (!eventId) throw new Error('Kokoro Space: no event_id');

  // Step 2: stream result (SSE-style)
  const resultResp = await fetch(`${KOKORO_SPACE}/gradio_api/call/generate_speech_from_ui/${eventId}`, {
    method: 'GET',
    headers: { 'Accept': 'text/event-stream' },
  });
  if (!resultResp.ok || !resultResp.body) {
    throw new Error(`Kokoro Space result ${resultResp.status}`);
  }

  // Read the stream, parse "event: complete" + "data: [...]"
  const reader = resultResp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let audioUrl: string | null = null;
  let lastEvent = '';
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        lastEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        if (lastEvent === 'complete' && payload && payload !== 'null') {
          try {
            const parsed = JSON.parse(payload);
            const file = Array.isArray(parsed) ? parsed[0] : parsed;
            audioUrl = file?.url || null;
          } catch (e) {
            console.error('[kokoro] parse error', e, payload.slice(0, 200));
          }
        } else if (lastEvent === 'error') {
          throw new Error(`Kokoro Space error: ${payload.slice(0, 300)}`);
        }
      }
    }
    if (audioUrl) break;
  }
  reader.cancel().catch(() => {});

  if (!audioUrl) throw new Error('Kokoro Space: no audio URL en respuesta');
  console.log('[kokoro] got audio url', audioUrl);

  // Download WAV bytes
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`Kokoro audio download ${audioResp.status}`);
  const bytes = new Uint8Array(await audioResp.arrayBuffer());
  const contentType = audioResp.headers.get('content-type') || 'audio/wav';
  return { bytes, contentType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const elevenKey = Deno.env.get('ELEVENLABS_API_KEY');
    const hfKey = Deno.env.get('HUGGINGFACE_API_KEY');
    console.log('[generate-tts] start', { hasEleven: Boolean(elevenKey), hasHF: Boolean(hfKey) });

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text || '').toString();
    const voice: string = (body?.voice || 'pastor-sereno').toString();
    const requestedProvider: Provider = (body?.provider === 'elevenlabs' ? 'elevenlabs' : 'kokoro');
    const rawLang = (body?.lang || 'auto').toString().toLowerCase();
    const lang: Lang = (['es','en','fr','pt','it','de','auto'].includes(rawLang) ? rawLang : 'auto') as Lang;
    if (!text.trim()) return handledError('El campo "text" es obligatorio', { error_type: 'invalid_text' });
    if (text.length > 4500) return handledError('Texto demasiado largo (máx 4500 caracteres)', { error_type: 'text_too_long' });

    const normalizedText = text.trim().replace(/\s+/g, ' ');
    console.log('[generate-tts] req', { provider: requestedProvider, voice, lang, chars: normalizedText.length });

    const supaUrl0 = Deno.env.get('SUPABASE_URL')!;
    const serviceKey0 = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supa0 = createClient(supaUrl0, serviceKey0);

    // Resolve user id (used for cache attribution + daily limit)
    let userId: string | null = null;
    const authHeader0 = req.headers.get('Authorization') || '';
    if (authHeader0) {
      const token = authHeader0.replace('Bearer ', '');
      const { data: u } = await supa0.auth.getUser(token);
      if (u?.user) userId = u.user.id;
    }

    // If language is unsupported by Kokoro, force ElevenLabs first
    const kokoroOk = !KOKORO_UNSUPPORTED.includes(lang);
    const providerOrder: Provider[] = !kokoroOk
      ? ['elevenlabs', 'kokoro']
      : requestedProvider === 'kokoro'
        ? ['kokoro', 'elevenlabs']
        : ['elevenlabs', 'kokoro'];

    let lastError: { provider: Provider; message: string; type?: string } | null = null;

    for (const provider of providerOrder) {
      // Skip if no key for that provider
      if (provider === 'elevenlabs' && !elevenKey) { lastError = { provider, message: 'Sin ELEVENLABS_API_KEY' }; continue; }
      // Kokoro uses public HF Space — no key required

      // Cache lookup (per provider+voice+lang+text)
      const textHash = await sha256Hex(`${provider}::${lang}::${voice}::${normalizedText}`);
      const { data: cached } = await supa0
        .from('tts_cache')
        .select('audio_url, duration, transcript')
        .eq('text_hash', textHash)
        .eq('voice', voice)
        .maybeSingle();
      if (cached?.audio_url) {
        console.log('[generate-tts] cache HIT', provider);
        return json(200, {
          ok: true,
          cached: true,
          provider,
          audio_url: cached.audio_url,
          duration: cached.duration || 0,
          transcript: cached.transcript || [{ time: 0, text }],
        });
      }

      // Daily rate limit (only for premium / elevenlabs to save credits; kokoro is free)
      if (provider === 'elevenlabs' && userId) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supa0
          .from('tts_cache')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', since);
        if ((count ?? 0) >= DAILY_LIMIT) {
          lastError = { provider, message: 'Límite diario alcanzado', type: 'daily_limit_reached' };
          console.log('[generate-tts] daily limit reached, skipping elevenlabs');
          continue;
        }
      }

      try {
        let audioBytes: Uint8Array;
        let contentType = 'audio/mpeg';
        let extension = 'mp3';
        let segments: Segment[];
        let duration = 0;

        if (provider === 'kokoro') {
          console.log('[generate-tts] trying Kokoro');
          const { bytes, contentType: ct } = await generateWithKokoro(normalizedText, voice);
          audioBytes = bytes;
          contentType = ct;
          extension = ct.includes('wav') ? 'wav' : ct.includes('flac') ? 'flac' : ct.includes('mpeg') ? 'mp3' : 'wav';
          // ~150 wpm average — rough duration estimate
          const words = normalizedText.split(/\s+/).length;
          duration = Math.max(1, Math.round((words / 150) * 60));
          segments = approximateSegments(normalizedText, duration);
        } else {
          console.log('[generate-tts] trying ElevenLabs');
          const voiceId = ELEVEN_VOICE_MAP[voice] || ELEVEN_VOICE_MAP['pastor-sereno'];
          const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'xi-api-key': elevenKey!, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              text: normalizedText,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.4, similarity_boost: 0.65, style: 0.15, use_speaker_boost: true },
            }),
          });
          if (!resp.ok) {
            const errTxt = await resp.text();
            console.error('[elevenlabs] error', { status: resp.status, body: errTxt.slice(0, 500) });
            let type = 'elevenlabs_error';
            if (resp.status === 401) type = /detected_unusual_activity|Free Tier/i.test(errTxt) ? 'account_blocked' : 'invalid_api_key';
            else if (resp.status === 402 || resp.status === 429) type = 'quota_exceeded';
            throw Object.assign(new Error(`ElevenLabs ${resp.status}`), { type, detail: errTxt.slice(0, 500) });
          }
          const data = await resp.json();
          const audioBase64: string | undefined = data.audio_base64;
          if (!audioBase64) throw new Error('ElevenLabs sin audio_base64');
          const bin = atob(audioBase64);
          audioBytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) audioBytes[i] = bin.charCodeAt(i);
          const alignment = data.alignment || data.normalized_alignment;
          segments = alignment ? buildSegmentsFromAlignment(alignment) : [{ time: 0, text: normalizedText }];
          const ends: number[] = alignment?.character_end_times_seconds || [];
          duration = ends.length ? Math.ceil(ends[ends.length - 1]) : 0;
        }

        // Upload audio
        const folder = userId || 'anon';
        const fileName = `${folder}/tts-${provider}-${Date.now()}.${extension}`;
        const { error: upErr } = await supa0.storage.from('audios').upload(fileName, audioBytes, {
          contentType, upsert: false,
        });
        if (upErr) {
          console.error('[generate-tts] upload error', upErr);
          throw new Error(`Upload: ${upErr.message}`);
        }
        const { data: pub } = supa0.storage.from('audios').getPublicUrl(fileName);

        // Cache
        const { error: cacheErr } = await supa0.from('tts_cache').insert({
          text_hash: textHash,
          voice,
          text: normalizedText,
          audio_url: pub.publicUrl,
          duration,
          transcript: segments,
          user_id: userId,
        });
        if (cacheErr) console.warn('[generate-tts] cache insert failed', cacheErr.message);

        console.log('[generate-tts] OK', { provider, duration, segments: segments.length });
        return json(200, {
          ok: true,
          cached: false,
          provider,
          fellBack: provider !== requestedProvider,
          audio_url: pub.publicUrl,
          duration,
          transcript: segments,
        });
      } catch (e: any) {
        console.error(`[generate-tts] ${provider} failed`, e?.message);
        lastError = { provider, message: e?.message || 'Error', type: e?.type };
        // try next provider
      }
    }

    // All providers failed
    return handledError(
      `No se pudo generar audio. Último error (${lastError?.provider}): ${lastError?.message}`,
      { error_type: lastError?.type || 'all_providers_failed', last_provider: lastError?.provider }
    );
  } catch (e: any) {
    console.error('[generate-tts] fatal', e?.message, e?.stack);
    return handledError(e?.message || 'Error interno', { error_type: 'unexpected_error' });
  }
});
