-- Likes (Amén) y guardados persistentes por usuario.
-- audio_id es TEXT para soportar también los audios mock (ids no-UUID) durante la transición.

CREATE TABLE public.audio_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, audio_id)
);

CREATE TABLE public.audio_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, audio_id)
);

CREATE INDEX idx_audio_likes_audio ON public.audio_likes (audio_id);
CREATE INDEX idx_audio_saves_user ON public.audio_saves (user_id);

ALTER TABLE public.audio_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_saves ENABLE ROW LEVEL SECURITY;

-- Likes: lectura pública (para contadores), escritura solo del propio usuario
CREATE POLICY "Anyone can view likes" ON public.audio_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.audio_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.audio_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Guardados: privados de cada usuario
CREATE POLICY "Users can view own saves" ON public.audio_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save" ON public.audio_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave" ON public.audio_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Mantener el contador audios.likes sincronizado (solo afecta audios reales con id UUID)
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

CREATE TRIGGER trg_sync_audio_likes
AFTER INSERT OR DELETE ON public.audio_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_audio_likes_count();
