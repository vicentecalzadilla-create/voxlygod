
CREATE TABLE public.tts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash text NOT NULL,
  voice text NOT NULL,
  text text NOT NULL,
  audio_url text NOT NULL,
  duration integer DEFAULT 0,
  transcript jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tts_cache_hash_voice_idx ON public.tts_cache (text_hash, voice);
CREATE INDEX tts_cache_user_created_idx ON public.tts_cache (user_id, created_at);

ALTER TABLE public.tts_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tts cache"
ON public.tts_cache FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert tts cache"
ON public.tts_cache FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete own tts cache"
ON public.tts_cache FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
