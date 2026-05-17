
ALTER TABLE public.audios
  ADD COLUMN IF NOT EXISTS transcript jsonb,
  ADD COLUMN IF NOT EXISTS source_text text,
  ADD COLUMN IF NOT EXISTS tts_voice text,
  ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;
