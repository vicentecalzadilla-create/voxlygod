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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    console.log('[generate-tts] start, has key:', !!apiKey);
    if (!apiKey) return json(500, { error: 'ELEVENLABS_API_KEY no configurada en el servidor' });

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text || '').toString();
    const voice: string = (body?.voice || 'pastor-sereno').toString();
    if (!text.trim()) return json(400, { error: 'El campo "text" es obligatorio' });
    if (text.length > 4500) return json(400, { error: 'Texto demasiado largo (máx 4500 caracteres)' });

    const voiceId = VOICE_MAP[voice] || VOICE_MAP['pastor-sereno'];
    console.log('[generate-tts] voice:', voice, '->', voiceId, 'len:', text.length);

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      console.error('[generate-tts] ElevenLabs error', resp.status, errTxt);
      let userMsg = `ElevenLabs ${resp.status}`;
      if (resp.status === 401) {
        if (/detected_unusual_activity|Free Tier/i.test(errTxt)) {
          userMsg = 'ElevenLabs ha bloqueado la cuenta Free (actividad inusual). Actualiza a un plan de pago en elevenlabs.io o usa otra API key.';
        } else {
          userMsg = 'API key de ElevenLabs inválida';
        }
      }
      else if (resp.status === 402 || resp.status === 429) userMsg = 'Sin créditos / cuota de ElevenLabs agotada';
      else if (resp.status === 422) userMsg = 'Texto o voz inválidos para ElevenLabs';
      return json(502, { error: userMsg, status: resp.status, detail: errTxt.slice(0, 500) });
    }

    const data = await resp.json();
    const audioBase64: string | undefined = data.audio_base64;
    if (!audioBase64) {
      console.error('[generate-tts] missing audio_base64', Object.keys(data));
      return json(502, { error: 'Respuesta de ElevenLabs sin audio' });
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
      return json(500, { error: 'No se pudo subir el audio', detail: upErr.message });
    }
    const { data: pub } = supabase.storage.from('audios').getPublicUrl(fileName);

    const ends: number[] = alignment?.character_end_times_seconds || [];
    const duration = ends.length ? Math.ceil(ends[ends.length - 1]) : 0;

    console.log('[generate-tts] ok, duration:', duration, 'segments:', segments.length);
    return json(200, { audio_url: pub.publicUrl, duration, transcript: segments });
  } catch (e: any) {
    console.error('[generate-tts] fatal', e?.message, e?.stack);
    return json(500, { error: e?.message || 'Error interno' });
  }
});
