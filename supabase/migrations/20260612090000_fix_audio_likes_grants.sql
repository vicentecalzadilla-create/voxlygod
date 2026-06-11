-- Reparación de audio_likes: en la base de datos real faltó el permiso de
-- lectura pública (los contadores se muestran a todos) y el contador
-- audios.likes quedó desincronizado.

GRANT SELECT ON public.audio_likes TO anon;
GRANT SELECT ON public.audio_likes TO authenticated;

-- Asegurar que el trigger del contador existe y funciona
CREATE OR REPLACE FUNCTION public.sync_audio_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.audios SET likes = COALESCE(likes, 0) + 1 WHERE id::text = NEW.audio_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.audios SET likes = GREATEST(COALESCE(likes, 0) - 1, 0) WHERE id::text = OLD.audio_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_audio_likes ON public.audio_likes;
CREATE TRIGGER trg_sync_audio_likes
AFTER INSERT OR DELETE ON public.audio_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_audio_likes_count();

-- Recalcular los contadores existentes a partir de los likes reales
UPDATE public.audios a
SET likes = (SELECT count(*) FROM public.audio_likes l WHERE l.audio_id = a.id::text);
