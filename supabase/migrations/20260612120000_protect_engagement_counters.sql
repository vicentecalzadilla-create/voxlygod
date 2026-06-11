-- Evitar que los creadores manipulen sus propios contadores de interacción.
-- Los contadores (likes, comments, shares) solo los actualizan los triggers
-- del sistema; los usuarios pueden editar el resto de campos de sus audios.

REVOKE UPDATE ON public.audios FROM authenticated;
GRANT UPDATE (
  title,
  description,
  tags,
  category,
  verse,
  visual_effect,
  allow_immersive_effects,
  allow_voice_change,
  audio_url,
  duration,
  source_text,
  transcript,
  translations,
  tts_voice,
  creator_name,
  creator_avatar
) ON public.audios TO authenticated;
