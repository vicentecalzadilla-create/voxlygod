import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VOICE_MAP: Record<string, string> = {
  'pastor-sereno': 'JBFqnCBsd6RMkjVDRZzb',
  'voz-calida-femenina': 'EXAVITQu4vr4xnSDxMaL',
  'narrador-profundo': 'nPczCjzI2devNBz1zQrb',
  'voz-angelical': 'XB0fDUnXU5powFXDhCwa',
};

type Segment = { time: number; text: string };

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

const DAILY_LIMIT = 8;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    console.log('[generate-tts] start', { hasElevenLabsKey: Boolean(apiKey), keyLength: apiKey?.length ?? 0 });
    if (!apiKey) return handledError('ELEVENLABS_API_KEY no configurada en el servidor', { error_type: 'missing_secret' });

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text || '').toString();
    const voice: string = (body?.voice || 'pastor-sereno').toString();
    if (!text.trim()) return handledError('El campo "text" es obligatorio', { error_type: 'invalid_text' });
    if (text.length > 4500) return handledError('Texto demasiado largo (máx 4500 caracteres)', { error_type: 'text_too_long' });

    const voiceId = VOICE_MAP[voice] || VOICE_MAP['pastor-sereno'];
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    const textHash = await sha256Hex(`${voice}::${normalizedText}`);
    console.log('[generate-tts] voice:', voice, '->', voiceId, 'len:', text.length, 'hash:', textHash.slice(0, 12));

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

    // 1) Cache lookup
    const { data: cached } = await supa0
      .from('tts_cache')
      .select('audio_url, duration, transcript')
      .eq('text_hash', textHash)
      .eq('voice', voice)
      .maybeSingle();
    if (cached?.audio_url) {
      console.log('[generate-tts] cache HIT');
      return json(200, {
        ok: true,
        cached: true,
        audio_url: cached.audio_url,
        duration: cached.duration || 0,
        transcript: cached.transcript || [{ time: 0, text }],
      });
    }
    console.log('[generate-tts] cache MISS');

    // 2) Daily rate limit (per authenticated user)
    if (userId) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supa0
        .from('tts_cache')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since);
      if ((count ?? 0) >= DAILY_LIMIT) {
        console.log('[generate-tts] daily limit reached for', userId, count);
        return handledError(
          'Has alcanzado el límite diario de generaciones con voz IA. Vuelve mañana.',
          { error_type: 'daily_limit_reached', limit: DAILY_LIMIT, used: count }
        );
      }
    }


    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.65, style: 0.15, use_speaker_boost: true },
      }),

    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error('[generate-tts] ElevenLabs error', {
        status: resp.status,
        statusText: resp.statusText,
        headers: redactHeaders(resp.headers),
        body: errTxt.slice(0, 2000),
        voice,
        voiceId,
        textLength: text.length,
      });
      let userMsg = `ElevenLabs ${resp.status}`;
      let errorType = 'elevenlabs_error';
      if (resp.status === 401) {
        if (/detected_unusual_activity|Free Tier/i.test(errTxt)) {
          userMsg = 'ElevenLabs ha bloqueado la cuenta Free (actividad inusual). Actualiza a un plan de pago en elevenlabs.io o usa otra API key.';
          errorType = 'account_blocked';
        } else {
          userMsg = 'API key de ElevenLabs inválida';
          errorType = 'invalid_api_key';
        }
      }
      else if (resp.status === 402 || resp.status === 429) { userMsg = 'Sin créditos / cuota de ElevenLabs agotada'; errorType = 'quota_exceeded'; }
      else if (resp.status === 422) { userMsg = 'Texto o voz inválidos para ElevenLabs'; errorType = 'invalid_text_or_voice'; }
      else if (resp.status >= 500) { userMsg = 'Servicio de ElevenLabs no disponible temporalmente'; errorType = 'provider_unavailable'; }
      return handledError(userMsg, { error_type: errorType, status: resp.status, detail: errTxt.slice(0, 1000) });
    }

    const data = await resp.json();
    const audioBase64: string | undefined = data.audio_base64;
    if (!audioBase64) {
      console.error('[generate-tts] missing audio_base64', Object.keys(data));
      return handledError('Respuesta de ElevenLabs sin audio', { error_type: 'missing_audio' });
    }
    const alignment = data.alignment || data.normalized_alignment;
    const segments = alignment ? buildSegmentsFromAlignment(alignment) : [{ time: 0, text }];

    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supaUrl, serviceKey);

    let userId = 'anon';
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: u } = await supabase.auth.getUser(token);
      if (u?.user) userId = u.user.id;
    }

    const bin = atob(audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const fileName = `${userId}/tts-${Date.now()}.mp3`;
    const { error: upErr } = await supabase.storage.from('audios').upload(fileName, bytes, {
      contentType: 'audio/mpeg', upsert: false,
    });
    if (upErr) {
      console.error('[generate-tts] upload error', upErr);
      return handledError('No se pudo subir el audio', { error_type: 'storage_upload_failed', detail: upErr.message });
    }
    const { data: pub } = supabase.storage.from('audios').getPublicUrl(fileName);

    const ends: number[] = alignment?.character_end_times_seconds || [];
    const duration = ends.length ? Math.ceil(ends[ends.length - 1]) : 0;

    console.log('[generate-tts] ok, duration:', duration, 'segments:', segments.length);
    return json(200, { ok: true, audio_url: pub.publicUrl, duration, transcript: segments });
  } catch (e: any) {
    console.error('[generate-tts] fatal', e?.message, e?.stack);
    return handledError(e?.message || 'Error interno', { error_type: 'unexpected_error' });
  }
});
