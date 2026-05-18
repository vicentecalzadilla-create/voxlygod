
DROP POLICY "Authenticated can insert tts cache" ON public.tts_cache;
CREATE POLICY "Users can insert own tts cache"
ON public.tts_cache FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
