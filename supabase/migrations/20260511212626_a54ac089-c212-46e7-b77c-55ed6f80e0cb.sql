-- Harden the internal trigger function so it is not exposed as a callable API function
CREATE OR REPLACE FUNCTION public.set_audio_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_audio_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_audio_user_id() FROM anon;
REVOKE ALL ON FUNCTION public.set_audio_user_id() FROM authenticated;

-- Keep the audios bucket public for direct playback URLs, but do not expose broad object listing via API
DROP POLICY IF EXISTS "Public can read audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read audio files" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in audios bucket" ON storage.objects;
CREATE POLICY "Users can delete own files in audios bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audios' AND owner = auth.uid());