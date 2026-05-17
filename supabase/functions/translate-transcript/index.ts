import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY missing');
    const { segments, targetLang } = await req.json();
    if (!Array.isArray(segments) || !targetLang || !LANG_NAMES[targetLang]) {
      return new Response(JSON.stringify({ error: 'segments[] y targetLang (en|fr|es) requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const numbered = segments.map((s: any, i: number) => `${i + 1}. ${s.text}`).join('\n');
    const langName = LANG_NAMES[targetLang];

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `You are a professional translator. Translate each numbered line into ${langName}. Preserve numbering and line breaks. Keep spiritual/biblical tone. Output ONLY the translated lines, one per line, prefixed with the same number and period. No commentary.` },
          { role: 'user', content: numbered },
        ],
        temperature: 0.3,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('AI Gateway error', resp.status, err);
      return new Response(JSON.stringify({ error: 'Traducción falló' }), {
        status: resp.status === 429 ? 429 : resp.status === 402 ? 402 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content || '';
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const translated = segments.map((s: any, i: number) => {
      const line = lines.find(l => l.startsWith(`${i + 1}.`)) || lines[i] || s.text;
      const text = line.replace(/^\d+\.\s*/, '').trim();
      return { time: s.time, text };
    });
    return new Response(JSON.stringify({ segments: translated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || 'Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
