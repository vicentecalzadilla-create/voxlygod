CREATE TABLE public.audio_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '🙏',
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audio_comments_audio ON public.audio_comments (audio_id, created_at DESC);

ALTER TABLE public.audio_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.audio_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.audio_comments TO authenticated;
GRANT ALL ON public.audio_comments TO service_role;

CREATE POLICY "Anyone can view comments" ON public.audio_comments
  FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.audio_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.audio_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_audio_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.audios SET comments = COALESCE(comments, 0) + 1 WHERE id::text = NEW.audio_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.audios SET comments = GREATEST(COALESCE(comments, 0) - 1, 0) WHERE id::text = OLD.audio_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_audio_comments_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_audio_comments
AFTER INSERT OR DELETE ON public.audio_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_audio_comments_count();