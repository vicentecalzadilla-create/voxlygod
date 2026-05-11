-- Ensure the audios table always stores the authenticated creator on new rows
CREATE OR REPLACE FUNCTION public.set_audio_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_audio_user_id_before_insert ON public.audios;
CREATE TRIGGER set_audio_user_id_before_insert
BEFORE INSERT ON public.audios
FOR EACH ROW
EXECUTE FUNCTION public.set_audio_user_id();

ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own audios" ON public.audios;
DROP POLICY IF EXISTS "Users can create own audios" ON public.audios;
CREATE POLICY "Users can create their own audios"
ON public.audios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view audios" ON public.audios;
CREATE POLICY "Anyone can view audios"
ON public.audios
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can update their own audios" ON public.audios;
CREATE POLICY "Users can update their own audios"
ON public.audios
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own audios" ON public.audios;
CREATE POLICY "Users can delete their own audios"
ON public.audios
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Consolidate audios bucket policies for authenticated uploads and public playback
DROP POLICY IF EXISTS "Authenticated can upload to audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files in audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files in audios bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read audio files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read audios bucket" ON storage.objects;

CREATE POLICY "Public can read audios bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'audios');

CREATE POLICY "Authenticated users can upload audios"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Authenticated users can update audios"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audios')
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Authenticated users can delete audios"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audios');