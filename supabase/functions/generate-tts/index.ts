import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VOICE_MAP: Record<string, string> = {
  'pastor-sereno': 'JBFqnCBsd6RMkjVDRZzb',       // George
  'voz-calida-femenina': 'EXAVITQu4vr4xnSDxMaL', // Sarah
  'narrador-profundo': 'nPczCjzI2devNBz1zQrb',   // Brian
  'voz-angelical': 'XB0fDUnXU5powFXDhCwa',       // Charlotte
};

type Segment = { time: number; text: string };

function buildSegmentsFromAlignment(text: string, alignment: any): Segment[] {
  const chars: string[] = alignment.characters || [];
  const starts: number[] = alignment.character_start_times_seconds || [];

  // Split source text into "phrase" chunks at sentence breaks or every ~80 chars
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY no configurada');

    const { text, voice } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.length > 4500) {
      return new Response(JSON.stringify({ error: 'Texto demasiado largo (máx 4500 caracteres)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const voiceId = VOICE_MAP[voice] || VOICE_MAP['pastor-sereno'];

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
        }),
      }
    );
    if (!resp.ok) {
      const err = await resp.text();
      console.error('ElevenLabs error', resp.status, err);
      return new Response(JSON.stringify({ error: 'TTS falló', detail: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    const audioBase64: string = data.audio_base64;
    const alignment = data.alignment || data.normalized_alignment;
    const segments = alignment ? buildSegmentsFromAlignment(text, alignment) : [{ time: 0, text }];

    // Upload to storage (audios bucket) so the file is reusable
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    let userId = 'anon';
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: u } = await supabase.auth.getUser(token);
      if (u?.user) userId = u.user.id;
    }
    // decode base64 -> bytes
    const bin = atob(audioBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const fileName = `${userId}/tts-${Date.now()}.mp3`;
    const { error: upErr } = await supabase.storage.from('audios').upload(fileName, bytes, {
      contentType: 'audio/mpeg', upsert: false,
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('audios').getPublicUrl(fileName);

    // Compute duration from alignment
    const ends: number[] = alignment?.character_end_times_seconds || [];
    const duration = ends.length ? Math.ceil(ends[ends.length - 1]) : 0;

    return new Response(JSON.stringify({
      audio_url: pub.publicUrl,
      duration,
      transcript: segments,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
