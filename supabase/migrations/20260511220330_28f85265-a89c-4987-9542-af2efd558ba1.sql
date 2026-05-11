
-- Public buckets serve files via /object/public URLs without RLS,
-- so the broad SELECT policy is unnecessary and enables listing.
DROP POLICY IF EXISTS "Public can read audios bucket" ON storage.objects;

-- Trigger doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.protect_audio_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE EXECUTE ON FUNCTION public.protect_audio_engagement() FROM PUBLIC, anon, authenticated;
