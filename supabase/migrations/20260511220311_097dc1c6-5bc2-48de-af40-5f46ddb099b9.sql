
-- 1. Public SELECT on audios storage bucket (for anon playback)
DROP POLICY IF EXISTS "Public can read audios bucket" ON storage.objects;
CREATE POLICY "Public can read audios bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audios');

-- 2. Prevent emails in creator_name
ALTER TABLE public.audios
  DROP CONSTRAINT IF EXISTS creator_name_not_email;
ALTER TABLE public.audios
  ADD CONSTRAINT creator_name_not_email
  CHECK (creator_name !~* '@');

-- 3. Restrict audio_url to known audio extensions
ALTER TABLE public.audios
  DROP CONSTRAINT IF EXISTS audio_url_valid_extension;
ALTER TABLE public.audios
  ADD CONSTRAINT audio_url_valid_extension
  CHECK (audio_url ~* '\.(mp3|webm|ogg|wav|m4a|aac)(\?.*)?$');

-- 4. Prevent owners from mutating their own engagement counters
CREATE OR REPLACE FUNCTION public.protect_audio_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id THEN
    NEW.likes := OLD.likes;
    NEW.comments := OLD.comments;
    NEW.shares := OLD.shares;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_audio_engagement_trigger ON public.audios;
CREATE TRIGGER protect_audio_engagement_trigger
BEFORE UPDATE ON public.audios
FOR EACH ROW
EXECUTE FUNCTION public.protect_audio_engagement();

-- Ensure set_audio_user_id trigger is attached (idempotent)
DROP TRIGGER IF EXISTS set_audio_user_id_trigger ON public.audios;
CREATE TRIGGER set_audio_user_id_trigger
BEFORE INSERT ON public.audios
FOR EACH ROW
EXECUTE FUNCTION public.set_audio_user_id();
