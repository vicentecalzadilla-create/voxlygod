ALTER TABLE public.audios
  ADD CONSTRAINT title_max_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT description_max_length CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT verse_max_length CHECK (verse IS NULL OR char_length(verse) <= 1000),
  ADD CONSTRAINT creator_name_max_length CHECK (char_length(creator_name) <= 100),
  ADD CONSTRAINT tags_max_count CHECK (tags IS NULL OR array_length(tags, 1) <= 5);

CREATE OR REPLACE FUNCTION public.validate_audio_tags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF NEW.tags IS NOT NULL THEN
    FOREACH t IN ARRAY NEW.tags LOOP
      IF char_length(t) > 50 THEN
        RAISE EXCEPTION 'Each tag must be 50 characters or less';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_audio_tags_trigger ON public.audios;
CREATE TRIGGER validate_audio_tags_trigger
BEFORE INSERT OR UPDATE ON public.audios
FOR EACH ROW EXECUTE FUNCTION public.validate_audio_tags();