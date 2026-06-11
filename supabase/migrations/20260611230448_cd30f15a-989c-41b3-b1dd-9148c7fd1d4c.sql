-- Seguir creadores: cada fila es "follower_id sigue a followed_id".
-- Privado de cada usuario, igual que likes y guardados.

CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

CREATE INDEX idx_user_follows_follower ON public.user_follows (follower_id);

GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows" ON public.user_follows
  FOR SELECT TO authenticated USING (auth.uid() = follower_id);
CREATE POLICY "Users can follow" ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);