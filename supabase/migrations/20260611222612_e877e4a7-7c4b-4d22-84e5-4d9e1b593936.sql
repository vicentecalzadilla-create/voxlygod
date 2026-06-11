
DROP POLICY IF EXISTS "Anyone can view likes" ON public.audio_likes;
CREATE POLICY "Users can view own likes"
  ON public.audio_likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
REVOKE SELECT ON public.audio_likes FROM anon;

DROP POLICY IF EXISTS "Anyone can read tts cache" ON public.tts_cache;
CREATE POLICY "Users can read own tts cache"
  ON public.tts_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
REVOKE SELECT ON public.tts_cache FROM anon;
GRANT SELECT ON public.tts_cache TO authenticated;
